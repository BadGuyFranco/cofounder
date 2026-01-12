#!/usr/bin/env node

/**
 * Monday.com Subitems Management
 * Create, read, update, delete subitems (nested items under parent items).
 */

import { fileURLToPath } from 'url';
import path from 'path';
import {
  loadEnv, getToken, parseArgs, graphqlRequest,
  confirmDestructiveAction, handleError, showHelp, parseColumnValue
} from './utils.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
loadEnv(path.join(__dirname, '..'));

// Help documentation
function printHelp() {
  showHelp('Monday.com Subitems', {
    'Commands': [
      'list <parent_item_id>       List subitems of an item',
      'get <subitem_id>            Get subitem details',
      'create <parent_id> <name>   Create a new subitem',
      'update <subitem_id>         Update subitem column values',
      'delete <subitem_id>         Delete a subitem (destructive)',
      'help                        Show this help'
    ],
    'Options': [
      '--column <col_id>=<value>   Set column value (repeatable)',
      '--verbose                   Show full API response',
      '--force                     Skip confirmation for destructive actions'
    ],
    'Examples': [
      'node subitems.js list 9876543210',
      'node subitems.js get 1234567890',
      'node subitems.js create 9876543210 "Sub-task"',
      'node subitems.js create 9876543210 "Sub-task" --column status="Done"',
      'node subitems.js update 1234567890 --column status="In Progress"',
      'node subitems.js delete 1234567890'
    ],
    'Notes': [
      'Subitems are nested items under a parent item',
      'Each parent item can have multiple subitems',
      'Subitems have their own column structure',
      'Use item ID (not board ID) as parent'
    ]
  });
}

// Parse --column arguments
function parseColumnArgs() {
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

// List subitems of a parent item
async function listSubitems(parentItemId, args) {
  const token = getToken();
  
  console.log(`Fetching subitems for item ${parentItemId}...\n`);
  
  const query = `
    query ($itemId: [ID!]!) {
      items(ids: $itemId) {
        id
        name
        subitems {
          id
          name
          state
          created_at
          updated_at
          column_values {
            id
            text
            value
            type
          }
        }
      }
    }
  `;
  
  const data = await graphqlRequest(query, { itemId: [parentItemId] }, token);
  
  if (args.verbose) {
    console.log(JSON.stringify(data, null, 2));
    return;
  }
  
  const item = data.items?.[0];
  if (!item) {
    console.error(`Item not found: ${parentItemId}`);
    process.exit(1);
  }
  
  const subitems = item.subitems || [];
  console.log(`Parent Item: ${item.name} (${item.id})`);
  console.log(`Found ${subitems.length} subitems:\n`);
  
  for (const subitem of subitems) {
    console.log(`- ${subitem.name}`);
    console.log(`  ID: ${subitem.id}`);
    console.log(`  State: ${subitem.state}`);
    
    const keyColumns = subitem.column_values?.slice(0, 5) || [];
    for (const col of keyColumns) {
      const displayValue = parseColumnValue(col);
      if (displayValue) {
        console.log(`  ${col.id}: ${displayValue}`);
      }
    }
    console.log('');
  }
}

// Get single subitem
async function getSubitem(subitemId, args) {
  const token = getToken();
  
  const query = `
    query ($itemId: [ID!]!) {
      items(ids: $itemId) {
        id
        name
        state
        created_at
        updated_at
        parent_item {
          id
          name
        }
        board {
          id
          name
        }
        column_values {
          id
          title
          text
          value
          type
        }
      }
    }
  `;
  
  const data = await graphqlRequest(query, { itemId: [subitemId] }, token);
  
  if (args.verbose) {
    console.log(JSON.stringify(data, null, 2));
    return;
  }
  
  const subitem = data.items?.[0];
  if (!subitem) {
    console.error(`Subitem not found: ${subitemId}`);
    process.exit(1);
  }
  
  console.log(`Subitem: ${subitem.name}\n`);
  console.log(`ID: ${subitem.id}`);
  console.log(`State: ${subitem.state}`);
  if (subitem.parent_item) {
    console.log(`Parent Item: ${subitem.parent_item.name} (${subitem.parent_item.id})`);
  }
  if (subitem.board) {
    console.log(`Board: ${subitem.board.name} (${subitem.board.id})`);
  }
  console.log(`Created: ${subitem.created_at}`);
  console.log(`Updated: ${subitem.updated_at}`);
  
  if (subitem.column_values?.length > 0) {
    console.log('\n--- Column Values ---');
    for (const col of subitem.column_values) {
      const displayValue = parseColumnValue(col);
      console.log(`  ${col.id} (${col.title}): ${displayValue || '(empty)'}`);
    }
  }
}

// Create a subitem
async function createSubitem(parentItemId, subitemName, args) {
  const token = getToken();
  const columnArgs = parseColumnArgs();
  
  let columnValues = null;
  if (Object.keys(columnArgs).length > 0) {
    columnValues = JSON.stringify(columnArgs);
  }
  
  const mutation = `
    mutation ($parentItemId: ID!, $subitemName: String!, $columnValues: JSON) {
      create_subitem(
        parent_item_id: $parentItemId
        item_name: $subitemName
        column_values: $columnValues
      ) {
        id
        name
        parent_item {
          id
          name
        }
      }
    }
  `;
  
  const data = await graphqlRequest(mutation, {
    parentItemId,
    subitemName,
    columnValues
  }, token);
  
  if (args.verbose) {
    console.log(JSON.stringify(data, null, 2));
    return;
  }
  
  const subitem = data.create_subitem;
  console.log('Subitem created successfully!\n');
  console.log(`ID: ${subitem.id}`);
  console.log(`Name: ${subitem.name}`);
  if (subitem.parent_item) {
    console.log(`Parent: ${subitem.parent_item.name} (${subitem.parent_item.id})`);
  }
}

// Update subitem column values
async function updateSubitem(subitemId, args) {
  const token = getToken();
  const columnArgs = parseColumnArgs();
  
  if (Object.keys(columnArgs).length === 0) {
    console.error('Error: No columns to update. Use --column col_id=value');
    process.exit(1);
  }
  
  // Get the subitem's board
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
  
  const itemData = await graphqlRequest(getQuery, { itemId: [subitemId] }, token);
  const subitem = itemData.items?.[0];
  
  if (!subitem) {
    console.error(`Subitem not found: ${subitemId}`);
    process.exit(1);
  }
  
  const boardId = subitem.board.id;
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
      }
    }
  `;
  
  const data = await graphqlRequest(mutation, {
    boardId,
    itemId: subitemId,
    columnValues
  }, token);
  
  if (args.verbose) {
    console.log(JSON.stringify(data, null, 2));
    return;
  }
  
  console.log('Subitem updated successfully!\n');
  console.log(`ID: ${data.change_multiple_column_values.id}`);
  console.log(`Name: ${data.change_multiple_column_values.name}`);
  console.log(`Updated columns: ${Object.keys(columnArgs).join(', ')}`);
}

// Delete a subitem
async function deleteSubitem(subitemId, args) {
  const token = getToken();
  
  // Get subitem info
  const getQuery = `
    query ($itemId: [ID!]!) {
      items(ids: $itemId) {
        id
        name
        parent_item {
          id
          name
        }
      }
    }
  `;
  
  const itemData = await graphqlRequest(getQuery, { itemId: [subitemId] }, token);
  const subitem = itemData.items?.[0];
  
  if (!subitem) {
    console.error(`Subitem not found: ${subitemId}`);
    process.exit(1);
  }
  
  const confirmed = await confirmDestructiveAction(
    `Delete subitem: ${subitem.name}`,
    [
      `ID: ${subitemId}`,
      `Parent: ${subitem.parent_item?.name || 'Unknown'}`,
      'All column values will be deleted.'
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
  
  await graphqlRequest(mutation, { itemId: subitemId }, token);
  
  console.log('Subitem deleted successfully.');
}

// Main
async function main() {
  const args = parseArgs(process.argv.slice(2));
  const command = args._[0];
  
  try {
    switch (command) {
      case 'list':
        if (!args._[1]) {
          console.error('Error: Parent item ID required');
          console.error('Usage: node subitems.js list <parent_item_id>');
          process.exit(1);
        }
        await listSubitems(args._[1], args);
        break;
      case 'get':
        if (!args._[1]) {
          console.error('Error: Subitem ID required');
          console.error('Usage: node subitems.js get <subitem_id>');
          process.exit(1);
        }
        await getSubitem(args._[1], args);
        break;
      case 'create':
        if (!args._[1] || !args._[2]) {
          console.error('Error: Parent item ID and subitem name required');
          console.error('Usage: node subitems.js create <parent_id> <name>');
          process.exit(1);
        }
        await createSubitem(args._[1], args._[2], args);
        break;
      case 'update':
        if (!args._[1]) {
          console.error('Error: Subitem ID required');
          console.error('Usage: node subitems.js update <subitem_id> --column col_id=value');
          process.exit(1);
        }
        await updateSubitem(args._[1], args);
        break;
      case 'delete':
        if (!args._[1]) {
          console.error('Error: Subitem ID required');
          console.error('Usage: node subitems.js delete <subitem_id>');
          process.exit(1);
        }
        await deleteSubitem(args._[1], args);
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
