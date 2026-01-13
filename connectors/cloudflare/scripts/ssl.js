#!/usr/bin/env node
/**
 * Cloudflare SSL Script
 * Manage SSL/TLS settings for your zones.
 */

import { parseArgs, apiRequest, resolveZoneId, output, outputError } from './utils.js';

function showHelp() {
  console.log(`
SSL Script - Manage Cloudflare SSL/TLS settings

Usage: node scripts/ssl.js <command> [options]

Commands:
  get <zone>              Get SSL/TLS mode for a zone
  set <zone> <mode>       Set SSL/TLS mode
  status <zone>           Get SSL certificate status
  help                    Show this help

SSL Modes:
  off                     No encryption (not recommended)
  flexible                Encrypts browser-to-Cloudflare only
  full                    Encrypts end-to-end (self-signed cert OK)
  strict                  Encrypts end-to-end (valid cert required)

Examples:
  node scripts/ssl.js get example.com
  node scripts/ssl.js set example.com strict
  node scripts/ssl.js status example.com
`);
}

async function getSSLMode(zoneIdentifier) {
  const zoneId = await resolveZoneId(zoneIdentifier);
  const data = await apiRequest(`/zones/${zoneId}/settings/ssl`);
  output(data.result);
}

async function setSSLMode(zoneIdentifier, mode) {
  const validModes = ['off', 'flexible', 'full', 'strict'];
  if (!validModes.includes(mode)) {
    throw new Error(`Invalid SSL mode: ${mode}. Valid modes: ${validModes.join(', ')}`);
  }

  const zoneId = await resolveZoneId(zoneIdentifier);
  const data = await apiRequest(`/zones/${zoneId}/settings/ssl`, {
    method: 'PATCH',
    body: { value: mode }
  });

  console.log(`SSL mode set to: ${mode}`);
  output(data.result);
}

async function getSSLStatus(zoneIdentifier) {
  const zoneId = await resolveZoneId(zoneIdentifier);
  
  // Get certificate packs
  const data = await apiRequest(`/zones/${zoneId}/ssl/certificate_packs`);
  output(data.result);
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const command = args._[0] || 'help';

  if (command === 'help') {
    showHelp();
    return;
  }

  try {
    switch (command) {
      case 'get':
        if (!args._[1]) {
          throw new Error('Zone ID or domain name required. Usage: get <zone>');
        }
        await getSSLMode(args._[1]);
        break;

      case 'set':
        if (!args._[1] || !args._[2]) {
          throw new Error('Zone and mode required. Usage: set <zone> <mode>');
        }
        await setSSLMode(args._[1], args._[2]);
        break;

      case 'status':
        if (!args._[1]) {
          throw new Error('Zone ID or domain name required. Usage: status <zone>');
        }
        await getSSLStatus(args._[1]);
        break;

      default:
        console.error(`Unknown command: ${command}`);
        showHelp();
        process.exit(1);
    }
  } catch (error) {
    outputError(error);
  }
}

main();
