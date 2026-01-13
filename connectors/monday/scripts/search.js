#!/usr/bin/env node

/**
 * Monday.com Search
 * Search across items and boards.
 */

import { fileURLToPath } from 'url';
import path from 'path';
import {
  loadEnv, getToken, parseArgs, graphqlRequest,
  handleError, showHelp, parseColumnValue
} from './utils.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
loadEnv(path.join(__dirname, '..'));

// Help documentation
function printHelp() {
  showHelp('Monday.com Search', {
    'Commands': [
      'items <query>               Search items by name',
      'boards <query>              Search boards by name',
      'help                        Show this help'
    ],
    'Options': [
      '--board <id>                Limit item search to specific board',
      '--limit <n>                 Number of results (default: 25)',
      '--verbose                   Show full API response'
    ],
    'Examples': [
      'node search.js items "urgent"',
      'node search.js items "task" --board 1234567890',
      'node search.js items "john" --limit 50',
      'node search.js boards "marketing"',
      'node search.js boards "project"'
    ],
    'Notes': [
      'Search is case-insensitive',
      'Searches item names and board names',
      'Use --board to narrow item search to specific board',
      'Use items.js or boards.js to get full details after search'
    ]
  });
}

// Search items by name
async function searchItems(queryText, args) {
  const token = getToken();
  const limit = parseInt(args.limit) || 25;
  const boardId = args.board || null;
  
  console.log(`Searching items for "${queryText}"...\n`);
  
  // Build query - if board specified, search within that board
  let query;
  let variables;
  
  if (boardId) {
    query = `
      query ($boardId: [ID!]!, $limit: Int!) {
        boards(ids: $boardId) {
          name
          items_page(limit: $limit, query_params: {rules: [{column_id: "name", compare_value: ["${queryText}"]}]}) {
            items {
              id
              name
              state
              group {
                id
                title
              }
              board {
                id
                name
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
    variables = { boardId: [boardId], limit };
  } else {
    // Use items_page_by_column_values for broader search
    query = `
      query ($limit: Int!) {
        items_page_by_column_values(
          limit: $limit
          columns: [{column_id: "name", column_values: ["${queryText}"]}]
        ) {
          cursor
          items {
            id
            name
            state
            group {
              id
              title
            }
            board {
              id
              name
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
    `;
    variables = { limit };
  }
  
  const data = await graphqlRequest(query, variables, token);
  
  if (args.verbose) {
    console.log(JSON.stringify(data, null, 2));
    return;
  }
  
  // Extract items from response structure
  let items = [];
  if (boardId && data.boards?.[0]) {
    items = data.boards[0].items_page?.items || [];
    console.log(`Board: ${data.boards[0].name}`);
  } else if (data.items_page_by_column_values) {
    items = data.items_page_by_column_values.items || [];
  }
  
  console.log(`Found ${items.length} items:\n`);
  
  for (const item of items) {
    console.log(`- ${item.name}`);
    console.log(`  ID: ${item.id}`);
    console.log(`  Board: ${item.board?.name || 'N/A'} (${item.board?.id || 'N/A'})`);
    if (item.group) {
      console.log(`  Group: ${item.group.title}`);
    }
    console.log(`  State: ${item.state}`);
    
    // Show key column values
    const keyColumns = item.column_values?.slice(0, 3) || [];
    for (const col of keyColumns) {
      const displayValue = parseColumnValue(col);
      if (displayValue) {
        console.log(`  ${col.id}: ${displayValue}`);
      }
    }
    console.log('');
  }
}

// Search boards by name
async function searchBoards(queryText, args) {
  const token = getToken();
  const limit = parseInt(args.limit) || 25;
  
  console.log(`Searching boards for "${queryText}"...\n`);
  
  // Monday.com doesn't have a direct board search, so we list and filter
  const query = `
    query ($limit: Int!) {
      boards(limit: $limit) {
        id
        name
        description
        state
        board_kind
        items_count
        workspace {
          id
          name
        }
      }
    }
  `;
  
  const data = await graphqlRequest(query, { limit: 500 }, token);
  
  if (args.verbose) {
    console.log(JSON.stringify(data, null, 2));
    return;
  }
  
  const allBoards = data.boards || [];
  const searchLower = queryText.toLowerCase();
  const matchedBoards = allBoards.filter(b => 
    b.name.toLowerCase().includes(searchLower) ||
    (b.description && b.description.toLowerCase().includes(searchLower))
  ).slice(0, limit);
  
  console.log(`Found ${matchedBoards.length} boards:\n`);
  
  for (const board of matchedBoards) {
    console.log(`- ${board.name}`);
    console.log(`  ID: ${board.id}`);
    console.log(`  Items: ${board.items_count}`);
    console.log(`  Type: ${board.board_kind}`);
    if (board.workspace) {
      console.log(`  Workspace: ${board.workspace.name}`);
    }
    if (board.description) {
      console.log(`  Description: ${board.description.substring(0, 80)}${board.description.length > 80 ? '...' : ''}`);
    }
    console.log('');
  }
}

// Main
async function main() {
  const args = parseArgs(process.argv.slice(2));
  const command = args._[0];
  
  try {
    switch (command) {
      case 'items':
        if (!args._[1]) {
          console.error('Error: Search query required');
          console.error('Usage: node search.js items <query>');
          process.exit(1);
        }
        await searchItems(args._.slice(1).join(' '), args);
        break;
      case 'boards':
        if (!args._[1]) {
          console.error('Error: Search query required');
          console.error('Usage: node search.js boards <query>');
          process.exit(1);
        }
        await searchBoards(args._.slice(1).join(' '), args);
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
