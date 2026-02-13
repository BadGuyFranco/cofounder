#!/usr/bin/env node

/**
 * check-setup.js - Verify Presentation Builder dependencies
 *
 * Usage:
 *   node scripts/check-setup.js           # Check what's installed
 *   node scripts/check-setup.js --install  # Auto-install missing dependencies
 */

import { existsSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __dirname = dirname(fileURLToPath(import.meta.url));
const toolDir = join(__dirname, '..');

const results = {
  node: { ok: false, detail: '' },
  revealjs: { ok: false, detail: '' },
  playwright: { ok: false, detail: '' }
};

const autoInstall = process.argv.includes('--install');

console.log('Presentation Builder Setup Check');
console.log('================================\n');

// Check Node.js version
try {
  const version = process.version;
  const major = parseInt(version.slice(1).split('.')[0], 10);
  if (major >= 18) {
    results.node = { ok: true, detail: `${version} (OK)` };
  } else {
    results.node = { ok: false, detail: `${version} (requires >= 18)` };
  }
} catch {
  results.node = { ok: false, detail: 'not found' };
}
console.log(`Node.js: ${results.node.detail}`);

// Check reveal.js vendor files in node_modules
const revealDistPath = join(toolDir, 'node_modules', 'reveal.js', 'dist', 'reveal.js');
if (existsSync(revealDistPath)) {
  results.revealjs = { ok: true, detail: 'installed (OK)' };
} else {
  results.revealjs = { ok: false, detail: 'not installed' };
  if (autoInstall) {
    console.log('reveal.js: installing...');
    try {
      execSync('npm install', {
        cwd: toolDir,
        stdio: 'inherit',
        shell: process.platform === 'win32'
      });
      results.revealjs = { ok: true, detail: 'installed (OK)' };
    } catch {
      results.revealjs = { ok: false, detail: 'installation failed' };
    }
  }
}
console.log(`reveal.js: ${results.revealjs.detail}`);

// Check Playwright browsers
try {
  const homeDir = process.env.HOME || process.env.USERPROFILE;
  const cacheLocations = [
    join(homeDir, 'Library', 'Caches', 'ms-playwright'),  // macOS
    join(homeDir, '.cache', 'ms-playwright'),               // Linux
    join(homeDir, 'AppData', 'Local', 'ms-playwright')      // Windows
  ];

  const hasBrowsers = cacheLocations.some(loc => {
    if (!existsSync(loc)) return false;
    try {
      const entries = execSync(`ls "${loc}" 2>/dev/null`, { encoding: 'utf8', shell: true });
      return entries.includes('chromium');
    } catch {
      return false;
    }
  });

  if (hasBrowsers) {
    results.playwright = { ok: true, detail: 'chromium available (OK)' };
  } else {
    results.playwright = { ok: false, detail: 'chromium not found' };
    if (autoInstall) {
      console.log('Playwright: installing chromium...');
      try {
        execSync('npx playwright install chromium', {
          cwd: toolDir,
          stdio: 'inherit',
          shell: process.platform === 'win32'
        });
        results.playwright = { ok: true, detail: 'chromium installed (OK)' };
      } catch {
        results.playwright = { ok: false, detail: 'chromium installation failed' };
      }
    }
  }
} catch {
  results.playwright = { ok: false, detail: 'check failed' };
}
console.log(`Playwright: ${results.playwright.detail}`);

// Summary
console.log('');
const allOk = Object.values(results).every(r => r.ok);
if (allOk) {
  console.log('All dependencies satisfied. Ready to create presentations.');
} else {
  const missing = Object.entries(results)
    .filter(([, r]) => !r.ok)
    .map(([name]) => name);
  console.log(`Missing: ${missing.join(', ')}`);
  if (!autoInstall) {
    console.log('Run with --install to auto-install missing dependencies.');
  }
  process.exit(1);
}
