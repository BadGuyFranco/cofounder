#!/usr/bin/env node

/**
 * Monday.com Boards Management
 * List, inspect, create, duplicate, and delete boards.
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
  showHelp('Monday.com Boards', {
    'Commands': [
      'list                        List all boards',
      'get <id>                    Get board details',
      'create <name>               Create a new board',
      'duplicate <id>              Duplicate an existing board',
      'archive <id>                Archive a board',
      'delete <id>                 Delete a board (destructive)',
      'help                        Show this help'
    ],
    'Options': [
      '--columns                   Include column definitions (get)',
      '--groups                    Include groups (get)',
      '--items                     Include items (get, use with caution)',
      '--workspace <id>            Workspace ID for new board',
      '--kind <type>               Board kind: public, private, share',
      '--folder <id>               Folder ID to place board in',
      '--duplicate-type <type>     duplicate_board_with_structure or duplicate_board_with_pulses',
      '--limit <n>                 Number of boards/items (default: 50)',
      '--verbose                   Show full API response',
      '--force                     Skip confirmation for destructive actions'
    ],
    'Examples': [
      'node boards.js list',
      'node boards.js get 1234567890 --columns --groups',
      'node boards.js create "Project Board"',
      'node boards.js create "Private Board" --kind private',
      'node boards.js create "Team Board" --workspace 12345',
      'node boards.js duplicate 1234567890',
      'node boards.js duplicate 1234567890 --duplicate-type duplicate_board_with_pulses',
      'node boards.js archive 1234567890',
      'node boards.js delete 1234567890'
    ],
    'Board Kinds': [
      'public   - Visible to all team members',
      'private  - Only visible to subscribers',
      'share    - Shareable outside the account'
    ],
    'Duplicate Types': [
      'duplicate_board_with_structure - Structure only (default)',
      'duplicate_board_with_pulses    - Structure and items'
    ]
  });
}

// List all boards
async function listBoards(args) {
  const token = getToken();
  const limit = parseInt(args.limit) || 50;
  
  console.log('Fetching boards...\n');
  
  const query = `
    query ($limit: Int!) {
      boards(limit: $limit) {
        id
        name
        description
        state
        board_kind
        items_count
        permissions
        updated_at
        workspace {
          id
          name
        }
      }
    }
  `;
  
  const data = await graphqlRequest(query, { limit }, token);
  
  if (args.verbose) {
    console.log(JSON.stringify(data, null, 2));
    return;
  }
  
  const boards = data.boards || [];
  console.log(`Found ${boards.length} boards:\n`);
  
  for (const board of boards) {
    console.log(`- ${board.name}`);
    console.log(`  ID: ${board.id}`);
    console.log(`  Items: ${board.items_count}`);
    console.log(`  Type: ${board.board_kind}`);
    if (board.workspace) {
      console.log(`  Workspace: ${board.workspace.name}`);
    }
    if (board.description) {
      console.log(`  Description: ${board.description.substring(0, 100)}${board.description.length > 100 ? '...' : ''}`);
    }
    console.log('');
  }
}

// Get single board with details
async function getBoard(boardId, args) {
  const token = getToken();
  const includeColumns = args.columns || false;
  const includeGroups = args.groups || false;
  const includeItems = args.items || false;
  const itemLimit = parseInt(args.limit) || 25;
  
  let columnsQuery = '';
  let groupsQuery = '';
  let itemsQuery = '';
  
  if (includeColumns) {
    columnsQuery = `
      columns {
        id
        title
        type
        settings_str
      }
    `;
  }
  
  if (includeGroups) {
    groupsQuery = `
      groups {
        id
        title
        color
        position
      }
    `;
  }
  
  if (includeItems) {
    itemsQuery = `
      items_page(limit: ${itemLimit}) {
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
    `;
  }
  
  const query = `
    query ($boardId: [ID!]!) {
      boards(ids: $boardId) {
        id
        name
        description
        state
        board_kind
        items_count
        permissions
        updated_at
        workspace {
          id
          name
        }
        ${columnsQuery}
        ${groupsQuery}
        ${itemsQuery}
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
  
  console.log(`Board: ${board.name}\n`);
  console.log(`ID: ${board.id}`);
  console.log(`Items: ${board.items_count}`);
  console.log(`Type: ${board.board_kind}`);
  console.log(`State: ${board.state}`);
  if (board.workspace) {
    console.log(`Workspace: ${board.workspace.name} (${board.workspace.id})`);
  }
  if (board.description) {
    console.log(`Description: ${board.description}`);
  }
  console.log(`Updated: ${board.updated_at}`);
  
  if (includeColumns && board.columns) {
    console.log('\n--- Columns ---');
    for (const col of board.columns) {
      console.log(`  ${col.id}: ${col.title} (${col.type})`);
    }
  }
  
  if (includeGroups && board.groups) {
    console.log('\n--- Groups ---');
    for (const group of board.groups) {
      console.log(`  ${group.id}: ${group.title}`);
    }
  }
  
  if (includeItems && board.items_page?.items) {
    const items = board.items_page.items;
    console.log(`\n--- Items (${items.length}${board.items_page.cursor ? '+' : ''}) ---`);
    for (const item of items) {
      console.log(`\n  ${item.name}`);
      console.log(`    ID: ${item.id}`);
      if (item.group) {
        console.log(`    Group: ${item.group.title}`);
      }
      
      if (item.column_values) {
        for (const col of item.column_values) {
          const displayValue = parseColumnValue(col);
          if (displayValue) {
            console.log(`    ${col.id}: ${displayValue}`);
          }
        }
      }
    }
    
    if (board.items_page.cursor) {
      console.log(`\n  ... more items available (use --limit to fetch more)`);
    }
  }
}

// Create a new board
async function createBoard(boardName, args) {
  const token = getToken();
  const kind = args.kind || 'public';
  const workspaceId = args.workspace || null;
  const folderId = args.folder || null;
  
  const mutation = `
    mutation ($boardName: String!, $boardKind: BoardKind!, $workspaceId: ID, $folderId: ID) {
      create_board(
        board_name: $boardName
        board_kind: $boardKind
        workspace_id: $workspaceId
        folder_id: $folderId
      ) {
        id
        name
        board_kind
        workspace {
          id
          name
        }
      }
    }
  `;
  
  const data = await graphqlRequest(mutation, {
    boardName,
    boardKind: kind,
    workspaceId: workspaceId ? parseInt(workspaceId) : null,
    folderId: folderId ? parseInt(folderId) : null
  }, token);
  
  if (args.verbose) {
    console.log(JSON.stringify(data, null, 2));
    return;
  }
  
  const board = data.create_board;
  console.log('Board created successfully!\n');
  console.log(`ID: ${board.id}`);
  console.log(`Name: ${board.name}`);
  console.log(`Kind: ${board.board_kind}`);
  if (board.workspace) {
    console.log(`Workspace: ${board.workspace.name}`);
  }
}

// Duplicate a board
async function duplicateBoard(boardId, args) {
  const token = getToken();
  const duplicateType = args['duplicate-type'] || 'duplicate_board_with_structure';
  const workspaceId = args.workspace || null;
  const folderId = args.folder || null;
  
  // Get original board name
  const getQuery = `
    query ($boardId: [ID!]!) {
      boards(ids: $boardId) {
        name
      }
    }
  `;
  
  const boardData = await graphqlRequest(getQuery, { boardId: [boardId] }, token);
  const originalName = boardData.boards?.[0]?.name || 'Board';
  
  const mutation = `
    mutation ($boardId: ID!, $duplicateType: DuplicateBoardType!, $boardName: String, $workspaceId: ID, $folderId: ID) {
      duplicate_board(
        board_id: $boardId
        duplicate_type: $duplicateType
        board_name: $boardName
        workspace_id: $workspaceId
        folder_id: $folderId
      ) {
        board {
          id
          name
          board_kind
        }
      }
    }
  `;
  
  const data = await graphqlRequest(mutation, {
    boardId,
    duplicateType,
    boardName: `${originalName} (Copy)`,
    workspaceId: workspaceId ? parseInt(workspaceId) : null,
    folderId: folderId ? parseInt(folderId) : null
  }, token);
  
  if (args.verbose) {
    console.log(JSON.stringify(data, null, 2));
    return;
  }
  
  const board = data.duplicate_board.board;
  console.log('Board duplicated successfully!\n');
  console.log(`New Board ID: ${board.id}`);
  console.log(`Name: ${board.name}`);
  console.log(`Kind: ${board.board_kind}`);
}

// Archive a board
async function archiveBoard(boardId, args) {
  const token = getToken();
  
  // Get board info
  const getQuery = `
    query ($boardId: [ID!]!) {
      boards(ids: $boardId) {
        name
        items_count
      }
    }
  `;
  
  const boardData = await graphqlRequest(getQuery, { boardId: [boardId] }, token);
  const board = boardData.boards?.[0];
  
  if (!board) {
    console.error(`Board not found: ${boardId}`);
    process.exit(1);
  }
  
  const mutation = `
    mutation ($boardId: ID!) {
      archive_board(board_id: $boardId) {
        id
        state
      }
    }
  `;
  
  const data = await graphqlRequest(mutation, { boardId }, token);
  
  if (args.verbose) {
    console.log(JSON.stringify(data, null, 2));
    return;
  }
  
  console.log('Board archived successfully!\n');
  console.log(`ID: ${data.archive_board.id}`);
  console.log(`Name: ${board.name}`);
  console.log(`State: ${data.archive_board.state}`);
}

// Delete a board
async function deleteBoard(boardId, args) {
  const token = getToken();
  
  // Get board info
  const getQuery = `
    query ($boardId: [ID!]!) {
      boards(ids: $boardId) {
        name
        items_count
      }
    }
  `;
  
  const boardData = await graphqlRequest(getQuery, { boardId: [boardId] }, token);
  const board = boardData.boards?.[0];
  
  if (!board) {
    console.error(`Board not found: ${boardId}`);
    process.exit(1);
  }
  
  const confirmed = await confirmDestructiveAction(
    `Delete board: ${board.name}`,
    [
      `ID: ${boardId}`,
      `Items: ${board.items_count}`,
      'All items, groups, and data will be permanently deleted.'
    ],
    args.force
  );
  
  if (!confirmed) return;
  
  const mutation = `
    mutation ($boardId: ID!) {
      delete_board(board_id: $boardId) {
        id
      }
    }
  `;
  
  await graphqlRequest(mutation, { boardId }, token);
  
  console.log('Board deleted successfully.');
}

// Main
async function main() {
  const args = parseArgs(process.argv.slice(2));
  const command = args._[0];
  
  try {
    switch (command) {
      case 'list':
        await listBoards(args);
        break;
      case 'get':
        if (!args._[1]) {
          console.error('Error: Board ID required');
          console.error('Usage: node boards.js get <id>');
          process.exit(1);
        }
        await getBoard(args._[1], args);
        break;
      case 'create':
        if (!args._[1]) {
          console.error('Error: Board name required');
          console.error('Usage: node boards.js create <name>');
          process.exit(1);
        }
        await createBoard(args._[1], args);
        break;
      case 'duplicate':
        if (!args._[1]) {
          console.error('Error: Board ID required');
          console.error('Usage: node boards.js duplicate <id>');
          process.exit(1);
        }
        await duplicateBoard(args._[1], args);
        break;
      case 'archive':
        if (!args._[1]) {
          console.error('Error: Board ID required');
          console.error('Usage: node boards.js archive <id>');
          process.exit(1);
        }
        await archiveBoard(args._[1], args);
        break;
      case 'delete':
        if (!args._[1]) {
          console.error('Error: Board ID required');
          console.error('Usage: node boards.js delete <id>');
          process.exit(1);
        }
        await deleteBoard(args._[1], args);
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
