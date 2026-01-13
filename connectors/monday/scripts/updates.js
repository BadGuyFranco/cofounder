#!/usr/bin/env node

/**
 * Monday.com Updates (Comments) Management
 * Create, read, and delete updates/comments on items.
 */

import { fileURLToPath } from 'url';
import path from 'path';
import {
  loadEnv, getToken, parseArgs, graphqlRequest,
  confirmDestructiveAction, handleError, showHelp, formatDate
} from './utils.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
loadEnv(path.join(__dirname, '..'));

// Help documentation
function printHelp() {
  showHelp('Monday.com Updates (Comments)', {
    'Commands': [
      'list <item_id>              List updates on an item',
      'get <update_id>             Get update details with replies',
      'create <item_id> <body>     Create a new update',
      'reply <update_id> <body>    Reply to an update',
      'like <update_id>            Like an update',
      'delete <update_id>          Delete an update (destructive)',
      'help                        Show this help'
    ],
    'Options': [
      '--limit <n>                 Number of updates to list (default: 25)',
      '--verbose                   Show full API response',
      '--force                     Skip confirmation for destructive actions'
    ],
    'Examples': [
      'node updates.js list 9876543210',
      'node updates.js list 9876543210 --limit 50',
      'node updates.js get 1234567890',
      'node updates.js create 9876543210 "This is a comment"',
      'node updates.js reply 1234567890 "This is a reply"',
      'node updates.js like 1234567890',
      'node updates.js delete 1234567890'
    ],
    'Notes': [
      'Updates are comments/activity on items',
      'Updates can have replies (threaded comments)',
      'Body text supports basic formatting',
      'Use item ID for list and create commands'
    ]
  });
}

// List updates on an item
async function listUpdates(itemId, args) {
  const token = getToken();
  const limit = parseInt(args.limit) || 25;
  
  console.log(`Fetching updates for item ${itemId}...\n`);
  
  const query = `
    query ($itemId: [ID!]!, $limit: Int!) {
      items(ids: $itemId) {
        id
        name
        updates(limit: $limit) {
          id
          body
          text_body
          created_at
          updated_at
          creator {
            id
            name
            email
          }
          replies {
            id
            body
            text_body
            created_at
            creator {
              id
              name
            }
          }
        }
      }
    }
  `;
  
  const data = await graphqlRequest(query, { itemId: [itemId], limit }, token);
  
  if (args.verbose) {
    console.log(JSON.stringify(data, null, 2));
    return;
  }
  
  const item = data.items?.[0];
  if (!item) {
    console.error(`Item not found: ${itemId}`);
    process.exit(1);
  }
  
  const updates = item.updates || [];
  console.log(`Item: ${item.name} (${item.id})`);
  console.log(`Found ${updates.length} updates:\n`);
  
  for (const update of updates) {
    console.log(`--- Update ${update.id} ---`);
    console.log(`  By: ${update.creator?.name || 'Unknown'}`);
    console.log(`  Date: ${formatDate(update.created_at)}`);
    console.log(`  ${update.text_body || update.body}`);
    
    if (update.replies?.length > 0) {
      console.log(`  Replies (${update.replies.length}):`);
      for (const reply of update.replies) {
        console.log(`    - ${reply.creator?.name || 'Unknown'}: ${reply.text_body || reply.body}`);
      }
    }
    console.log('');
  }
}

// Get single update with replies
async function getUpdate(updateId, args) {
  const token = getToken();
  
  const query = `
    query ($updateId: [ID!]!) {
      updates(ids: $updateId) {
        id
        body
        text_body
        created_at
        updated_at
        creator {
          id
          name
          email
        }
        assets {
          id
          name
          url
          file_extension
        }
        replies {
          id
          body
          text_body
          created_at
          creator {
            id
            name
          }
        }
      }
    }
  `;
  
  const data = await graphqlRequest(query, { updateId: [parseInt(updateId)] }, token);
  
  if (args.verbose) {
    console.log(JSON.stringify(data, null, 2));
    return;
  }
  
  const update = data.updates?.[0];
  if (!update) {
    console.error(`Update not found: ${updateId}`);
    process.exit(1);
  }
  
  console.log(`Update: ${updateId}\n`);
  console.log(`By: ${update.creator?.name || 'Unknown'} (${update.creator?.email || 'N/A'})`);
  console.log(`Created: ${formatDate(update.created_at)}`);
  if (update.updated_at !== update.created_at) {
    console.log(`Updated: ${formatDate(update.updated_at)}`);
  }
  console.log(`\nContent:\n${update.text_body || update.body}`);
  
  if (update.assets?.length > 0) {
    console.log('\n--- Attachments ---');
    for (const asset of update.assets) {
      console.log(`  ${asset.name} (${asset.file_extension})`);
      console.log(`    URL: ${asset.url}`);
    }
  }
  
  if (update.replies?.length > 0) {
    console.log(`\n--- Replies (${update.replies.length}) ---`);
    for (const reply of update.replies) {
      console.log(`\n  ${reply.creator?.name || 'Unknown'} - ${formatDate(reply.created_at)}`);
      console.log(`  ${reply.text_body || reply.body}`);
    }
  }
}

// Create an update
async function createUpdate(itemId, body, args) {
  const token = getToken();
  
  const mutation = `
    mutation ($itemId: ID!, $body: String!) {
      create_update(item_id: $itemId, body: $body) {
        id
        body
        text_body
        created_at
        creator {
          id
          name
        }
      }
    }
  `;
  
  const data = await graphqlRequest(mutation, { itemId, body }, token);
  
  if (args.verbose) {
    console.log(JSON.stringify(data, null, 2));
    return;
  }
  
  const update = data.create_update;
  console.log('Update created successfully!\n');
  console.log(`ID: ${update.id}`);
  console.log(`By: ${update.creator?.name || 'You'}`);
  console.log(`Content: ${update.text_body || update.body}`);
}

// Reply to an update
async function replyToUpdate(updateId, body, args) {
  const token = getToken();
  
  const mutation = `
    mutation ($updateId: ID!, $body: String!) {
      create_update(update_id: $updateId, body: $body) {
        id
        body
        text_body
        created_at
        creator {
          id
          name
        }
      }
    }
  `;
  
  const data = await graphqlRequest(mutation, { updateId, body }, token);
  
  if (args.verbose) {
    console.log(JSON.stringify(data, null, 2));
    return;
  }
  
  const reply = data.create_update;
  console.log('Reply created successfully!\n');
  console.log(`ID: ${reply.id}`);
  console.log(`By: ${reply.creator?.name || 'You'}`);
  console.log(`Content: ${reply.text_body || reply.body}`);
}

// Like an update
async function likeUpdate(updateId, args) {
  const token = getToken();
  
  const mutation = `
    mutation ($updateId: ID!) {
      like_update(update_id: $updateId) {
        id
      }
    }
  `;
  
  const data = await graphqlRequest(mutation, { updateId }, token);
  
  if (args.verbose) {
    console.log(JSON.stringify(data, null, 2));
    return;
  }
  
  console.log('Update liked successfully!');
}

// Delete an update
async function deleteUpdate(updateId, args) {
  const token = getToken();
  
  // Get update info first
  const getQuery = `
    query ($updateId: [ID!]!) {
      updates(ids: $updateId) {
        id
        text_body
        creator {
          name
        }
      }
    }
  `;
  
  const updateData = await graphqlRequest(getQuery, { updateId: [parseInt(updateId)] }, token);
  const update = updateData.updates?.[0];
  
  if (!update) {
    console.error(`Update not found: ${updateId}`);
    process.exit(1);
  }
  
  const preview = (update.text_body || '').substring(0, 50);
  
  const confirmed = await confirmDestructiveAction(
    `Delete update: ${updateId}`,
    [
      `By: ${update.creator?.name || 'Unknown'}`,
      `Content: ${preview}${preview.length >= 50 ? '...' : ''}`,
      'All replies will also be deleted.'
    ],
    args.force
  );
  
  if (!confirmed) return;
  
  const mutation = `
    mutation ($updateId: ID!) {
      delete_update(id: $updateId) {
        id
      }
    }
  `;
  
  await graphqlRequest(mutation, { updateId }, token);
  
  console.log('Update deleted successfully.');
}

// Main
async function main() {
  const args = parseArgs(process.argv.slice(2));
  const command = args._[0];
  
  try {
    switch (command) {
      case 'list':
        if (!args._[1]) {
          console.error('Error: Item ID required');
          console.error('Usage: node updates.js list <item_id>');
          process.exit(1);
        }
        await listUpdates(args._[1], args);
        break;
      case 'get':
        if (!args._[1]) {
          console.error('Error: Update ID required');
          console.error('Usage: node updates.js get <update_id>');
          process.exit(1);
        }
        await getUpdate(args._[1], args);
        break;
      case 'create':
        if (!args._[1] || !args._[2]) {
          console.error('Error: Item ID and body required');
          console.error('Usage: node updates.js create <item_id> <body>');
          process.exit(1);
        }
        await createUpdate(args._[1], args._.slice(2).join(' '), args);
        break;
      case 'reply':
        if (!args._[1] || !args._[2]) {
          console.error('Error: Update ID and body required');
          console.error('Usage: node updates.js reply <update_id> <body>');
          process.exit(1);
        }
        await replyToUpdate(args._[1], args._.slice(2).join(' '), args);
        break;
      case 'like':
        if (!args._[1]) {
          console.error('Error: Update ID required');
          console.error('Usage: node updates.js like <update_id>');
          process.exit(1);
        }
        await likeUpdate(args._[1], args);
        break;
      case 'delete':
        if (!args._[1]) {
          console.error('Error: Update ID required');
          console.error('Usage: node updates.js delete <update_id>');
          process.exit(1);
        }
        await deleteUpdate(args._[1], args);
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
