#!/usr/bin/env node
/**
 * Cloudflare Turnstile Script
 * Manage CAPTCHA widgets for bot protection.
 * 
 * Note: Requires Account-level API token.
 */

import { parseArgs, apiRequest, fetchAllPages, output, outputError } from './utils.js';

function showHelp() {
  console.log(`
Turnstile Script - Manage Cloudflare Turnstile CAPTCHA widgets

Usage: node scripts/turnstile.js <command> [options]

Commands:
  list                            List all Turnstile widgets
  create <name>                   Create a widget
  delete <sitekey>                Delete a widget
  info <sitekey>                  Get widget details
  rotate-secret <sitekey>         Rotate the secret key
  help                            Show this help

Create Options:
  --domains <domains>       Comma-separated list of domains
  --mode <mode>             Widget mode: managed, non-interactive, invisible
  --region <region>         Data region: world, eu (default: world)
  --bot-fight-mode          Enable Bot Fight Mode
  --clearance-level <level> Access level: jschallenge, managed, interactive

Examples:
  node scripts/turnstile.js list
  node scripts/turnstile.js create "My Widget" --domains example.com,www.example.com --mode managed
  node scripts/turnstile.js create "Invisible Widget" --domains example.com --mode invisible
  node scripts/turnstile.js info 0x4AAAAAAA...
  node scripts/turnstile.js rotate-secret 0x4AAAAAAA...
  node scripts/turnstile.js delete 0x4AAAAAAA...

Widget Modes:
  - managed: Cloudflare decides challenge type
  - non-interactive: No user interaction required
  - invisible: Completely invisible to users

Note: After creating a widget, use the sitekey in your frontend.
Note: Use the secret key server-side to verify tokens.
`);
}

async function getAccountId() {
  const data = await apiRequest('/zones?per_page=1');
  const zones = data.result || [];
  if (zones.length === 0) {
    throw new Error('No zones found. Cannot determine account ID.');
  }
  return zones[0].account.id;
}

async function listWidgets() {
  const accountId = await getAccountId();
  const widgets = await fetchAllPages(`/accounts/${accountId}/challenges/widgets`);
  
  const simplified = widgets.map(w => ({
    sitekey: w.sitekey,
    name: w.name,
    domains: w.domains,
    mode: w.mode,
    region: w.region,
    created_on: w.created_on,
    bot_fight_mode: w.bot_fight_mode
  }));
  
  output(simplified);
}

async function createWidget(name, flags) {
  if (!name) {
    throw new Error('Widget name required');
  }
  if (!flags.domains) {
    throw new Error('--domains required');
  }

  const accountId = await getAccountId();
  
  const widget = {
    name,
    domains: flags.domains.split(',').map(d => d.trim()),
    mode: flags.mode || 'managed',
    region: flags.region || 'world'
  };

  if (flags['bot-fight-mode']) {
    widget.bot_fight_mode = true;
  }

  if (flags['clearance-level']) {
    widget.clearance_level = flags['clearance-level'];
  }

  const data = await apiRequest(`/accounts/${accountId}/challenges/widgets`, {
    method: 'POST',
    body: widget
  });

  console.log('Widget created!');
  console.log(`Sitekey (use in frontend): ${data.result.sitekey}`);
  console.log(`Secret (use server-side): ${data.result.secret}`);
  console.log('');
  console.log('IMPORTANT: Save the secret key now. It cannot be retrieved later.');
  
  output(data.result);
}

async function deleteWidget(sitekey) {
  if (!sitekey) {
    throw new Error('Sitekey required');
  }

  const accountId = await getAccountId();
  
  await apiRequest(`/accounts/${accountId}/challenges/widgets/${sitekey}`, {
    method: 'DELETE'
  });

  console.log(`Deleted widget: ${sitekey}`);
}

async function getWidgetInfo(sitekey) {
  if (!sitekey) {
    throw new Error('Sitekey required');
  }

  const accountId = await getAccountId();
  const data = await apiRequest(`/accounts/${accountId}/challenges/widgets/${sitekey}`);
  output(data.result);
}

async function rotateSecret(sitekey) {
  if (!sitekey) {
    throw new Error('Sitekey required');
  }

  const accountId = await getAccountId();
  
  const data = await apiRequest(`/accounts/${accountId}/challenges/widgets/${sitekey}/rotate_secret`, {
    method: 'POST'
  });

  console.log('Secret rotated!');
  console.log(`New secret: ${data.result.secret}`);
  console.log('');
  console.log('IMPORTANT: Update your server-side code with the new secret.');
  
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
        await listWidgets();
        break;

      case 'create':
        await createWidget(args._[1], args);
        break;

      case 'delete':
        await deleteWidget(args._[1]);
        break;

      case 'info':
        await getWidgetInfo(args._[1]);
        break;

      case 'rotate-secret':
        await rotateSecret(args._[1]);
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
