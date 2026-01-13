#!/usr/bin/env node

/**
 * Airtable Webhooks Script
 * Create, list, and manage webhooks for real-time notifications.
 *
 * Usage:
 *   node webhooks.js list <base-id>
 *   node webhooks.js get <base-id> <webhook-id>
 *   node webhooks.js create <base-id> --url <notification-url> [options]
 *   node webhooks.js payloads <base-id> <webhook-id> [--cursor <cursor>]
 *   node webhooks.js refresh <base-id> <webhook-id>
 *   node webhooks.js delete <base-id> <webhook-id> [--force]
 *   node webhooks.js help
 */

import { parseArgs, apiRequest, parseJSON } from './utils.js';
import * as readline from 'readline';

// List all webhooks for a base
async function listWebhooks(baseId, verbose) {
  const data = await apiRequest(`/bases/${baseId}/webhooks`);

  const webhooks = data.webhooks || [];
  console.log(`Found ${webhooks.length} webhook(s):\n`);

  for (const webhook of webhooks) {
    console.log(`ID: ${webhook.id}`);
    console.log(`  Notification URL: ${webhook.notificationUrl || '(not set)'}`);
    console.log(`  Cursor: ${webhook.cursorForNextPayload || 0}`);
    console.log(`  Expires: ${webhook.expirationTime || 'N/A'}`);

    if (webhook.specification) {
      console.log(`  Watches: ${JSON.stringify(webhook.specification.options?.filters || 'all changes')}`);
    }

    if (webhook.isHookEnabled !== undefined) {
      console.log(`  Enabled: ${webhook.isHookEnabled}`);
    }

    console.log('');
  }

  if (verbose) {
    console.log('\nFull response:');
    console.log(JSON.stringify(data, null, 2));
  }

  return webhooks;
}

// Get a specific webhook
async function getWebhook(baseId, webhookId, verbose) {
  const data = await apiRequest(`/bases/${baseId}/webhooks`);

  const webhook = (data.webhooks || []).find(w => w.id === webhookId);
  if (!webhook) {
    console.error(`Error: Webhook "${webhookId}" not found`);
    process.exit(1);
  }

  console.log(`Webhook: ${webhook.id}`);
  console.log(`Notification URL: ${webhook.notificationUrl || '(not set)'}`);
  console.log(`MAC Secret: ${webhook.macSecretBase64 ? '(set)' : '(not set)'}`);
  console.log(`Cursor: ${webhook.cursorForNextPayload || 0}`);
  console.log(`Expires: ${webhook.expirationTime || 'N/A'}`);

  if (webhook.specification) {
    console.log('\nSpecification:');
    console.log(JSON.stringify(webhook.specification, null, 2));
  }

  if (verbose) {
    console.log('\nFull response:');
    console.log(JSON.stringify(webhook, null, 2));
  }

  return webhook;
}

// Create a new webhook
async function createWebhook(baseId, options, verbose) {
  const { url, tables, dataTypes, changeTypes } = options;

  // Build specification
  const specification = {
    options: {
      filters: {
        dataTypes: dataTypes ? dataTypes.split(',') : ['tableData'],
      }
    }
  };

  // Filter by specific tables if provided
  if (tables) {
    specification.options.filters.sourceOptions = {
      tables: {
        tableIds: tables.split(',')
      }
    };
  }

  // Filter by change types if provided
  if (changeTypes) {
    specification.options.filters.changeTypes = changeTypes.split(',');
  }

  const body = {
    notificationUrl: url,
    specification
  };

  const data = await apiRequest(`/bases/${baseId}/webhooks`, {
    method: 'POST',
    body
  });

  console.log('Created webhook:');
  console.log(`  ID: ${data.id}`);
  console.log(`  Notification URL: ${url}`);
  console.log(`  MAC Secret: ${data.macSecretBase64}`);
  console.log(`  Expires: ${data.expirationTime}`);
  console.log('');
  console.log('IMPORTANT: Save the MAC Secret above. It is only shown once.');
  console.log('Use it to verify webhook payloads are from Airtable.');

  if (verbose) {
    console.log('\nFull response:');
    console.log(JSON.stringify(data, null, 2));
  }

  return data;
}

// Get webhook payloads
async function getPayloads(baseId, webhookId, cursor, verbose) {
  let endpoint = `/bases/${baseId}/webhooks/${webhookId}/payloads`;
  if (cursor) {
    endpoint += `?cursor=${cursor}`;
  }

  const data = await apiRequest(endpoint);

  const payloads = data.payloads || [];
  console.log(`Found ${payloads.length} payload(s):\n`);

  for (const payload of payloads) {
    console.log(`Timestamp: ${payload.timestamp}`);
    console.log(`Base Transaction: ${payload.baseTransactionNumber}`);

    if (payload.payloadFormat === 'v0') {
      if (payload.changedTablesById) {
        for (const [tableId, changes] of Object.entries(payload.changedTablesById)) {
          console.log(`  Table: ${tableId}`);

          if (changes.createdRecordsById) {
            console.log(`    Created: ${Object.keys(changes.createdRecordsById).length} record(s)`);
          }
          if (changes.changedRecordsById) {
            console.log(`    Changed: ${Object.keys(changes.changedRecordsById).length} record(s)`);
          }
          if (changes.destroyedRecordIds) {
            console.log(`    Deleted: ${changes.destroyedRecordIds.length} record(s)`);
          }
        }
      }
    }

    console.log('');
  }

  if (data.cursor) {
    console.log(`Next cursor: ${data.cursor}`);
    console.log(`More payloads: ${data.mightHaveMore}`);
  }

  if (verbose) {
    console.log('\nFull response:');
    console.log(JSON.stringify(data, null, 2));
  }

  return data;
}

// Refresh webhook (extend expiration)
async function refreshWebhook(baseId, webhookId, verbose) {
  const data = await apiRequest(`/bases/${baseId}/webhooks/${webhookId}/refresh`, {
    method: 'POST'
  });

  console.log(`Refreshed webhook: ${webhookId}`);
  console.log(`New expiration: ${data.expirationTime}`);

  if (verbose) {
    console.log('\nFull response:');
    console.log(JSON.stringify(data, null, 2));
  }

  return data;
}

// Delete a webhook
async function deleteWebhook(baseId, webhookId, force, verbose) {
  if (!force) {
    const confirmed = await confirmDelete(webhookId);
    if (!confirmed) {
      console.log('Delete cancelled.');
      return null;
    }
  }

  await apiRequest(`/bases/${baseId}/webhooks/${webhookId}`, {
    method: 'DELETE'
  });

  console.log(`Deleted webhook: ${webhookId}`);

  return { deleted: true, id: webhookId };
}

// Confirm deletion
async function confirmDelete(webhookId) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  return new Promise((resolve) => {
    rl.question(`Are you sure you want to delete webhook ${webhookId}? (yes/no): `, (answer) => {
      rl.close();
      resolve(answer.toLowerCase() === 'yes' || answer.toLowerCase() === 'y');
    });
  });
}

// Show help
function showHelp() {
  console.log('Airtable Webhooks Script');
  console.log('');
  console.log('Commands:');
  console.log('  list <base-id>                              List all webhooks');
  console.log('  get <base-id> <webhook-id>                  Get webhook details');
  console.log('  create <base-id> --url <url> [options]      Create a webhook');
  console.log('  payloads <base-id> <webhook-id>             Get pending payloads');
  console.log('  refresh <base-id> <webhook-id>              Extend webhook expiration');
  console.log('  delete <base-id> <webhook-id>               Delete a webhook');
  console.log('  help                                        Show this help');
  console.log('');
  console.log('Create Options:');
  console.log('  --url <url>                Notification URL (required)');
  console.log('  --tables <id1,id2>         Filter to specific table IDs');
  console.log('  --dataTypes <types>        Data types: tableData, tableFields, tableMetadata');
  console.log('  --changeTypes <types>      Change types: add, remove, update');
  console.log('');
  console.log('Payload Options:');
  console.log('  --cursor <cursor>          Cursor for pagination');
  console.log('');
  console.log('Other Options:');
  console.log('  --verbose                  Show full API responses');
  console.log('  --force                    Skip delete confirmation');
  console.log('');
  console.log('Examples:');
  console.log('  # List webhooks');
  console.log('  node webhooks.js list appXXX');
  console.log('');
  console.log('  # Create webhook for all changes');
  console.log('  node webhooks.js create appXXX --url https://example.com/webhook');
  console.log('');
  console.log('  # Create webhook for specific table');
  console.log('  node webhooks.js create appXXX --url https://example.com/webhook --tables tblXXX');
  console.log('');
  console.log('  # Create webhook for record changes only');
  console.log('  node webhooks.js create appXXX --url https://example.com/webhook --dataTypes tableData');
  console.log('');
  console.log('  # Get pending payloads');
  console.log('  node webhooks.js payloads appXXX achXXX');
  console.log('');
  console.log('  # Refresh webhook before it expires');
  console.log('  node webhooks.js refresh appXXX achXXX');
  console.log('');
  console.log('Notes:');
  console.log('  - Webhooks expire after 7 days; use refresh to extend');
  console.log('  - MAC Secret is shown only at creation; save it');
  console.log('  - Payloads are retained for 7 days');
  console.log('  - Webhook IDs start with "ach"');
}

// Main
async function main() {
  const args = parseArgs(process.argv.slice(2));
  const command = args._[0];
  const verbose = args.verbose || false;

  try {
    switch (command) {
      case 'list': {
        const baseId = args._[1];
        if (!baseId) {
          console.error('Error: Base ID is required');
          console.error('Usage: node webhooks.js list <base-id>');
          process.exit(1);
        }
        await listWebhooks(baseId, verbose);
        break;
      }

      case 'get': {
        const baseId = args._[1];
        const webhookId = args._[2];

        if (!baseId || !webhookId) {
          console.error('Error: Base ID and Webhook ID are required');
          console.error('Usage: node webhooks.js get <base-id> <webhook-id>');
          process.exit(1);
        }

        await getWebhook(baseId, webhookId, verbose);
        break;
      }

      case 'create': {
        const baseId = args._[1];
        const url = args.url;

        if (!baseId) {
          console.error('Error: Base ID is required');
          console.error('Usage: node webhooks.js create <base-id> --url <url>');
          process.exit(1);
        }

        if (!url) {
          console.error('Error: --url is required');
          console.error('Usage: node webhooks.js create <base-id> --url <url>');
          process.exit(1);
        }

        await createWebhook(baseId, {
          url,
          tables: args.tables,
          dataTypes: args.dataTypes,
          changeTypes: args.changeTypes
        }, verbose);
        break;
      }

      case 'payloads': {
        const baseId = args._[1];
        const webhookId = args._[2];

        if (!baseId || !webhookId) {
          console.error('Error: Base ID and Webhook ID are required');
          console.error('Usage: node webhooks.js payloads <base-id> <webhook-id>');
          process.exit(1);
        }

        await getPayloads(baseId, webhookId, args.cursor, verbose);
        break;
      }

      case 'refresh': {
        const baseId = args._[1];
        const webhookId = args._[2];

        if (!baseId || !webhookId) {
          console.error('Error: Base ID and Webhook ID are required');
          console.error('Usage: node webhooks.js refresh <base-id> <webhook-id>');
          process.exit(1);
        }

        await refreshWebhook(baseId, webhookId, verbose);
        break;
      }

      case 'delete': {
        const baseId = args._[1];
        const webhookId = args._[2];

        if (!baseId || !webhookId) {
          console.error('Error: Base ID and Webhook ID are required');
          console.error('Usage: node webhooks.js delete <base-id> <webhook-id>');
          process.exit(1);
        }

        await deleteWebhook(baseId, webhookId, args.force, verbose);
        break;
      }

      case 'help':
      default:
        showHelp();
        break;
    }
  } catch (error) {
    console.error('Error:', error.message);
    if (error.type) {
      console.error('Type:', error.type);
    }
    if (verbose && error.details) {
      console.error('Details:', JSON.stringify(error.details, null, 2));
    }
    process.exit(1);
  }
}

main();
