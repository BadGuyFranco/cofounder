#!/usr/bin/env node

/**
 * Browser Control - Profile Hardening self-test
 *
 * Script-level verification (no real browser needed):
 *   1. Create a temp fake profile.
 *   2. Run hardening; assert expected preference keys are written.
 *   3. Run hardening again; assert prefs remain valid JSON and values persist.
 *   4. Assert pre-existing keys (cookies-style/login markers) are preserved.
 *   5. Assert a locked profile is skipped (not corrupted).
 *
 * Usage: node scripts/test-profile-hardening.js
 * Exit 0 = all pass, 1 = a check failed.
 */

import fs from 'fs';
import os from 'os';
import { join } from 'path';
import { hardenProfile, isProfileLocked } from './profile-hardening.js';

let failures = 0;
function check(name, cond) {
  if (cond) {
    console.log(`  ok   - ${name}`);
  } else {
    console.error(`  FAIL - ${name}`);
    failures++;
  }
}

function readPrefs(profileDir, sub = 'Default') {
  return JSON.parse(fs.readFileSync(join(profileDir, sub, 'Preferences'), 'utf8'));
}

const tmpRoot = fs.mkdtempSync(join(os.tmpdir(), 'bc-harden-test-'));
try {
  // ---- autonomous profile, with a pre-existing login marker to protect ----
  const profileDir = join(tmpRoot, 'autonomous');
  fs.mkdirSync(join(profileDir, 'Default'), { recursive: true });
  // Simulate an existing logged-in profile: a custom key the user "owns".
  fs.writeFileSync(
    join(profileDir, 'Default', 'Preferences'),
    JSON.stringify({ sync: { keystore_keys: ['LOGIN-TOKEN'] }, profile: { name: 'me' } })
  );

  console.log('1) First hardening run (autonomous):');
  const r1 = hardenProfile(profileDir, { profileName: 'autonomous', quiet: true });
  check('reports hardened', r1.hardened === true);
  let prefs = readPrefs(profileDir);
  check('password save disabled', prefs.credentials_enable_service === false);
  check('autofill profile disabled', prefs.autofill.profile_enabled === false);
  check('translate disabled', prefs.translate.enabled === false);
  check('download prompt disabled', prefs.download.prompt_for_download === false);
  check('notifications blocked', prefs.profile.default_content_setting_values.notifications === 2);
  check('geolocation blocked (autonomous)', prefs.profile.default_content_setting_values.geolocation === 2);
  check('camera blocked (autonomous)', prefs.profile.default_content_setting_values.media_stream_camera === 2);
  check('session restore neutralized', prefs.session.restore_on_startup === 5);
  check('exit_type set Normal', prefs.profile.exit_type === 'Normal');
  check('PRESERVED pre-existing login marker', prefs.sync.keystore_keys[0] === 'LOGIN-TOKEN');
  check('PRESERVED unrelated profile.name', prefs.profile.name === 'me');
  check('Local State written', fs.existsSync(join(profileDir, 'Local State')));
  check('backup of Preferences created', fs.readdirSync(join(profileDir, 'Default')).some(f => f.startsWith('Preferences.bak-')));

  console.log('2) Second hardening run (idempotency):');
  const r2 = hardenProfile(profileDir, { profileName: 'autonomous', quiet: true });
  check('reports hardened again', r2.hardened === true);
  prefs = readPrefs(profileDir); // throws if not valid JSON
  check('prefs still valid JSON + values persist', prefs.credentials_enable_service === false && prefs.profile.default_content_setting_values.notifications === 2);
  check('login marker STILL preserved', prefs.sync.keystore_keys[0] === 'LOGIN-TOKEN');

  // ---- standard profile: no geolocation/camera blocking ----
  console.log('3) Standard (default) profile preset:');
  const stdDir = join(tmpRoot, 'default');
  const rs = hardenProfile(stdDir, { profileName: 'default', quiet: true });
  check('standard hardened', rs.hardened === true);
  const sp = readPrefs(stdDir);
  check('standard blocks notifications', sp.profile.default_content_setting_values.notifications === 2);
  check('standard does NOT block geolocation', sp.profile.default_content_setting_values.geolocation === undefined);
  check('standard has no forced session restore override', sp.session === undefined);

  // ---- Profile 1 handled if present, not conjured if absent ----
  console.log('4) Profile 1 handling:');
  check('Profile 1 NOT created when absent', !fs.existsSync(join(stdDir, 'Profile 1')));
  const multiDir = join(tmpRoot, 'multi');
  fs.mkdirSync(join(multiDir, 'Profile 1'), { recursive: true });
  fs.writeFileSync(join(multiDir, 'Profile 1', 'Preferences'), JSON.stringify({ keep: 1 }));
  const rm = hardenProfile(multiDir, { profileName: 'autonomous', quiet: true });
  check('Profile 1 included when present', rm.subProfiles.includes('Profile 1'));
  const p1 = readPrefs(multiDir, 'Profile 1');
  check('Profile 1 hardened', p1.credentials_enable_service === false);
  check('Profile 1 pre-existing key preserved', p1.keep === 1);

  // ---- locked profile is skipped, not corrupted ----
  console.log('5) Locked profile safety:');
  const lockedDir = join(tmpRoot, 'locked');
  fs.mkdirSync(join(lockedDir, 'Default'), { recursive: true });
  const sentinel = JSON.stringify({ untouched: true });
  fs.writeFileSync(join(lockedDir, 'Default', 'Preferences'), sentinel);
  fs.symlinkSync('somehost-12345', join(lockedDir, 'SingletonLock')); // dangling symlink, like real Chrome
  check('lock detected', isProfileLocked(lockedDir) === true);
  const rl = hardenProfile(lockedDir, { profileName: 'autonomous', quiet: true });
  check('locked profile skipped', rl.hardened === false);
  check('locked profile Preferences untouched', fs.readFileSync(join(lockedDir, 'Default', 'Preferences'), 'utf8') === sentinel);

  // ---- corrupt Preferences is left untouched, not clobbered ----
  console.log('6) Corrupt Preferences safety:');
  const corruptDir = join(tmpRoot, 'corrupt');
  fs.mkdirSync(join(corruptDir, 'Default'), { recursive: true });
  fs.writeFileSync(join(corruptDir, 'Default', 'Preferences'), '{not valid json');
  const rc = hardenProfile(corruptDir, { profileName: 'autonomous', quiet: true });
  check('corrupt file left untouched', fs.readFileSync(join(corruptDir, 'Default', 'Preferences'), 'utf8') === '{not valid json');
  check('corrupt skip recorded in warnings', rc.warnings.some(w => /not valid JSON/.test(w)));
} finally {
  fs.rmSync(tmpRoot, { recursive: true, force: true });
}

console.log(failures === 0 ? '\nALL CHECKS PASSED' : `\n${failures} CHECK(S) FAILED`);
process.exit(failures === 0 ? 0 : 1);
