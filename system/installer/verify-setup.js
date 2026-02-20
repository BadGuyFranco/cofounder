#!/usr/bin/env node

/**
 * CoFounder setup verifier (read-only).
 *
 * This script performs non-destructive environment checks.
 * It does not create, modify, or delete files.
 *
 * Usage:
 *   node system/installer/verify-setup.js
 */

import { existsSync } from 'fs';
import { dirname, join, resolve } from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __dirname = dirname(fileURLToPath(import.meta.url));
const cofounderRoot = resolve(__dirname, '..', '..');
const parentDir = resolve(cofounderRoot, '..');
const memoryDir = join(parentDir, 'memory');
const workspacesDir = join(parentDir, 'workspaces');

function getCommandOutput(command) {
  try {
    return execSync(command, {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore']
    }).trim();
  } catch {
    return null;
  }
}

function parseNodeMajor(nodeVersionRaw) {
  if (!nodeVersionRaw) return null;
  const normalized = nodeVersionRaw.startsWith('v') ? nodeVersionRaw.slice(1) : nodeVersionRaw;
  const major = Number.parseInt(normalized.split('.')[0], 10);
  return Number.isNaN(major) ? null : major;
}

function detectIdeFromEnv() {
  const keys = Object.keys(process.env).map(k => k.toLowerCase());
  if (keys.some(k => k.includes('cursor'))) return 'cursor';
  if (keys.some(k => k.includes('windsurf'))) return 'windsurf';
  if (keys.some(k => k.includes('antigravity'))) return 'antigravity';
  return 'unknown';
}

function detectIdeFromBundleIdentifier() {
  const bundleId = process.env.__CFBundleIdentifier || '';
  const id = bundleId.toLowerCase();
  if (id.includes('cursor')) return 'cursor';
  if (id.includes('windsurf')) return 'windsurf';
  if (id.includes('antigravity') || id.includes('gemini')) return 'antigravity';
  return 'unknown';
}

function checkWindowsGitBash() {
  if (process.platform !== 'win32') return { status: 'skip', detail: 'Not Windows' };

  const gitVersion = getCommandOutput('git --version');
  if (!gitVersion) {
    return { status: 'warn', detail: 'git not found in PATH' };
  }

  const bashVersion = getCommandOutput('bash --version');
  if (!bashVersion) {
    return { status: 'warn', detail: 'bash not found in PATH (Git Bash may not be available)' };
  }

  return { status: 'ok', detail: `${gitVersion}; bash available` };
}

function checkDirectory(path, label) {
  if (existsSync(path)) {
    return { status: 'ok', detail: `${label} exists at ${path}` };
  }
  return { status: 'warn', detail: `${label} missing at ${path}` };
}

function printResult(name, status, detail) {
  const icon = status === 'ok' ? 'PASS' : status === 'warn' ? 'WARN' : 'SKIP';
  console.log(`[${icon}] ${name}: ${detail}`);
}

function main() {
  console.log('CoFounder Setup Verification');
  console.log('');

  const nodeVersion = process.version || getCommandOutput('node --version');
  const nodeMajor = parseNodeMajor(nodeVersion);
  const npmVersion = getCommandOutput('npm --version');

  const nodeStatus = nodeMajor !== null && nodeMajor >= 18 ? 'ok' : 'warn';
  const nodeDetail = nodeVersion
    ? `${nodeVersion} (${nodeMajor >= 18 ? 'supported' : 'requires >= 18'})`
    : 'node not found';
  printResult('Node.js', nodeStatus, nodeDetail);

  printResult('npm', npmVersion ? 'ok' : 'warn', npmVersion ? `v${npmVersion}` : 'npm not found');

  const ideEnv = detectIdeFromEnv();
  const ideBundle = detectIdeFromBundleIdentifier();
  const ide = ideEnv !== 'unknown' ? ideEnv : ideBundle;
  printResult(
    'IDE detection',
    ide === 'unknown' ? 'warn' : 'ok',
    `env=${ideEnv}, bundle=${ideBundle}, selected=${ide}`
  );

  const cofounderCheck = checkDirectory(cofounderRoot, 'cofounder root');
  printResult('Workspace root', cofounderCheck.status, cofounderCheck.detail);

  const memoryCheck = checkDirectory(memoryDir, 'memory directory');
  printResult('Memory directory', memoryCheck.status, memoryCheck.detail);

  const workspacesCheck = checkDirectory(workspacesDir, 'workspaces directory');
  printResult('Workspaces directory', workspacesCheck.status, workspacesCheck.detail);

  const windowsGitBash = checkWindowsGitBash();
  printResult('Windows Git Bash check', windowsGitBash.status, windowsGitBash.detail);

  const suggestedFollowUps = [];
  if (nodeStatus !== 'ok') suggestedFollowUps.push('Install/upgrade Node.js to v18+.');
  if (!npmVersion) suggestedFollowUps.push('Ensure npm is available in PATH.');
  if (memoryCheck.status !== 'ok') suggestedFollowUps.push('Run Continue Install Step 1 and Step 3 to initialize memory.');
  if (workspacesCheck.status !== 'ok') suggestedFollowUps.push('Run Continue Install Step 1 and Step 5 to initialize workspaces.');
  if (process.platform === 'win32' && windowsGitBash.status !== 'ok') {
    suggestedFollowUps.push('Install Git for Windows and ensure Git Bash is available.');
  }

  console.log('');
  if (suggestedFollowUps.length === 0) {
    console.log('Summary: environment checks look good.');
    process.exit(0);
  }

  console.log('Suggested follow-ups:');
  for (const item of suggestedFollowUps) {
    console.log(`- ${item}`);
  }
  process.exit(1);
}

main();
