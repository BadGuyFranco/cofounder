#!/usr/bin/env node
/**
 * Cloudflare Queues Script
 * Manage Queues for async message processing with Workers.
 * 
 * Note: Requires Account-level API token permissions.
 */

import { parseArgs, apiRequest, fetchAllPages, output, outputError } from './utils.js';

function showHelp() {
  console.log(`
Queues Script - Manage Cloudflare Queues

Usage: node scripts/queues.js <command> [options]

Commands:
  list                            List all queues
  create <name>                   Create a new queue
  delete <name>                   Delete a queue
  info <name>                     Get queue details
  consumers <name>                List consumers for a queue
  add-consumer <name>             Add a consumer to a queue
  remove-consumer <name> <id>     Remove a consumer from a queue
  help                            Show this help

Add Consumer Options:
  --script <name>           Worker script name
  --environment <env>       Worker environment (optional)
  --batch-size <n>          Max messages per batch (default: 10)
  --max-retries <n>         Max retry attempts (default: 3)
  --max-wait-ms <ms>        Max wait time in ms (default: 5000)

Examples:
  node scripts/queues.js list
  node scripts/queues.js create my-queue
  node scripts/queues.js info my-queue
  node scripts/queues.js consumers my-queue
  node scripts/queues.js add-consumer my-queue --script my-worker --batch-size 10
  node scripts/queues.js remove-consumer my-queue consumer-id
  node scripts/queues.js delete my-queue

Note: Requires Account-level token with Queues Edit permission.
Note: To send messages, use Workers API or wrangler.
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

async function listQueues() {
  const accountId = await getAccountId();
  const queues = await fetchAllPages(`/accounts/${accountId}/queues`);
  
  const simplified = queues.map(q => ({
    queue_id: q.queue_id,
    queue_name: q.queue_name,
    created_on: q.created_on,
    consumers_total_count: q.consumers_total_count,
    producers_total_count: q.producers_total_count
  }));
  
  output(simplified);
}

async function createQueue(name) {
  if (!name) {
    throw new Error('Queue name required');
  }

  const accountId = await getAccountId();
  
  const data = await apiRequest(`/accounts/${accountId}/queues`, {
    method: 'POST',
    body: { queue_name: name }
  });

  console.log(`Created queue: ${name}`);
  output(data.result);
}

async function deleteQueue(name) {
  if (!name) {
    throw new Error('Queue name required');
  }

  const accountId = await getAccountId();
  
  await apiRequest(`/accounts/${accountId}/queues/${name}`, {
    method: 'DELETE'
  });

  console.log(`Deleted queue: ${name}`);
}

async function getQueueInfo(name) {
  if (!name) {
    throw new Error('Queue name required');
  }

  const accountId = await getAccountId();
  const data = await apiRequest(`/accounts/${accountId}/queues/${name}`);
  output(data.result);
}

async function listConsumers(name) {
  if (!name) {
    throw new Error('Queue name required');
  }

  const accountId = await getAccountId();
  const data = await apiRequest(`/accounts/${accountId}/queues/${name}/consumers`);
  output(data.result);
}

async function addConsumer(name, flags) {
  if (!name) {
    throw new Error('Queue name required');
  }
  if (!flags.script) {
    throw new Error('--script required (Worker script name)');
  }

  const accountId = await getAccountId();
  
  const consumer = {
    script_name: flags.script,
    settings: {
      batch_size: flags['batch-size'] ? parseInt(flags['batch-size']) : 10,
      max_retries: flags['max-retries'] ? parseInt(flags['max-retries']) : 3,
      max_wait_time_ms: flags['max-wait-ms'] ? parseInt(flags['max-wait-ms']) : 5000
    }
  };

  if (flags.environment) {
    consumer.environment = flags.environment;
  }

  const data = await apiRequest(`/accounts/${accountId}/queues/${name}/consumers`, {
    method: 'POST',
    body: consumer
  });

  console.log(`Added consumer: ${flags.script} -> ${name}`);
  output(data.result);
}

async function removeConsumer(name, consumerId) {
  if (!name || !consumerId) {
    throw new Error('Queue name and consumer ID required');
  }

  const accountId = await getAccountId();
  
  await apiRequest(`/accounts/${accountId}/queues/${name}/consumers/${consumerId}`, {
    method: 'DELETE'
  });

  console.log(`Removed consumer: ${consumerId}`);
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
        await listQueues();
        break;

      case 'create':
        await createQueue(args._[1]);
        break;

      case 'delete':
        await deleteQueue(args._[1]);
        break;

      case 'info':
        await getQueueInfo(args._[1]);
        break;

      case 'consumers':
        await listConsumers(args._[1]);
        break;

      case 'add-consumer':
        await addConsumer(args._[1], args);
        break;

      case 'remove-consumer':
        await removeConsumer(args._[1], args._[2]);
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
