/**
 * Shared CLI utilities for tool scripts.
 *
 * Keeps argument parsing and error/output handling consistent.
 */

import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { join, dirname, relative, sep } from 'path';
import { fileURLToPath } from 'url';
import { platform, release, arch } from 'os';

/**
 * Parse command-line args into positional + flags.
 * Supports:
 * - --key value
 * - --boolean-flag
 * - short boolean flags like -h
 */
export function parseCliArgs(args = process.argv.slice(2)) {
  const positional = [];
  const flags = {};

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    if (arg.startsWith('--')) {
      const key = arg.slice(2);
      const next = args[i + 1];
      if (next && !next.startsWith('-')) {
        flags[key] = next;
        i++;
      } else {
        flags[key] = true;
      }
      continue;
    }

    if (arg.startsWith('-') && arg.length === 2) {
      flags[arg.slice(1)] = true;
      continue;
    }

    positional.push(arg);
  }

  return { positional, flags };
}

export function hasHelpFlag(flags = {}) {
  return Boolean(flags.help || flags.h);
}

export function output(data, { json = false, formatter } = {}) {
  if (json) {
    console.log(JSON.stringify(data, null, 2));
    return;
  }

  if (formatter) {
    formatter(data);
    return;
  }

  if (data !== undefined) {
    console.log(data);
  }
}

export function outputError(error, { exitCode = 1 } = {}) {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`Error: ${message}`);
  captureErrorArtifact(error, message);
  process.exit(exitCode);
}

/**
 * Write a structured error artifact for /cofounder/ script failures.
 * Only captures when the failing script lives under /cofounder/.
 * Artifacts land in /memory/bug-reports/pending/ for optional Zoho submission.
 * Zero overhead during normal operation; only runs on error paths.
 */
function captureErrorArtifact(error, message) {
  try {
    const scriptPath = process.argv[1] || '';

    // Only capture for cofounder-owned scripts.
    // Detect cofounder root: this file is at <cofounder>/system/shared/cli-utils.js
    const thisFile = fileURLToPath(import.meta.url);
    const cofounderRoot = join(dirname(thisFile), '..', '..');
    const memoryRoot = join(cofounderRoot, '..', 'memory');

    // Resolve to real path segments for comparison
    const normalizedScript = scriptPath.split(sep).join('/');
    const normalizedCofounder = cofounderRoot.split(sep).join('/');

    if (!normalizedScript.includes(normalizedCofounder.split('/').pop() + '/')) {
      // Script is not under cofounder tree; skip capture.
      return;
    }

    // Determine relative path of the failing script within cofounder
    let relativeScript = 'unknown';
    try {
      relativeScript = relative(cofounderRoot, scriptPath).split(sep).join('/');
    } catch { /* keep unknown */ }

    // Determine component: e.g. "tools/Image Generator" or "connectors/zoho"
    const parts = relativeScript.split('/');
    let component = relativeScript;
    if (parts.length >= 2) {
      component = parts.slice(0, 2).join('/');
    }

    const artifact = {
      timestamp: new Date().toISOString(),
      component,
      script: relativeScript,
      error: message,
      stack: error instanceof Error ? (error.stack || '').split('\n').slice(0, 10) : [],
      command: sanitizeArgs(process.argv.slice(2)),
      environment: {
        platform: platform(),
        release: release(),
        arch: arch(),
        nodeVersion: process.version
      }
    };

    const pendingDir = join(memoryRoot, 'bug-reports', 'pending');
    if (!existsSync(pendingDir)) {
      mkdirSync(pendingDir, { recursive: true });
    }

    const filename = `${Date.now()}-${component.replace(/[\s/\\]/g, '-')}.json`;
    writeFileSync(join(pendingDir, filename), JSON.stringify(artifact, null, 2));
  } catch {
    // Never let artifact capture interfere with the real error flow.
  }
}

/**
 * Strip values that look like secrets from CLI arguments.
 */
function sanitizeArgs(args) {
  const sensitivePatterns = /^(token|key|secret|password|api[_-]?key|access[_-]?token|refresh[_-]?token|client[_-]?secret)$/i;
  const sanitized = [];
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg.startsWith('--')) {
      const key = arg.slice(2);
      sanitized.push(arg);
      if (sensitivePatterns.test(key) && i + 1 < args.length) {
        sanitized.push('[REDACTED]');
        i++;
      }
    } else {
      sanitized.push(arg);
    }
  }
  return sanitized;
}

export function requireFlag(flags, name, context = null) {
  if (!flags[name]) {
    throw new Error(`--${name} is required${context ? ` for ${context}` : ''}`);
  }
}
