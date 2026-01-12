#!/usr/bin/env node

/**
 * Monday.com Columns Management
 * Create, list, update, and delete columns on boards.
 */

import { fileURLToPath } from 'url';
import path from 'path';
import {
  loadEnv, getToken, parseArgs, graphqlRequest,
  confirmDestructiveAction, handleError, showHelp
} from './utils.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
loadEnv(path.join(__dirname, '..'));

// Help documentation
function printHelp() {
  showHelp('Monday.com Columns', {
    'Commands': [
      'list <board_id>             List columns on a board',
      'create <board_id>           Create a new column',
      'update <board_id> <col_id>  Update column title/description',
      'delete <board_id> <col_id>  Delete a column (destructive)',
      'help                        Show this help'
    ],
    'Options': [
      '--title <text>              Column title',
      '--type <type>               Column type (for create)',
      '--description <text>        Column description',
      '--verbose                   Show full API response',
      '--force                     Skip confirmation for destructive actions'
    ],
    'Examples': [
      'node columns.js list 1234567890',
      'node columns.js create 1234567890 --title "Priority" --type status',
      'node columns.js create 1234567890 --title "Due Date" --type date',
      'node columns.js create 1234567890 --title "Notes" --type text',
      'node columns.js update 1234567890 status --title "Task Status"',
      'node columns.js delete 1234567890 text_col'
    ],
    'Column Types': [
      'text          - Text field',
      'long_text     - Long text/notes',
      'numbers       - Number field',
      'status        - Status with labels',
      'date          - Date picker',
      'timeline      - Date range/timeline',
      'person        - User assignment',
      'email         - Email field',
      'phone         - Phone number',
      'link          - URL link',
      'checkbox      - Yes/No checkbox',
      'dropdown      - Dropdown selection',
      'rating        - Star rating',
      'file          - File attachments',
      'color_picker  - Color selection',
      'hour          - Time of day',
      'world_clock   - World clock',
      'location      - Location/address',
      'tags          - Tags column',
      'formula       - Formula column'
    ],
    'Notes': [
      'Column IDs are short strings (e.g., "status", "date4")',
      'Some column types have additional settings',
      'Deleting a column removes all its values'
    ]
  });
}

// List columns on a board
async function listColumns(boardId, args) {
  const token = getToken();
  
  console.log(`Fetching columns for board ${boardId}...\n`);
  
  const query = `
    query ($boardId: [ID!]!) {
      boards(ids: $boardId) {
        id
        name
        columns {
          id
          title
          type
          description
          settings_str
          width
          archived
        }
      }
    }
  `;
  
  const data = await graphqlRequest(query, { boardId: [boardId] }, token);
  
  if (args.verbose) {
    console.log(JSON.stringify(data, null, 2));
    return;
  }
  
  const board = data.boards?.[0];
  if (!board) {
    console.error(`Board not found: ${boardId}`);
    process.exit(1);
  }
  
  const columns = board.columns || [];
  console.log(`Board: ${board.name} (${board.id})`);
  console.log(`Found ${columns.length} columns:\n`);
  
  for (const col of columns) {
    const archivedTag = col.archived ? ' [ARCHIVED]' : '';
    console.log(`- ${col.title}${archivedTag}`);
    console.log(`  ID: ${col.id}`);
    console.log(`  Type: ${col.type}`);
    if (col.description) {
      console.log(`  Description: ${col.description}`);
    }
    if (col.width) {
      console.log(`  Width: ${col.width}px`);
    }
    
    // Parse and show settings for certain column types
    if (col.settings_str && args.verbose) {
      try {
        const settings = JSON.parse(col.settings_str);
        if (settings.labels) {
          console.log(`  Labels: ${Object.values(settings.labels).join(', ')}`);
        }
      } catch {
        // Ignore parsing errors
      }
    }
    console.log('');
  }
}

// Create a column
async function createColumn(boardId, args) {
  const token = getToken();
  const title = args.title;
  const columnType = args.type;
  const description = args.description || null;
  
  if (!title) {
    console.error('Error: --title is required');
    console.error('Usage: node columns.js create <board_id> --title "Title" --type type');
    process.exit(1);
  }
  
  if (!columnType) {
    console.error('Error: --type is required');
    console.error('Usage: node columns.js create <board_id> --title "Title" --type type');
    console.error('Run "node columns.js help" to see available column types');
    process.exit(1);
  }
  
  const mutation = `
    mutation ($boardId: ID!, $title: String!, $columnType: ColumnType!, $description: String) {
      create_column(
        board_id: $boardId
        title: $title
        column_type: $columnType
        description: $description
      ) {
        id
        title
        type
        description
      }
    }
  `;
  
  const data = await graphqlRequest(mutation, {
    boardId,
    title,
    columnType,
    description
  }, token);
  
  if (args.verbose) {
    console.log(JSON.stringify(data, null, 2));
    return;
  }
  
  const col = data.create_column;
  console.log('Column created successfully!\n');
  console.log(`ID: ${col.id}`);
  console.log(`Title: ${col.title}`);
  console.log(`Type: ${col.type}`);
  if (col.description) {
    console.log(`Description: ${col.description}`);
  }
}

// Update a column
async function updateColumn(boardId, columnId, args) {
  const token = getToken();
  const title = args.title;
  const description = args.description;
  
  if (!title && !description) {
    console.error('Error: At least --title or --description required');
    console.error('Usage: node columns.js update <board_id> <column_id> --title "New Title"');
    process.exit(1);
  }
  
  // Monday.com requires separate mutations for title and description
  if (title) {
    const titleMutation = `
      mutation ($boardId: ID!, $columnId: String!, $title: String!) {
        change_column_title(board_id: $boardId, column_id: $columnId, title: $title) {
          id
          title
        }
      }
    `;
    
    await graphqlRequest(titleMutation, { boardId, columnId, title }, token);
  }
  
  if (description) {
    const descMutation = `
      mutation ($boardId: ID!, $columnId: String!, $description: String!) {
        change_column_metadata(
          board_id: $boardId
          column_id: $columnId
          column_property: description
          value: $description
        ) {
          id
          description
        }
      }
    `;
    
    await graphqlRequest(descMutation, { boardId, columnId, description }, token);
  }
  
  // Fetch updated column
  const getQuery = `
    query ($boardId: [ID!]!) {
      boards(ids: $boardId) {
        columns {
          id
          title
          type
          description
        }
      }
    }
  `;
  
  const data = await graphqlRequest(getQuery, { boardId: [boardId] }, token);
  const col = data.boards?.[0]?.columns?.find(c => c.id === columnId);
  
  if (args.verbose) {
    console.log(JSON.stringify(col, null, 2));
    return;
  }
  
  console.log('Column updated successfully!\n');
  console.log(`ID: ${col?.id || columnId}`);
  console.log(`Title: ${col?.title || title}`);
  if (col?.description) {
    console.log(`Description: ${col.description}`);
  }
}

// Delete a column
async function deleteColumn(boardId, columnId, args) {
  const token = getToken();
  
  // Get column info first
  const getQuery = `
    query ($boardId: [ID!]!) {
      boards(ids: $boardId) {
        name
        columns {
          id
          title
          type
        }
      }
    }
  `;
  
  const boardData = await graphqlRequest(getQuery, { boardId: [boardId] }, token);
  const board = boardData.boards?.[0];
  
  if (!board) {
    console.error(`Board not found: ${boardId}`);
    process.exit(1);
  }
  
  const column = board.columns?.find(c => c.id === columnId);
  if (!column) {
    console.error(`Column not found: ${columnId}`);
    process.exit(1);
  }
  
  const confirmed = await confirmDestructiveAction(
    `Delete column: ${column.title}`,
    [
      `ID: ${columnId}`,
      `Board: ${board.name}`,
      `Type: ${column.type}`,
      'All values in this column will be deleted.'
    ],
    args.force
  );
  
  if (!confirmed) return;
  
  const mutation = `
    mutation ($boardId: ID!, $columnId: String!) {
      delete_column(board_id: $boardId, column_id: $columnId) {
        id
      }
    }
  `;
  
  await graphqlRequest(mutation, { boardId, columnId }, token);
  
  console.log('Column deleted successfully.');
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
          console.error('Usage: node columns.js list <board_id>');
          process.exit(1);
        }
        await listColumns(args._[1], args);
        break;
      case 'create':
        if (!args._[1]) {
          console.error('Error: Board ID required');
          console.error('Usage: node columns.js create <board_id> --title "Title" --type type');
          process.exit(1);
        }
        await createColumn(args._[1], args);
        break;
      case 'update':
        if (!args._[1] || !args._[2]) {
          console.error('Error: Board ID and column ID required');
          console.error('Usage: node columns.js update <board_id> <column_id> --title "New Title"');
          process.exit(1);
        }
        await updateColumn(args._[1], args._[2], args);
        break;
      case 'delete':
        if (!args._[1] || !args._[2]) {
          console.error('Error: Board ID and column ID required');
          console.error('Usage: node columns.js delete <board_id> <column_id>');
          process.exit(1);
        }
        await deleteColumn(args._[1], args._[2], args);
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
