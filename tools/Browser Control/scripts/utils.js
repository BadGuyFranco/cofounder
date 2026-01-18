/**
 * Browser Control - Shared Utilities
 * 
 * Provides common functions for all browser control scripts:
 * - Server communication
 * - Argument parsing
 * - Output formatting
 * - Path resolution
 */

import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import os from 'os';
import http from 'http';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Configuration
export const DEFAULT_PORT = 9222;
export const PROFILE_DIR = join(os.homedir(), '.browser-control', 'profiles');
export const PID_FILE = join(os.homedir(), '.browser-control', 'server.pid');

/**
 * Parse command line arguments
 * @returns {object} { command, args, flags }
 */
export function parseArgs() {
  const args = process.argv.slice(2);
  const flags = {};
  const positional = [];

  // If first arg starts with --, there's no command (use 'run' as default)
  let startIdx = 0;
  let command = args.length === 0 ? 'help' : 'run';
  
  if (args.length > 0 && !args[0].startsWith('--')) {
    command = args[0];
    startIdx = 1;
  }

  for (let i = startIdx; i < args.length; i++) {
    if (args[i].startsWith('--')) {
      const key = args[i].slice(2);
      const value = args[i + 1] && !args[i + 1].startsWith('--') ? args[++i] : true;
      flags[key] = value;
    } else {
      positional.push(args[i]);
    }
  }

  return { command, args: positional, flags };
}

/**
 * Output success result as JSON
 * @param {object} data - Data to output
 */
export function output(data) {
  console.log(JSON.stringify(data, null, 2));
}

/**
 * Output error and exit
 * @param {string|Error} error - Error message or Error object
 */
export function outputError(error) {
  const message = error instanceof Error ? error.message : error;
  console.error(`Error: ${message}`);
  process.exit(1);
}

/**
 * Get server port from flags or environment
 * @param {object} flags - Parsed flags
 * @returns {number} Port number
 */
export function getPort(flags) {
  if (flags.port) return parseInt(flags.port, 10);
  if (process.env.BROWSER_CONTROL_PORT) return parseInt(process.env.BROWSER_CONTROL_PORT, 10);
  return DEFAULT_PORT;
}

/**
 * Get profile directory
 * @param {string} profileName - Profile name (default: 'default')
 * @returns {string} Path to profile directory
 */
export function getProfileDir(profileName = 'default') {
  return join(PROFILE_DIR, profileName);
}

/**
 * Send command to browser server
 * @param {string} action - Action to perform
 * @param {object} params - Action parameters
 * @param {number} port - Server port
 * @returns {Promise<object>} Server response
 */
export async function sendCommand(action, params = {}, port = DEFAULT_PORT) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify({ action, params });
    
    const options = {
      hostname: 'localhost',
      port: port,
      path: '/command',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data)
      },
      timeout: 30000
    };

    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          const result = JSON.parse(body);
          if (result.success) {
            resolve(result);
          } else {
            reject(new Error(result.error || 'Unknown server error'));
          }
        } catch (e) {
          reject(new Error(`Invalid server response: ${body}`));
        }
      });
    });

    req.on('error', (e) => {
      if (e.code === 'ECONNREFUSED') {
        reject(new Error('Browser session not running. Start with: node scripts/session.js start'));
      } else {
        reject(e);
      }
    });

    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Request timed out'));
    });

    req.write(data);
    req.end();
  });
}

/**
 * Check if server is running
 * @param {number} port - Server port
 * @returns {Promise<boolean>} True if server is running
 */
export async function isServerRunning(port = DEFAULT_PORT) {
  return new Promise((resolve) => {
    const options = {
      hostname: 'localhost',
      port: port,
      path: '/status',
      method: 'GET',
      timeout: 2000
    };

    const req = http.request(options, (res) => {
      resolve(res.statusCode === 200);
    });

    req.on('error', () => resolve(false));
    req.on('timeout', () => {
      req.destroy();
      resolve(false);
    });

    req.end();
  });
}

/**
 * Display help text
 * @param {string} title - Script title
 * @param {object} sections - Help sections { 'Section Name': ['line1', 'line2'] }
 */
export function showHelp(title, sections) {
  console.log(`\n${title}\n`);
  for (const [section, lines] of Object.entries(sections)) {
    console.log(`${section}:`);
    for (const line of lines) {
      console.log(`  ${line}`);
    }
    console.log('');
  }
}
