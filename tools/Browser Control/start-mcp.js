#!/usr/bin/env node

/**
 * Browser Control - MCP Server Launcher
 *
 * Starts the Playwright MCP server with persistent profile support.
 * Called by IDE MCP configurations (Cursor, Claude Code).
 *
 * Profile data is stored at ~/.browser-control/profiles/default/
 * so logins persist between sessions.
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
import { homedir } from 'os';
import { join, dirname, resolve } from 'path';
import { fileURLToPath } from 'url';
import { mkdirSync } from 'fs';

const __dirname = dirname(fileURLToPath(import.meta.url));
// tools/Browser Control -> tools -> cofounder
const cofounderRoot = resolve(__dirname, '..', '..');
// cofounder -> Shared -> NAS root (/Volumes/NAS LOCAL); contains all loaded repos
const fileRoot = process.env.BROWSER_CONTROL_FILE_ROOT || resolve(cofounderRoot, '..', '..');

const profileDir = join(homedir(), '.browser-control', 'profiles', 'default');
mkdirSync(profileDir, { recursive: true });

const outputDir = join(cofounderRoot, '.playwright-mcp');
mkdirSync(outputDir, { recursive: true });

const args = [
  '@playwright/mcp',
  '--browser', 'chromium',
  '--user-data-dir', profileDir,
  '--output-dir', outputDir,
  '--caps', 'vision,pdf',
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
