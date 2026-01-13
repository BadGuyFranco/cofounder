#!/usr/bin/env node
/**
 * Cloudflare Zones Script
 * Manage zones (domains) in your Cloudflare account.
 */

import { parseArgs, apiRequest, fetchAllPages, output, outputError } from './utils.js';

function showHelp() {
  console.log(`
Zones Script - Manage Cloudflare zones (domains)

Usage: node scripts/zones.js <command> [options]

Commands:
  list                    List all zones in your account
  get <zone>              Get zone details (ID or domain name)
  settings <zone>         Get zone settings
  help                    Show this help

Options:
  --status <status>       Filter by status (active, pending, etc.)
  --name <name>           Filter by domain name (partial match)

Examples:
  node scripts/zones.js list
  node scripts/zones.js list --status active
  node scripts/zones.js get example.com
  node scripts/zones.js settings example.com
`);
}

async function listZones(flags) {
  let endpoint = '/zones';
  const params = [];

  if (flags.status) {
    params.push(`status=${encodeURIComponent(flags.status)}`);
  }
  if (flags.name) {
    params.push(`name=${encodeURIComponent(flags.name)}`);
  }

  if (params.length > 0) {
    endpoint += '?' + params.join('&');
  }

  const zones = await fetchAllPages(endpoint);
  
  // Simplified output
  const simplified = zones.map(z => ({
    id: z.id,
    name: z.name,
    status: z.status,
    plan: z.plan?.name,
    nameservers: z.name_servers
  }));

  output(simplified);
}

async function getZone(zoneIdentifier) {
  // If looks like domain name, look up ID first
  let zoneId = zoneIdentifier;
  if (!(/^[a-f0-9]{32}$/i.test(zoneIdentifier))) {
    const data = await apiRequest(`/zones?name=${encodeURIComponent(zoneIdentifier)}`);
    const zones = data.result || [];
    if (zones.length === 0) {
      throw new Error(`Zone not found: ${zoneIdentifier}`);
    }
    zoneId = zones[0].id;
  }

  const data = await apiRequest(`/zones/${zoneId}`);
  output(data.result);
}

async function getZoneSettings(zoneIdentifier) {
  // Resolve zone ID
  let zoneId = zoneIdentifier;
  if (!(/^[a-f0-9]{32}$/i.test(zoneIdentifier))) {
    const data = await apiRequest(`/zones?name=${encodeURIComponent(zoneIdentifier)}`);
    const zones = data.result || [];
    if (zones.length === 0) {
      throw new Error(`Zone not found: ${zoneIdentifier}`);
    }
    zoneId = zones[0].id;
  }

  const data = await apiRequest(`/zones/${zoneId}/settings`);
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
      case 'list':
        await listZones(args);
        break;

      case 'get':
        if (!args._[1]) {
          throw new Error('Zone ID or domain name required. Usage: get <zone>');
        }
        await getZone(args._[1]);
        break;

      case 'settings':
        if (!args._[1]) {
          throw new Error('Zone ID or domain name required. Usage: settings <zone>');
        }
        await getZoneSettings(args._[1]);
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
