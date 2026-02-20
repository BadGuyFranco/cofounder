#!/usr/bin/env node

/**
 * Zoho CRM Webhooks Management
 * Create, read, update, delete webhooks for external integrations.
 */

import { fileURLToPath } from 'url';
import path from 'path';
import {
  initScript, parseArgs, apiRequest, confirmDestructiveAction, handleError, showHelp
} from './utils.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Help documentation
function printHelp() {
  showHelp('Zoho CRM Webhooks', {
    'Commands': [
      'list                        List all webhooks',
      'get <id>                    Get webhook details',
      'create                      Create a new webhook',
      'update <id>                 Update a webhook',
      'delete <id>                 Delete a webhook',
      'help                        Show this help'
    ],
    'Options': [
      '--org <name>                Organization to use',
      '--module <name>             Module for the webhook',
      '--name <name>               Webhook name',
      '--url <url>                 Webhook endpoint URL',
      '--method <method>           HTTP method (POST, GET, PUT, DELETE)',
      '--params <json>             URL/body parameters JSON',
      '--headers <json>            Custom headers JSON',
      '--verbose                   Show full API response',
      '--force                     Skip confirmation for destructive actions'
    ],
    'Examples': [
      'node webhooks.js list',
      'node webhooks.js list --module Leads',
      'node webhooks.js get 1234567890',
      'node webhooks.js create --module Leads --name "New Lead Hook" --url "https://api.example.com/webhook" --method POST',
      'node webhooks.js delete 1234567890'
    ],
    'HTTP Methods': [
      'POST - Body and URL parameters supported',
      'PUT - Body and URL parameters supported',
      'GET - URL parameters only',
      'DELETE - URL parameters only'
    ],
    'Parameters JSON Example': [
      '{',
      '  "module_params": [{"name": "id", "value": "${Leads.Lead Id}"}],',
      '  "custom_params": [{"name": "source", "value": "zoho"}]',
      '}'
    ]
  });
}

// List webhooks
async function listWebhooks(args) {
  const { config, token } = await initScript(args);
  
  console.log('Fetching webhooks...\n');
  
  let endpoint = '/settings/automation/webhooks';
  
  if (args.module) {
    endpoint += `?module=${args.module}`;
  }
  
  const data = await apiRequest('GET', endpoint, token, null, { region: config.region });
  
  if (args.verbose) {
    console.log(JSON.stringify(data, null, 2));
    return;
  }
  
  const webhooks = data.webhooks || [];
  
  console.log(`Found ${webhooks.length} webhooks:\n`);
  
  for (const webhook of webhooks) {
    console.log(`- ${webhook.name}`);
    console.log(`  ID: ${webhook.id}`);
    console.log(`  Module: ${webhook.module?.api_name || 'N/A'}`);
    console.log(`  URL: ${webhook.url || 'N/A'}`);
    console.log(`  Method: ${webhook.method || 'POST'}`);
    if (webhook.status) console.log(`  Status: ${webhook.status}`);
    console.log('');
  }
}

// Get webhook details
async function getWebhook(id, args) {
  const { config, token } = await initScript(args);
  
  const data = await apiRequest('GET', `/settings/automation/webhooks/${id}`, token, null, { region: config.region });
  
  if (args.verbose) {
    console.log(JSON.stringify(data, null, 2));
    return;
  }
  
  const webhooks = data.webhooks || [];
  
  if (webhooks.length === 0) {
    console.error(`Error: Webhook not found: ${id}`);
    process.exit(1);
  }
  
  const webhook = webhooks[0];
  
  console.log(`Webhook: ${webhook.name}\n`);
  console.log(`ID: ${webhook.id}`);
  console.log(`Module: ${webhook.module?.api_name || 'N/A'}`);
  console.log(`URL: ${webhook.url || 'N/A'}`);
  console.log(`Method: ${webhook.method || 'POST'}`);
  
  if (webhook.auth_type) {
    console.log(`\nAuthentication:`);
    console.log(`  Type: ${webhook.auth_type}`);
  }
  
  if (webhook.params && webhook.params.length > 0) {
    console.log(`\nParameters:`);
    for (const param of webhook.params) {
      console.log(`  - ${param.name}: ${param.value}`);
    }
  }
  
  if (webhook.headers && webhook.headers.length > 0) {
    console.log(`\nHeaders:`);
    for (const header of webhook.headers) {
      console.log(`  - ${header.name}: ${header.value}`);
    }
  }
}

// Create webhook
async function createWebhook(args) {
  const { config, token } = await initScript(args);
  
  if (!args.module) {
    console.error('Error: --module is required');
    process.exit(1);
  }
  
  if (!args.name) {
    console.error('Error: --name is required');
    process.exit(1);
  }
  
  if (!args.url) {
    console.error('Error: --url is required');
    process.exit(1);
  }
  
  const webhook = {
    name: args.name,
    url: args.url,
    method: args.method || 'POST',
    module: { api_name: args.module }
  };
  
  // Authentication
  if (args['auth-type']) {
    webhook.auth_type = args['auth-type'];
    if (args['auth-token']) {
      webhook.auth_token = args['auth-token'];
    }
  }
  
  // Parameters
  if (args.params) {
    try {
      const params = JSON.parse(args.params);
      if (params.module_params) webhook.module_params = params.module_params;
      if (params.custom_params) webhook.custom_params = params.custom_params;
    } catch (e) {
      console.error('Error: Invalid JSON in --params');
      process.exit(1);
    }
  }
  
  // Headers
  if (args.headers) {
    try {
      webhook.headers = JSON.parse(args.headers);
    } catch (e) {
      console.error('Error: Invalid JSON in --headers');
      process.exit(1);
    }
  }
  
  const body = { webhooks: [webhook] };
  
  const data = await apiRequest('POST', '/settings/automation/webhooks', token, body, { region: config.region });
  
  if (args.verbose) {
    console.log(JSON.stringify(data, null, 2));
    return;
  }
  
  if (data.webhooks && data.webhooks[0]) {
    const result = data.webhooks[0];
    if (result.status === 'success') {
      console.log('Webhook created successfully!\n');
      console.log(`ID: ${result.details.id}`);
    } else {
      console.error(`Error: ${result.message}`);
      process.exit(1);
    }
  }
}

// Update webhook
async function updateWebhook(id, args) {
  const { config, token } = await initScript(args);
  
  const webhook = { id };
  
  if (args.name) webhook.name = args.name;
  if (args.url) webhook.url = args.url;
  if (args.method) webhook.method = args.method;
  
  if (args.params) {
    try {
      const params = JSON.parse(args.params);
      if (params.module_params) webhook.module_params = params.module_params;
      if (params.custom_params) webhook.custom_params = params.custom_params;
    } catch (e) {
      console.error('Error: Invalid JSON in --params');
      process.exit(1);
    }
  }
  
  if (args.headers) {
    try {
      webhook.headers = JSON.parse(args.headers);
    } catch (e) {
      console.error('Error: Invalid JSON in --headers');
      process.exit(1);
    }
  }
  
  const body = { webhooks: [webhook] };
  
  const data = await apiRequest('PUT', `/settings/automation/webhooks/${id}`, token, body, { region: config.region });
  
  if (args.verbose) {
    console.log(JSON.stringify(data, null, 2));
    return;
  }
  
  if (data.webhooks && data.webhooks[0]) {
    const result = data.webhooks[0];
    if (result.status === 'success') {
      console.log('Webhook updated successfully!');
    } else {
      console.error(`Error: ${result.message}`);
      process.exit(1);
    }
  }
}

// Delete webhook
async function deleteWebhook(id, args) {
  const { config, token } = await initScript(args);
  
  // Get webhook info first
  let webhookName = id;
  try {
    const existing = await apiRequest('GET', `/settings/automation/webhooks/${id}`, token, null, { region: config.region });
    if (existing.webhooks && existing.webhooks[0]) {
      webhookName = existing.webhooks[0].name;
    }
  } catch (e) {
    // Proceed with ID
  }
  
  const confirmed = await confirmDestructiveAction(
    `Delete webhook: ${webhookName}`,
    [`ID: ${id}`, 'External integrations using this webhook will stop receiving data.'],
    args.force
  );
  
  if (!confirmed) return;
  
  const data = await apiRequest('DELETE', `/settings/automation/webhooks/${id}`, token, null, { region: config.region });
  
  if (args.verbose) {
    console.log(JSON.stringify(data, null, 2));
    return;
  }
  
  console.log('Webhook deleted successfully.');
}

// Main
async function main() {
  const args = parseArgs(process.argv.slice(2));
  const command = args._[0];
  
  try {
    switch (command) {
      case 'list':
        await listWebhooks(args);
        break;
      case 'get':
        if (!args._[1]) {
          console.error('Error: Webhook ID required');
          process.exit(1);
        }
        await getWebhook(args._[1], args);
        break;
      case 'create':
        await createWebhook(args);
        break;
      case 'update':
        if (!args._[1]) {
          console.error('Error: Webhook ID required');
          process.exit(1);
        }
        await updateWebhook(args._[1], args);
        break;
      case 'delete':
        if (!args._[1]) {
          console.error('Error: Webhook ID required');
          process.exit(1);
        }
        await deleteWebhook(args._[1], args);
        break;
      case 'help':
      default:
        printHelp();
    }
  } catch (error) {
    handleError(error, args.verbose);
  }
}

main();
