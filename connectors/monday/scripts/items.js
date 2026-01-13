#!/usr/bin/env node

/**
 * Monday.com Items Management
 * Create, read, update, delete items on boards.
 */

import { fileURLToPath } from 'url';
import path from 'path';
import {
  loadEnv, getToken, parseArgs, graphqlRequest,
  confirmDestructiveAction, handleError, showHelp,
  parseColumnValue, formatColumnValue
} from './utils.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
loadEnv(path.join(__dirname, '..'));

// Help documentation
function printHelp() {
  showHelp('Monday.com Items', {
    'Commands': [
      'list <board_id>             List items on a board',
      'get <item_id>               Get item details',
      'create <board_id> <name>    Create a new item',
      'update <item_id>            Update item column values',
      'move <item_id> <group_id>   Move item to a different group',
      'delete <item_id>            Delete an item (destructive)',
      'help                        Show this help'
    ],
    'Options': [
      '--group <group_id>          Target group for create',
      '--column <col_id>=<value>   Set column value (repeatable)',
      '--limit <n>                 Number of items to list (default: 50)',
      '--verbose                   Show full API response',
      '--force                     Skip confirmation for destructive actions'
    ],
    'Examples': [
      'node items.js list 1234567890',
      'node items.js list 1234567890 --limit 100',
      'node items.js get 9876543210',
      'node items.js create 1234567890 "New Task"',
      'node items.js create 1234567890 "New Task" --group topics',
      'node items.js create 1234567890 "New Task" --column status="Done" --column date4="2024-01-15"',
      'node items.js update 9876543210 --column status="In Progress"',
      'node items.js update 9876543210 --column status=1 --column text="Updated text"',
      'node items.js move 9876543210 new_group12345',
      'node items.js delete 9876543210'
    ],
    'Column Value Formats': [
      'Text:     --column text_col="My text"',
      'Number:   --column numbers_col="123"',
      'Status:   --column status="Done" or --column status=1 (by index)',
      'Date:     --column date_col="2024-01-15"',
      'Email:    --column email_col="test@example.com"',
      'Phone:    --column phone_col="+1234567890"'
    ],
    'Notes': [
      'Use "boards.js get <id> --columns" to see column IDs',
      'Use "boards.js get <id> --groups" to see group IDs',
      'Status can be set by label name or index number'
    ]
  });
}

// Parse --column arguments into object
function parseColumnArgs(args) {
  const columns = {};
  const rawArgs = process.argv.slice(2);
  
  for (let i = 0; i < rawArgs.length; i++) {
    if (rawArgs[i] === '--column' && rawArgs[i + 1]) {
      const match = rawArgs[i + 1].match(/^([^=]+)=(.+)$/);
      if (match) {
        columns[match[1]] = match[2];
      }
    }
  }
  
  return columns;
}

// List items on a board
async function listItems(boardId, args) {
  const token = getToken();
  const limit = parseInt(args.limit) || 50;
  
  console.log(`Fetching items from board ${boardId}...\n`);
  
  const query = `
    query ($boardId: [ID!]!, $limit: Int!) {
      boards(ids: $boardId) {
        name
        items_page(limit: $limit) {
          cursor
          items {
            id
            name
            state
            created_at
            updated_at
            group {
              id
              title
            }
            column_values {
              id
              text
              value
              type
            }
          }
        }
      }
    }
  `;
  
  const data = await graphqlRequest(query, { boardId: [boardId], limit }, token);
  
  if (args.verbose) {
    console.log(JSON.stringify(data, null, 2));
    return;
  }
  
  const board = data.boards?.[0];
  if (!board) {
    console.error(`Board not found: ${boardId}`);
    process.exit(1);
  }
  
  const items = board.items_page?.items || [];
  console.log(`Board: ${board.name}`);
  console.log(`Found ${items.length} items${board.items_page?.cursor ? '+' : ''}:\n`);
  
  for (const item of items) {
    console.log(`- ${item.name}`);
    console.log(`  ID: ${item.id}`);
    if (item.group) {
      console.log(`  Group: ${item.group.title} (${item.group.id})`);
    }
    console.log(`  State: ${item.state}`);
    
    // Show key column values
    const keyColumns = item.column_values?.slice(0, 5) || [];
    for (const col of keyColumns) {
      const displayValue = parseColumnValue(col);
      if (displayValue) {
        console.log(`  ${col.id}: ${displayValue}`);
      }
    }
    console.log('');
  }
}

// Get single item
async function getItem(itemId, args) {
  const token = getToken();
  
  const query = `
    query ($itemId: [ID!]!) {
      items(ids: $itemId) {
        id
        name
        state
        created_at
        updated_at
        board {
          id
          name
        }
        group {
          id
          title
        }
        column_values {
          id
          title
          text
          value
          type
        }
        subitems {
          id
          name
        }
      }
    }
  `;
  
  const data = await graphqlRequest(query, { itemId: [itemId] }, token);
  
  if (args.verbose) {
    console.log(JSON.stringify(data, null, 2));
    return;
  }
  
  const item = data.items?.[0];
  if (!item) {
    console.error(`Item not found: ${itemId}`);
    process.exit(1);
  }
  
  console.log(`Item: ${item.name}\n`);
  console.log(`ID: ${item.id}`);
  console.log(`State: ${item.state}`);
  console.log(`Board: ${item.board?.name} (${item.board?.id})`);
  console.log(`Group: ${item.group?.title} (${item.group?.id})`);
  console.log(`Created: ${item.created_at}`);
  console.log(`Updated: ${item.updated_at}`);
  
  // Show all column values
  if (item.column_values?.length > 0) {
    console.log('\n--- Column Values ---');
    for (const col of item.column_values) {
      const displayValue = parseColumnValue(col);
      console.log(`  ${col.id} (${col.title}): ${displayValue || '(empty)'}`);
    }
  }
  
  // Show subitems
  if (item.subitems?.length > 0) {
    console.log('\n--- Subitems ---');
    for (const sub of item.subitems) {
      console.log(`  ${sub.id}: ${sub.name}`);
    }
  }
}

// Create item
async function createItem(boardId, itemName, args) {
  const token = getToken();
  const groupId = args.group || null;
  const columnArgs = parseColumnArgs(args);
  
  // Build column values JSON
  let columnValues = null;
  if (Object.keys(columnArgs).length > 0) {
    const values = {};
    for (const [colId, value] of Object.entries(columnArgs)) {
      // We don't know column types here, so make best guess
      values[colId] = value;
    }
    columnValues = JSON.stringify(values);
  }
  
  const query = `
    mutation ($boardId: ID!, $itemName: String!, $groupId: String, $columnValues: JSON) {
      create_item(
        board_id: $boardId
        item_name: $itemName
        group_id: $groupId
        column_values: $columnValues
      ) {
        id
        name
        group {
          id
          title
        }
      }
    }
  `;
  
  const variables = {
    boardId,
    itemName,
    groupId,
    columnValues
  };
  
  const data = await graphqlRequest(query, variables, token);
  
  if (args.verbose) {
    console.log(JSON.stringify(data, null, 2));
    return;
  }
  
  const item = data.create_item;
  console.log('Item created successfully!\n');
  console.log(`ID: ${item.id}`);
  console.log(`Name: ${item.name}`);
  if (item.group) {
    console.log(`Group: ${item.group.title} (${item.group.id})`);
  }
}

// Update item column values
async function updateItem(itemId, args) {
  const token = getToken();
  const columnArgs = parseColumnArgs(args);
  
  if (Object.keys(columnArgs).length === 0) {
    console.error('Error: No columns to update. Use --column col_id=value');
    process.exit(1);
  }
  
  // First get the item to know which board it belongs to
  const getQuery = `
    query ($itemId: [ID!]!) {
      items(ids: $itemId) {
        id
        name
        board {
          id
        }
      }
    }
  `;
  
  const itemData = await graphqlRequest(getQuery, { itemId: [itemId] }, token);
  const item = itemData.items?.[0];
  
  if (!item) {
    console.error(`Item not found: ${itemId}`);
    process.exit(1);
  }
  
  const boardId = item.board.id;
  
  // Build column values JSON
  const columnValues = JSON.stringify(columnArgs);
  
  const mutation = `
    mutation ($boardId: ID!, $itemId: ID!, $columnValues: JSON!) {
      change_multiple_column_values(
        board_id: $boardId
        item_id: $itemId
        column_values: $columnValues
      ) {
        id
        name
        column_values {
          id
          text
          value
        }
      }
    }
  `;
  
  const data = await graphqlRequest(mutation, {
    boardId,
    itemId,
    columnValues
  }, token);
  
  if (args.verbose) {
    console.log(JSON.stringify(data, null, 2));
    return;
  }
  
  console.log('Item updated successfully!\n');
  console.log(`ID: ${data.change_multiple_column_values.id}`);
  console.log(`Name: ${data.change_multiple_column_values.name}`);
  console.log(`Updated columns: ${Object.keys(columnArgs).join(', ')}`);
}

// Move item to different group
async function moveItem(itemId, groupId, args) {
  const token = getToken();
  
  const mutation = `
    mutation ($itemId: ID!, $groupId: String!) {
      move_item_to_group(item_id: $itemId, group_id: $groupId) {
        id
        name
        group {
          id
          title
        }
      }
    }
  `;
  
  const data = await graphqlRequest(mutation, { itemId, groupId }, token);
  
  if (args.verbose) {
    console.log(JSON.stringify(data, null, 2));
    return;
  }
  
  const item = data.move_item_to_group;
  console.log('Item moved successfully!\n');
  console.log(`ID: ${item.id}`);
  console.log(`Name: ${item.name}`);
  console.log(`New Group: ${item.group.title} (${item.group.id})`);
}

// Delete item
async function deleteItem(itemId, args) {
  const token = getToken();
  
  // Get item info first
  const getQuery = `
    query ($itemId: [ID!]!) {
      items(ids: $itemId) {
        id
        name
        board {
          name
        }
      }
    }
  `;
  
  const itemData = await graphqlRequest(getQuery, { itemId: [itemId] }, token);
  const item = itemData.items?.[0];
  
  if (!item) {
    console.error(`Item not found: ${itemId}`);
    process.exit(1);
  }
  
  const confirmed = await confirmDestructiveAction(
    `Delete item: ${item.name}`,
    [
      `ID: ${itemId}`,
      `Board: ${item.board?.name}`,
      'All column values and subitems will be deleted.'
    ],
    args.force
  );
  
  if (!confirmed) return;
  
  const mutation = `
    mutation ($itemId: ID!) {
      delete_item(item_id: $itemId) {
        id
      }
    }
  `;
  
  await graphqlRequest(mutation, { itemId }, token);
  
  console.log('Item deleted successfully.');
}

// Main
async function main() {
  const args = parseArgs(process.argv.slice(2));
  const command = args._[0];
  
  try {
    switch (command) {
      case 'list':
        if (!args._[1]) {
          console.error('Error: Board ID required');
          console.error('Usage: node items.js list <board_id>');
          process.exit(1);
        }
        await listItems(args._[1], args);
        break;
      case 'get':
        if (!args._[1]) {
          console.error('Error: Item ID required');
          console.error('Usage: node items.js get <item_id>');
          process.exit(1);
        }
        await getItem(args._[1], args);
        break;
      case 'create':
        if (!args._[1] || !args._[2]) {
          console.error('Error: Board ID and item name required');
          console.error('Usage: node items.js create <board_id> <name>');
          process.exit(1);
        }
        await createItem(args._[1], args._[2], args);
        break;
      case 'update':
        if (!args._[1]) {
          console.error('Error: Item ID required');
          console.error('Usage: node items.js update <item_id> --column col_id=value');
          process.exit(1);
        }
        await updateItem(args._[1], args);
        break;
      case 'move':
        if (!args._[1] || !args._[2]) {
          console.error('Error: Item ID and group ID required');
          console.error('Usage: node items.js move <item_id> <group_id>');
          process.exit(1);
        }
        await moveItem(args._[1], args._[2], args);
        break;
      case 'delete':
        if (!args._[1]) {
          console.error('Error: Item ID required');
          console.error('Usage: node items.js delete <item_id>');
          process.exit(1);
        }
        await deleteItem(args._[1], args);
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
