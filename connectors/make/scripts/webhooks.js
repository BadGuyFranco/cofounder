#!/usr/bin/env node

/**
 * Make.com Webhooks Script
 * List, get, and trigger webhooks (hooks) in Make.
 * 
 * Usage:
 *   node webhooks.js list --team-id <id>
 *   node webhooks.js get <hook-id>
 *   node webhooks.js trigger <webhook-url> [--data '{"key":"value"}']
 *   node webhooks.js logs <hook-id> [--limit 10]
 */

import { get, parseArgs, printTable, formatOutput } from './utils.js';

// List webhooks for a team
async function listWebhooks(teamId, verbose) {
  const response = await get('/hooks', { teamId });
  const hooks = response.hooks || response;
  
  if (verbose) {
    formatOutput(hooks, true);
    return;
  }
  
  console.log(`Found ${hooks.length} webhook(s):\n`);
  
  printTable(hooks, [
    { key: 'id', label: 'ID' },
    { key: 'name', label: 'Name' },
    { key: 'type', label: 'Type' },
    { key: 'url', label: 'URL', getter: h => h.url ? h.url.substring(0, 50) + '...' : '' }
  ]);
}

// Get a specific webhook
async function getWebhook(hookId, verbose) {
  const response = await get(`/hooks/${hookId}`);
  const hook = response.hook || response;
  
  if (verbose) {
    formatOutput(hook, true);
    return;
  }
  
  console.log(`Webhook: ${hook.name}`);
  console.log(`ID: ${hook.id}`);
  console.log(`Type: ${hook.type}`);
  if (hook.url) {
    console.log(`URL: ${hook.url}`);
  }
  if (hook.scenarioId) {
    console.log(`Scenario ID: ${hook.scenarioId}`);
  }
  console.log(`Queue Count: ${hook.queueCount || 0}`);
  console.log(`Queue Size: ${hook.queueSize || 0}`);
}

// Trigger a webhook by URL (external HTTP call)
async function triggerWebhook(webhookUrl, data, verbose) {
  const body = data ? JSON.parse(data) : {};
  
  const response = await fetch(webhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  
  const text = await response.text();
  let result;
  try {
    result = JSON.parse(text);
  } catch {
    result = text;
  }
  
  if (verbose) {
    console.log('Status:', response.status);
    formatOutput(result, true);
    return;
  }
  
  if (response.ok) {
    console.log(`Webhook triggered successfully.`);
    console.log(`Status: ${response.status}`);
    if (result && typeof result === 'object') {
      console.log('Response:', JSON.stringify(result, null, 2));
    } else if (result) {
      console.log('Response:', result);
    }
  } else {
    console.error(`Webhook trigger failed.`);
    console.error(`Status: ${response.status}`);
    console.error('Response:', result);
  }
}

// Get webhook logs (incoming data queue)
async function getWebhookLogs(hookId, limit, verbose) {
  const params = {};
  if (limit) {
    params.pg = { limit: parseInt(limit) };
  }
  
  const response = await get(`/hooks/${hookId}/incomings`, params);
  const logs = response.hookIncomings || response;
  
  if (verbose) {
    formatOutput(logs, true);
    return;
  }
  
  if (!logs || logs.length === 0) {
    console.log('No incoming data found in queue.');
    return;
  }
  
  console.log(`Found ${logs.length} incoming item(s):\n`);
  
  printTable(logs, [
    { key: 'id', label: 'ID' },
    { key: 'date', label: 'Date' },
    { key: 'requestId', label: 'Request ID' }
  ]);
}

// Show help
function showHelp() {
  console.log('Make.com Webhooks Script');
  console.log('');
  console.log('Commands:');
  console.log('  list --team-id <id>                      List webhooks for a team');
  console.log('  get <hook-id>                            Get webhook details');
  console.log('  trigger <webhook-url> [--data \'{"key":"val"}\']  Trigger a webhook');
  console.log('  logs <hook-id> [--limit 10]              Get webhook incoming queue');
  console.log('');
  console.log('Options:');
  console.log('  --team-id <id>     Team ID (required for list)');
  console.log('  --data <json>      JSON data to send to webhook');
  console.log('  --limit <n>        Number of items to show');
  console.log('  --verbose          Show full API responses');
  console.log('');
  console.log('Examples:');
  console.log('  node webhooks.js list --team-id 12345');
  console.log('  node webhooks.js get 67890');
  console.log('  node webhooks.js trigger https://hook.us1.make.com/xxx --data \'{"name":"test"}\'');
  console.log('  node webhooks.js logs 67890 --limit 5');
  console.log('');
  console.log('Note: The "trigger" command makes an HTTP POST to a webhook URL.');
  console.log('      You can find webhook URLs in the Make.com scenario editor.');
}

// Main
async function main() {
  const args = parseArgs(process.argv.slice(2));
  const command = args._[0];
  const verbose = args.verbose || false;
  
  try {
    switch (command) {
      case 'list': {
        const teamId = args['team-id'];
        if (!teamId) {
          console.error('Error: --team-id is required');
          console.error('Usage: node webhooks.js list --team-id <id>');
          process.exit(1);
        }
        await listWebhooks(teamId, verbose);
        break;
      }
      
      case 'get': {
        const hookId = args._[1];
        if (!hookId) {
          console.error('Error: Hook ID is required');
          console.error('Usage: node webhooks.js get <hook-id>');
          process.exit(1);
        }
        await getWebhook(hookId, verbose);
        break;
      }
      
      case 'trigger': {
        const webhookUrl = args._[1];
        if (!webhookUrl) {
          console.error('Error: Webhook URL is required');
          console.error('Usage: node webhooks.js trigger <webhook-url> [--data \'{"key":"value"}\']');
          process.exit(1);
        }
        await triggerWebhook(webhookUrl, args.data, verbose);
        break;
      }
      
      case 'logs': {
        const hookId = args._[1];
        if (!hookId) {
          console.error('Error: Hook ID is required');
          console.error('Usage: node webhooks.js logs <hook-id> [--limit 10]');
          process.exit(1);
        }
        await getWebhookLogs(hookId, args.limit, verbose);
        break;
      }
      
      case 'help':
      default:
        showHelp();
        process.exit(0);
    }
  } catch (error) {
    console.error('Error:', error.message);
    if (verbose) {
      console.error(error.stack);
    }
    process.exit(1);
  }
}

main();
