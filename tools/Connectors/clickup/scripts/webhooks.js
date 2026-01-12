#!/usr/bin/env node

/**
 * ClickUp Webhooks Script
 * Manage webhooks for receiving real-time notifications.
 *
 * Usage:
 *   node webhooks.js list <workspace-id>
 *   node webhooks.js create <workspace-id> --endpoint <url> --events <events>
 *   node webhooks.js update <webhook-id> --endpoint <url>
 *   node webhooks.js delete <webhook-id> [--force]
 *   node webhooks.js help
 */

import { parseArgs, apiRequest, parseJSON } from './utils.js';
import * as readline from 'readline';

/**
 * Format webhook for display
 */
function formatWebhook(webhook) {
  const output = [];

  output.push(`Webhook ID: ${webhook.id}`);
  output.push(`  Endpoint: ${webhook.endpoint}`);
  output.push(`  Status: ${webhook.status || 'active'}`);

  if (webhook.events && webhook.events.length > 0) {
    output.push(`  Events: ${webhook.events.join(', ')}`);
  }

  if (webhook.space_id) {
    output.push(`  Space: ${webhook.space_id}`);
  }

  if (webhook.folder_id) {
    output.push(`  Folder: ${webhook.folder_id}`);
  }

  if (webhook.list_id) {
    output.push(`  List: ${webhook.list_id}`);
  }

  if (webhook.task_id) {
    output.push(`  Task: ${webhook.task_id}`);
  }

  if (webhook.health) {
    output.push(`  Health: ${JSON.stringify(webhook.health)}`);
  }

  return output.join('\n');
}

/**
 * List webhooks for a workspace
 */
async function listWebhooks(workspaceId, verbose) {
  const data = await apiRequest(`/team/${workspaceId}/webhook`);

  const webhooks = data.webhooks || [];
  console.log(`Found ${webhooks.length} webhook(s):\n`);

  for (const webhook of webhooks) {
    console.log(formatWebhook(webhook));
    console.log('');
  }

  if (verbose) {
    console.log('\nFull response:');
    console.log(JSON.stringify(data, null, 2));
  }

  return webhooks;
}

/**
 * Create a webhook
 */
async function createWebhook(workspaceId, endpoint, events, options, verbose) {
  const body = {
    endpoint,
    events: typeof events === 'string' ? parseJSON(events, 'events') : events,
    ...(options.spaceId && { space_id: options.spaceId }),
    ...(options.folderId && { folder_id: options.folderId }),
    ...(options.listId && { list_id: options.listId }),
    ...(options.taskId && { task_id: options.taskId })
  };

  const data = await apiRequest(`/team/${workspaceId}/webhook`, {
    method: 'POST',
    body
  });

  console.log('Created webhook:');
  console.log(formatWebhook(data.webhook || data));

  if (verbose) {
    console.log('\nFull response:');
    console.log(JSON.stringify(data, null, 2));
  }

  return data;
}

/**
 * Update a webhook
 */
async function updateWebhook(webhookId, options, verbose) {
  const body = {};

  if (options.endpoint) body.endpoint = options.endpoint;
  if (options.events) body.events = parseJSON(options.events, 'events');
  if (options.status) body.status = options.status;

  const data = await apiRequest(`/webhook/${webhookId}`, {
    method: 'PUT',
    body
  });

  console.log('Updated webhook:');
  console.log(formatWebhook(data.webhook || data));

  if (verbose) {
    console.log('\nFull response:');
    console.log(JSON.stringify(data, null, 2));
  }

  return data;
}

/**
 * Delete a webhook
 */
async function deleteWebhook(webhookId, force, verbose) {
  if (!force) {
    const confirmed = await confirmDelete(webhookId);
    if (!confirmed) {
      console.log('Delete cancelled.');
      return null;
    }
  }

  await apiRequest(`/webhook/${webhookId}`, {
    method: 'DELETE'
  });

  console.log(`Deleted webhook: ${webhookId}`);
  return { success: true, id: webhookId };
}

/**
 * Confirm deletion
 */
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

/**
 * Show help
 */
function showHelp() {
  console.log('ClickUp Webhooks Script');
  console.log('');
  console.log('Commands:');
  console.log('  list <workspace-id>                    List webhooks');
  console.log('  create <workspace-id> --endpoint --events  Create webhook');
  console.log('  update <webhook-id> [options]          Update webhook');
  console.log('  delete <webhook-id>                    Delete webhook');
  console.log('  help                                   Show this help');
  console.log('');
  console.log('Options:');
  console.log('  --verbose                Show full API responses');
  console.log('  --force                  Skip delete confirmation');
  console.log('  --endpoint <url>         Webhook endpoint URL (HTTPS required)');
  console.log('  --events \'["event",...]\'  Events to subscribe to (JSON array)');
  console.log('  --status "active"        Webhook status (update only)');
  console.log('  --space-id <id>          Filter to specific space');
  console.log('  --folder-id <id>         Filter to specific folder');
  console.log('  --list-id <id>           Filter to specific list');
  console.log('  --task-id <id>           Filter to specific task');
  console.log('');
  console.log('Available Events:');
  console.log('  taskCreated              Task is created');
  console.log('  taskUpdated              Task is updated');
  console.log('  taskDeleted              Task is deleted');
  console.log('  taskPriorityUpdated      Task priority changes');
  console.log('  taskStatusUpdated        Task status changes');
  console.log('  taskAssigneeUpdated      Task assignees change');
  console.log('  taskDueDateUpdated       Task due date changes');
  console.log('  taskTagUpdated           Task tags change');
  console.log('  taskMoved                Task is moved to different list');
  console.log('  taskCommentPosted        Comment added to task');
  console.log('  taskCommentUpdated       Comment updated');
  console.log('  taskTimeEstimateUpdated  Time estimate changes');
  console.log('  taskTimeTrackedUpdated   Time tracked changes');
  console.log('  listCreated              List is created');
  console.log('  listUpdated              List is updated');
  console.log('  listDeleted              List is deleted');
  console.log('  folderCreated            Folder is created');
  console.log('  folderUpdated            Folder is updated');
  console.log('  folderDeleted            Folder is deleted');
  console.log('  spaceCreated             Space is created');
  console.log('  spaceUpdated             Space is updated');
  console.log('  spaceDeleted             Space is deleted');
  console.log('  goalCreated              Goal is created');
  console.log('  goalUpdated              Goal is updated');
  console.log('  goalDeleted              Goal is deleted');
  console.log('  keyResultCreated         Key result created');
  console.log('  keyResultUpdated         Key result updated');
  console.log('  keyResultDeleted         Key result deleted');
  console.log('');
  console.log('Examples:');
  console.log('  # List webhooks');
  console.log('  node webhooks.js list 12345678');
  console.log('');
  console.log('  # Create webhook for all task events');
  console.log('  node webhooks.js create 12345678 --endpoint "https://example.com/webhook" \\');
  console.log('    --events \'["taskCreated", "taskUpdated", "taskDeleted"]\'');
  console.log('');
  console.log('  # Create webhook for specific list');
  console.log('  node webhooks.js create 12345678 --endpoint "https://example.com/webhook" \\');
  console.log('    --events \'["taskCreated"]\' --list-id 87654321');
  console.log('');
  console.log('  # Update webhook endpoint');
  console.log('  node webhooks.js update webhook-uuid --endpoint "https://new.example.com/webhook"');
  console.log('');
  console.log('  # Delete webhook');
  console.log('  node webhooks.js delete webhook-uuid');
  console.log('');
  console.log('Webhook Payload:');
  console.log('  ClickUp sends POST requests to your endpoint with JSON payload:');
  console.log('  {');
  console.log('    "webhook_id": "...",');
  console.log('    "event": "taskCreated",');
  console.log('    "task_id": "...",');
  console.log('    "history_items": [...]');
  console.log('  }');
}

/**
 * Main entry point
 */
async function main() {
  const args = parseArgs(process.argv.slice(2));
  const command = args._[0];
  const verbose = args.verbose || false;

  try {
    switch (command) {
      case 'list': {
        const workspaceId = args._[1];
        if (!workspaceId) {
          console.error('Error: Workspace ID is required');
          console.error('Usage: node webhooks.js list <workspace-id>');
          process.exit(1);
        }
        await listWebhooks(workspaceId, verbose);
        break;
      }

      case 'create': {
        const workspaceId = args._[1];
        if (!workspaceId) {
          console.error('Error: Workspace ID is required');
          console.error('Usage: node webhooks.js create <workspace-id> --endpoint <url> --events <events>');
          process.exit(1);
        }
        if (!args.endpoint) {
          console.error('Error: --endpoint is required');
          process.exit(1);
        }
        if (!args.events) {
          console.error('Error: --events is required');
          process.exit(1);
        }
        await createWebhook(workspaceId, args.endpoint, args.events, {
          spaceId: args['space-id'],
          folderId: args['folder-id'],
          listId: args['list-id'],
          taskId: args['task-id']
        }, verbose);
        break;
      }

      case 'update': {
        const webhookId = args._[1];
        if (!webhookId) {
          console.error('Error: Webhook ID is required');
          console.error('Usage: node webhooks.js update <webhook-id> [options]');
          process.exit(1);
        }
        await updateWebhook(webhookId, {
          endpoint: args.endpoint,
          events: args.events,
          status: args.status
        }, verbose);
        break;
      }

      case 'delete': {
        const webhookId = args._[1];
        if (!webhookId) {
          console.error('Error: Webhook ID is required');
          console.error('Usage: node webhooks.js delete <webhook-id>');
          process.exit(1);
        }
        await deleteWebhook(webhookId, args.force, verbose);
        break;
      }

      case 'help':
      default:
        showHelp();
        break;
    }
  } catch (error) {
    console.error('Error:', error.message);
    if (error.code) {
      console.error('Code:', error.code);
    }
    if (verbose && error.details) {
      console.error('Details:', JSON.stringify(error.details, null, 2));
    }
    process.exit(1);
  }
}

main();
