/**
 * Browser Control - Profile Hardening
 *
 * Prepares a Chromium persistent profile so native browser UI prompts stop
 * blocking autonomous automation. This is shared by BOTH launch paths:
 *   - CLI:  scripts/server.js  -> chromium.launchPersistentContext()
 *   - MCP:  start-mcp.js        -> npx @playwright/mcp --user-data-dir ...
 *
 * IMPORTANT distinction:
 *   - JavaScript page dialogs (alert/confirm/prompt) are handled at runtime by
 *     scripts/dialog.js. This module does NOT touch those.
 *   - This module suppresses *native* Chromium chrome: password-save bubbles,
 *     autofill prompts, translate bars, notification/permission prompts,
 *     download bubbles, "restore session" nags, first-run/welcome screens.
 *
 * It does so by safely editing the profile's `Preferences` (per sub-profile)
 * and `Local State` JSON files before launch. It is conservative:
 *   - Never deletes a profile.
 *   - Preserves cookies/localStorage/logins (those live in separate files; we
 *     deep-merge only the specific preference keys we own).
 *   - Backs up Preferences / Local State (timestamped) before writing.
 *   - Skips writing if the profile is currently locked (Chrome running).
 *   - Idempotent: re-running writes the same values; JSON stays valid.
 *
 * What it CANNOT do (document, do not pretend otherwise):
 *   - Eliminate macOS/OS security prompts (keychain, screen-recording, file
 *     picker), CAPTCHAs, or 2FA. Those are outside the browser preference
 *     surface and may still require a human.
 */

import fs from 'fs';
import os from 'os';
import { join } from 'path';

// Same root the CLI utils.js uses, kept in sync intentionally so both launch
// paths resolve identical directories.
export const PROFILE_ROOT = join(os.homedir(), '.browser-control', 'profiles');

/**
 * Resolve a profile name to its on-disk directory.
 * Mirrors utils.getProfileDir so CLI + MCP share one resolution rule.
 */
export function resolveProfileDir(profileName = 'default') {
  return join(PROFILE_ROOT, profileName || 'default');
}

/** Profiles whose name signals unattended use get the stricter preset. */
export function isAutonomousProfile(profileName) {
  return profileName === 'autonomous';
}

/**
 * Extra Chromium launch args for a given profile.
 *
 * Only flags that are (a) NOT already in Playwright's defaults and (b) safe.
 * Verified against playwright-core chromiumSwitches.js (Playwright 1.58):
 * Playwright already passes --no-first-run, --no-default-browser-check,
 * --password-store=basic, --use-mock-keychain, --disable-search-engine-choice-screen,
 * --disable-popup-blocking, --disable-prompt-on-repost, --disable-default-apps,
 * --disable-features=...,Translate,...  -- so we do NOT duplicate those.
 *
 * NOTE: we deliberately do NOT add a second --disable-features flag. Chromium's
 * command line keeps the LAST occurrence of a repeated switch, so adding our own
 * would CLOBBER Playwright's curated list. Notification/permission suppression is
 * handled via Preferences instead (default_content_setting_values), which works
 * for both CLI and MCP without touching the feature list.
 *
 * --disable-notifications is a standalone switch (not in Playwright defaults) and
 * is only enabled for the autonomous profile so interactive profiles keep normal
 * web behavior.
 */
export function launchArgsForProfile(profileName) {
  const args = [];
  if (isAutonomousProfile(profileName)) {
    args.push('--disable-notifications');
  }
  return args;
}

// ---------------------------------------------------------------------------
// Preference presets
// ---------------------------------------------------------------------------
// Content setting values: 1 = allow, 2 = block.

// Applied to EVERY profile. Suppresses prompts without removing capabilities or
// logins. Safe for login-heavy interactive use.
function standardPreferences() {
  return {
    credentials_enable_service: false,        // no "Save password?" bubble
    credentials_enable_autosignin: false,
    profile: {
      password_manager_enabled: false,
      exit_type: 'Normal',                    // suppress "restore session" nag
      default_content_setting_values: {
        notifications: 2                       // auto-deny notification prompts
      }
    },
    autofill: {
      enabled: false,
      profile_enabled: false,                 // no address autofill prompts
      credit_card_enabled: false              // no card autofill prompts
    },
    payments: {
      can_make_payment_enabled: false
    },
    translate: { enabled: false },            // no translate bar
    download: {
      prompt_for_download: false,             // no "where to save?" prompt
      directory_upgrade: true
    },
    browser: {
      has_seen_welcome_page: true,
      check_default_browser: false
    }
  };
}

// Autonomous superset: also blocks geolocation/camera/mic by default so a page
// requesting them silently fails instead of stalling on a native permission
// prompt. Automation can still grant these explicitly at the context level.
function autonomousPreferences() {
  const base = standardPreferences();
  base.profile.default_content_setting_values = {
    ...base.profile.default_content_setting_values,
    geolocation: 2,
    media_stream_mic: 2,
    media_stream_camera: 2
  };
  // Don't restore the previous session on startup (5 = open New Tab Page).
  base.session = { restore_on_startup: 5 };
  return base;
}

// Local State (browser-wide, not per sub-profile). Belt-and-suspenders for the
// default-browser infobar; Playwright also passes --no-default-browser-check.
function localStateHardening() {
  return {
    browser: {
      check_default_browser: false,
      default_browser_setting_enabled: false
    }
  };
}

// ---------------------------------------------------------------------------
// Internals
// ---------------------------------------------------------------------------

/** Deep-merge `patch` into `target`, overwriting only the keys patch defines. */
function deepMerge(target, patch) {
  const out = target && typeof target === 'object' && !Array.isArray(target) ? target : {};
  for (const [key, value] of Object.entries(patch)) {
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      out[key] = deepMerge(out[key], value);
    } else {
      out[key] = value;
    }
  }
  return out;
}

function timestamp() {
  // ISO-ish, filename-safe. Date is available in normal Node (not the workflow sandbox).
  return new Date().toISOString().replace(/[:.]/g, '-');
}

/**
 * True if the profile appears to be in active use by a running Chrome.
 * SingletonLock/SingletonSocket are symlinks whose targets do NOT exist as
 * files, so existsSync() (which follows symlinks) returns false — must lstat.
 */
export function isProfileLocked(profileDir) {
  for (const name of ['SingletonLock', 'SingletonSocket']) {
    try {
      fs.lstatSync(join(profileDir, name));
      return true;
    } catch {
      // not present
    }
  }
  return false;
}

/** Read a JSON file, returning {} if missing/empty and null if unparseable. */
function readJsonSafe(filePath) {
  if (!fs.existsSync(filePath)) return {};
  const raw = fs.readFileSync(filePath, 'utf8');
  if (!raw.trim()) return {};
  try {
    return JSON.parse(raw);
  } catch {
    return null; // corrupt / mid-write — caller must skip to avoid clobbering
  }
}

/** Backup then deep-merge `patch` into the JSON file at filePath. */
function patchJsonFile(filePath, patch, warnings) {
  const existing = readJsonSafe(filePath);
  if (existing === null) {
    warnings.push(`Skipped ${filePath}: existing file is not valid JSON (left untouched).`);
    return false;
  }
  if (fs.existsSync(filePath)) {
    fs.copyFileSync(filePath, `${filePath}.bak-${timestamp()}`);
  }
  const merged = deepMerge(existing, patch);
  fs.mkdirSync(join(filePath, '..'), { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(merged));
  return true;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Harden a persistent profile before launch.
 *
 * @param {string} profileDir  Absolute path to the user-data-dir.
 * @param {object} [opts]
 * @param {string} [opts.profileName]  Used to pick standard vs autonomous preset.
 * @param {boolean} [opts.quiet]       Suppress console warnings.
 * @returns {{hardened: boolean, reason?: string, subProfiles: string[], warnings: string[]}}
 */
export function hardenProfile(profileDir, opts = {}) {
  const { profileName = 'default', quiet = false } = opts;
  const warnings = [];

  // 1. Ensure the profile dir exists (safe to create; never deletes).
  fs.mkdirSync(profileDir, { recursive: true });

  // 2. Never touch a profile that another Chrome is actively using.
  if (isProfileLocked(profileDir)) {
    const reason = 'profile is locked (Chrome appears to be running); skipped preference hardening';
    warnings.push(reason);
    if (!quiet) console.warn(`[profile-hardening] ${profileDir}: ${reason}`);
    return { hardened: false, reason, subProfiles: [], warnings };
  }

  const prefs = isAutonomousProfile(profileName) ? autonomousPreferences() : standardPreferences();

  // 3. Apply to sub-profiles: always "Default"; "Profile 1" only if it already
  //    exists (don't conjure a profile Chrome didn't create).
  const subProfiles = ['Default'];
  if (fs.existsSync(join(profileDir, 'Profile 1'))) subProfiles.push('Profile 1');

  for (const sub of subProfiles) {
    const subDir = join(profileDir, sub);
    fs.mkdirSync(subDir, { recursive: true });
    patchJsonFile(join(subDir, 'Preferences'), prefs, warnings);
  }

  // 4. Browser-wide Local State.
  patchJsonFile(join(profileDir, 'Local State'), localStateHardening(), warnings);

  if (!quiet && warnings.length) {
    for (const w of warnings) console.warn(`[profile-hardening] ${w}`);
  }

  return { hardened: true, subProfiles, warnings };
}
