#!/usr/bin/env node

/**
 * Browser Control - MCP Server Launcher
 *
 * Starts the Playwright MCP server with persistent profile support.
 * Called by IDE MCP configurations (Cursor, Claude Code).
 *
 * Profile data is stored at ~/.browser-control/profiles/<profile>/ so logins
 * persist between sessions. Profile defaults to `default`; set
 * BROWSER_CONTROL_PROFILE=autonomous to launch the hardened, prompt-suppressed
 * profile for unattended runs. The profile is hardened in place before launch
 * (see scripts/profile-hardening.js).
 *
 * File-access root (uploads / file:// guard):
 *   @playwright/mcp restricts file access (e.g. the file-upload tool) to its
 *   process cwd when the client advertises no workspace roots. Claude Code does
 *   not advertise the extra workspace dirs to this server, so without this it
 *   defaults to the cofounder repo only — which forced staging uploaded files
 *   INTO cofounder (a git repo) and risked committing personal docs.
 *   We therefore point cwd at the shared NAS root that contains every loaded
 *   workspace repo (cofounder, Anthony job-hunt, memory, WISER, etc.), so the
 *   upload tool can read packet files straight from their real location.
 *   This is a convenience guardrail, NOT a security boundary (per Playwright's
 *   docs); true isolation must come from client-level permissions.
 *   Override with BROWSER_CONTROL_FILE_ROOT if the layout ever changes.
 *
 * Output dir:
 *   Pinned to cofounder/.playwright-mcp (independent of cwd) so screenshots and
 *   snapshots keep landing where existing tooling expects. That directory is
 *   gitignored so MCP artifacts never get committed.
 */

import { spawn } from 'child_process';
import { join, dirname, resolve } from 'path';
import { fileURLToPath } from 'url';
import { mkdirSync } from 'fs';
import { resolveProfileDir, hardenProfile } from './scripts/profile-hardening.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
// tools/Browser Control -> tools -> cofounder
const cofounderRoot = resolve(__dirname, '..', '..');
// cofounder -> Shared -> NAS root (/Volumes/NAS LOCAL); contains all loaded repos
const fileRoot = process.env.BROWSER_CONTROL_FILE_ROOT || resolve(cofounderRoot, '..', '..');

// Profile selection: BROWSER_CONTROL_PROFILE=autonomous picks the hardened,
// prompt-suppressed profile for unattended runs. Defaults to `default` so
// existing login-heavy workflows keep their saved sessions.
const profileName = process.env.BROWSER_CONTROL_PROFILE || 'default';
const profileDir = resolveProfileDir(profileName);
mkdirSync(profileDir, { recursive: true });

// Suppress native Chrome prompts before @playwright/mcp launches the browser.
// Same hardening + resolution the CLI server path uses. Notification/permission
// suppression rides on the profile Preferences, so it applies even though we do
// not pass extra Chromium flags through the MCP launcher here.
hardenProfile(profileDir, { profileName });

const outputDir = join(cofounderRoot, '.playwright-mcp');
mkdirSync(outputDir, { recursive: true });

const args = [
  '@playwright/mcp',
  '--browser', 'chromium',
  '--user-data-dir', profileDir,
  '--output-dir', outputDir,
  '--caps', 'vision,pdf',
  // @playwright/mcp's file-upload guard allows only (a) --output-dir and (b) the MCP
  // CLIENT's first advertised root (Claude Code sends the cofounder project root), and it
  // IGNORES the child process cwd — so setting cwd to the NAS root above does NOT widen the
  // upload root for the server path (verified against @playwright/mcp 0.0.76, 2026-06-23).
  // This flag disables that guard so the upload tool can read packet PDFs directly from the
  // Anthony job-hunt tree. Playwright docs state the file-access root is a convenience
  // guardrail, not a security boundary; this runs in Anthony's own session on his own files.
  '--allow-unrestricted-file-access',
  ...process.argv.slice(2)
];

const child = spawn('npx', args, {
  stdio: 'inherit',
  cwd: fileRoot,
  shell: process.platform === 'win32'
});

child.on('exit', (code) => process.exit(code ?? 0));
child.on('error', (err) => {
  console.error(`Failed to start Playwright MCP: ${err.message}`);
  process.exit(1);
});
