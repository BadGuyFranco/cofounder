#!/usr/bin/env node

/**
 * Browser Control - MCP Server Launcher
 *
 * Starts the Playwright MCP server with persistent profile support.
 * Called by IDE MCP configurations (Cursor, Claude Code).
 *
 * Profile data is stored at ~/.browser-control/profiles/default/
 * so logins persist between sessions.
 */

import { spawn } from 'child_process';
import { homedir } from 'os';
import { join } from 'path';
import { mkdirSync } from 'fs';

const profileDir = join(homedir(), '.browser-control', 'profiles', 'default');
mkdirSync(profileDir, { recursive: true });

const args = [
  '@playwright/mcp',
  '--browser', 'chromium',
  '--user-data-dir', profileDir,
  '--caps', 'vision,pdf',
  ...process.argv.slice(2)
];

const child = spawn('npx', args, {
  stdio: 'inherit',
  shell: process.platform === 'win32'
});

child.on('exit', (code) => process.exit(code ?? 0));
child.on('error', (err) => {
  console.error(`Failed to start Playwright MCP: ${err.message}`);
  process.exit(1);
});
