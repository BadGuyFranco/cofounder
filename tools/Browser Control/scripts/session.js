#!/usr/bin/env node

/**
 * Browser Control - Session Management
 * 
 * Start, stop, and check status of the browser session.
 * 
 * Usage:
 *   node scripts/session.js start [--port <n>] [--profile <name>] [--headless]
 *   node scripts/session.js stop [--port <n>]
 *   node scripts/session.js status [--port <n>]
 *   node scripts/session.js restart [--port <n>] [--profile <name>]
 *   node scripts/session.js help
 */

import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';
import http from 'http';
import { parseArgs, getPort, isServerRunning, output, outputError, showHelp, PID_FILE, PROFILE_DIR } from './utils.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

function printHelp() {
  showHelp('Browser Control - Session Management', {
    'Usage': [
      'node scripts/session.js <command> [options]'
    ],
    'Commands': [
      'start       Start browser session (launches visible Chromium)',
      'stop        Stop browser session',
      'status      Check if session is running',
      'restart     Stop then start session',
      'help        Show this help'
    ],
    'Options': [
      '--port <n>       Server port (default: 9222)',
      '--profile <name> Named profile for separate sessions (default: default)',
      '--headless       Run browser without visible window'
    ],
    'Examples': [
      'node scripts/session.js start',
      'node scripts/session.js start --profile work',
      'node scripts/session.js stop',
      'node scripts/session.js status'
    ]
  });
}

/**
 * Start the browser server
 */
async function startSession(flags) {
  const port = getPort(flags);
  
  // Check if already running
  if (await isServerRunning(port)) {
    output({ 
      success: true, 
      status: 'already_running',
      message: `Session already running on port ${port}`,
      port 
    });
    return;
  }

  // Ensure profile directory exists
  const profileName = flags.profile || 'default';
  const profileDir = join(PROFILE_DIR, profileName);
  fs.mkdirSync(profileDir, { recursive: true });

  // Build server arguments
  const serverPath = join(__dirname, 'server.js');
  const serverArgs = ['--port', String(port), '--profile', profileName];
  if (flags.headless) serverArgs.push('--headless');

  // Start server as detached process
  const child = spawn('node', [serverPath, ...serverArgs], {
    detached: true,
    stdio: 'ignore'
  });

  child.unref();

  // Save PID for later
  const pidDir = dirname(PID_FILE);
  fs.mkdirSync(pidDir, { recursive: true });
  fs.writeFileSync(PID_FILE, JSON.stringify({ pid: child.pid, port }));

  // Wait for server to be ready
  let attempts = 0;
  const maxAttempts = 30;
  
  while (attempts < maxAttempts) {
    await new Promise(resolve => setTimeout(resolve, 500));
    if (await isServerRunning(port)) {
      output({ 
        success: true, 
        status: 'started',
        message: `Browser session started on port ${port}`,
        port,
        profile: profileName,
        pid: child.pid
      });
      return;
    }
    attempts++;
  }

  outputError('Timed out waiting for server to start');
}

/**
 * Stop the browser server
 */
async function stopSession(flags) {
  const port = getPort(flags);

  // Check if running
  if (!(await isServerRunning(port))) {
    output({ 
      success: true, 
      status: 'not_running',
      message: 'Session not running'
    });
    return;
  }

  // Send shutdown command
  return new Promise((resolve) => {
    const data = JSON.stringify({});
    const options = {
      hostname: 'localhost',
      port: port,
      path: '/shutdown',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data)
      },
      timeout: 5000
    };

    const req = http.request(options, (res) => {
      // Clean up PID file
      try {
        if (fs.existsSync(PID_FILE)) {
          fs.unlinkSync(PID_FILE);
        }
      } catch (e) {
        // Ignore cleanup errors
      }

      output({ 
        success: true, 
        status: 'stopped',
        message: 'Session stopped'
      });
      resolve();
    });

    req.on('error', (e) => {
      // Server might have already stopped
      output({ 
        success: true, 
        status: 'stopped',
        message: 'Session stopped'
      });
      resolve();
    });

    req.write(data);
    req.end();
  });
}

/**
 * Check session status
 */
async function checkStatus(flags) {
  const port = getPort(flags);
  const running = await isServerRunning(port);

  if (running) {
    // Get more info from server
    return new Promise((resolve) => {
      const options = {
        hostname: 'localhost',
        port: port,
        path: '/status',
        method: 'GET',
        timeout: 2000
      };

      const req = http.request(options, (res) => {
        let body = '';
        res.on('data', chunk => body += chunk);
        res.on('end', () => {
          try {
            const data = JSON.parse(body);
            output({
              success: true,
              status: 'running',
              port,
              url: data.url || null
            });
          } catch (e) {
            output({ success: true, status: 'running', port });
          }
          resolve();
        });
      });

      req.on('error', () => {
        output({ success: true, status: 'running', port });
        resolve();
      });

      req.end();
    });
  } else {
    output({ 
      success: true, 
      status: 'stopped',
      message: 'Session not running'
    });
  }
}

/**
 * Restart session
 */
async function restartSession(flags) {
  await stopSession(flags);
  await new Promise(resolve => setTimeout(resolve, 1000));
  await startSession(flags);
}

// Main
async function main() {
  const { command, flags } = parseArgs();

  try {
    switch (command) {
      case 'start':
        await startSession(flags);
        break;
      case 'stop':
        await stopSession(flags);
        break;
      case 'status':
        await checkStatus(flags);
        break;
      case 'restart':
        await restartSession(flags);
        break;
      case 'help':
        printHelp();
        break;
      default:
        console.error(`Unknown command: ${command}`);
        printHelp();
        process.exit(1);
    }
  } catch (error) {
    outputError(error);
  }
}

main();
