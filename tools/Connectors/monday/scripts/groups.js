#!/usr/bin/env node

/**
 * Monday.com Groups Management
 * Create, list, and manage groups within boards.
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
  showHelp('Monday.com Groups', {
    'Commands': [
      'list <board_id>             List groups on a board',
      'create <board_id> <name>    Create a new group',
      'rename <board_id> <group_id> <name>   Rename a group',
      'delete <board_id> <group_id>          Delete a group (destructive)',
      'archive <board_id> <group_id>         Archive a group',
      'help                        Show this help'
    ],
    'Options': [
      '--color <color>             Color for new group (optional)',
      '--position <position>       Position: top or after_group_id',
      '--verbose                   Show full API response',
      '--force                     Skip confirmation for destructive actions'
    ],
    'Examples': [
      'node groups.js list 1234567890',
      'node groups.js create 1234567890 "In Progress"',
      'node groups.js create 1234567890 "Done" --color #00c875',
      'node groups.js rename 1234567890 topics "Backlog"',
      'node groups.js archive 1234567890 new_group12345',
      'node groups.js delete 1234567890 new_group12345'
    ],
    'Available Colors': [
      '#ff5ac4 (pink)', '#ff158a (magenta)', '#ff642e (orange)',
      '#fdab3d (amber)', '#ffcb00 (yellow)', '#cab641 (olive)',
      '#9cd326 (lime)', '#00c875 (green)', '#037f4c (dark green)',
      '#0086c0 (teal)', '#579bfc (blue)', '#66ccff (light blue)',
      '#a25ddc (purple)', '#7f5347 (brown)', '#c4c4c4 (gray)'
    ],
    'Notes': [
      'Group IDs are strings like "topics" or "new_group12345"',
      'Use "boards.js get <id> --groups" to see existing groups',
      'Deleting a group moves items to first remaining group'
    ]
  });
}

// List groups on a board
async function listGroups(boardId, args) {
  const token = getToken();
  
  console.log(`Fetching groups from board ${boardId}...\n`);
  
  const query = `
    query ($boardId: [ID!]!) {
      boards(ids: $boardId) {
        name
        groups {
          id
          title
          color
          position
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
  
  const groups = board.groups || [];
  console.log(`Board: ${board.name}`);
  console.log(`Found ${groups.length} groups:\n`);
  
  for (const group of groups) {
    const archivedTag = group.archived ? ' [ARCHIVED]' : '';
    console.log(`- ${group.title}${archivedTag}`);
    console.log(`  ID: ${group.id}`);
    console.log(`  Color: ${group.color}`);
    console.log(`  Position: ${group.position}`);
    console.log('');
  }
}

// Create a new group
async function createGroup(boardId, groupName, args) {
  const token = getToken();
  const color = args.color || null;
  const position = args.position || null;
  
  // Build mutation
  let positionArg = '';
  if (position === 'top') {
    positionArg = ', position_relative_method: before_at';
  } else if (position) {
    positionArg = `, relative_to: "${position}", position_relative_method: after_at`;
  }
  
  const mutation = `
    mutation ($boardId: ID!, $groupName: String!, $groupColor: String) {
      create_group(
        board_id: $boardId
        group_name: $groupName
        group_color: $groupColor
        ${positionArg}
      ) {
        id
        title
        color
        position
      }
    }
  `;
  
  const data = await graphqlRequest(mutation, {
    boardId,
    groupName,
    groupColor: color
  }, token);
  
  if (args.verbose) {
    console.log(JSON.stringify(data, null, 2));
    return;
  }
  
  const group = data.create_group;
  console.log('Group created successfully!\n');
  console.log(`ID: ${group.id}`);
  console.log(`Title: ${group.title}`);
  console.log(`Color: ${group.color}`);
  console.log(`Position: ${group.position}`);
}

// Rename a group
async function renameGroup(boardId, groupId, newName, args) {
  const token = getToken();
  
  const mutation = `
    mutation ($boardId: ID!, $groupId: String!, $newName: String!) {
      update_group(
        board_id: $boardId
        group_id: $groupId
        group_attribute: title
        new_value: $newName
      ) {
        id
        title
      }
    }
  `;
  
  const data = await graphqlRequest(mutation, {
    boardId,
    groupId,
    newName
  }, token);
  
  if (args.verbose) {
    console.log(JSON.stringify(data, null, 2));
    return;
  }
  
  console.log('Group renamed successfully!\n');
  console.log(`ID: ${data.update_group.id}`);
  console.log(`New Title: ${data.update_group.title}`);
}

// Archive a group
async function archiveGroup(boardId, groupId, args) {
  const token = getToken();
  
  const mutation = `
    mutation ($boardId: ID!, $groupId: String!) {
      archive_group(board_id: $boardId, group_id: $groupId) {
        id
        title
        archived
      }
    }
  `;
  
  const data = await graphqlRequest(mutation, { boardId, groupId }, token);
  
  if (args.verbose) {
    console.log(JSON.stringify(data, null, 2));
    return;
  }
  
  console.log('Group archived successfully!\n');
  console.log(`ID: ${data.archive_group.id}`);
  console.log(`Title: ${data.archive_group.title}`);
}

// Delete a group
async function deleteGroup(boardId, groupId, args) {
  const token = getToken();
  
  // Get group info first
  const getQuery = `
    query ($boardId: [ID!]!) {
      boards(ids: $boardId) {
        name
        groups {
          id
          title
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
  
  const group = board.groups?.find(g => g.id === groupId);
  if (!group) {
    console.error(`Group not found: ${groupId}`);
    process.exit(1);
  }
  
  const confirmed = await confirmDestructiveAction(
    `Delete group: ${group.title}`,
    [
      `ID: ${groupId}`,
      `Board: ${board.name}`,
      'Items in this group will be moved to another group.'
    ],
    args.force
  );
  
  if (!confirmed) return;
  
  const mutation = `
    mutation ($boardId: ID!, $groupId: String!) {
      delete_group(board_id: $boardId, group_id: $groupId) {
        id
        deleted
      }
    }
  `;
  
  await graphqlRequest(mutation, { boardId, groupId }, token);
  
  console.log('Group deleted successfully.');
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
          console.error('Usage: node groups.js list <board_id>');
          process.exit(1);
        }
        await listGroups(args._[1], args);
        break;
      case 'create':
        if (!args._[1] || !args._[2]) {
          console.error('Error: Board ID and group name required');
          console.error('Usage: node groups.js create <board_id> <name>');
          process.exit(1);
        }
        await createGroup(args._[1], args._[2], args);
        break;
      case 'rename':
        if (!args._[1] || !args._[2] || !args._[3]) {
          console.error('Error: Board ID, group ID, and new name required');
          console.error('Usage: node groups.js rename <board_id> <group_id> <new_name>');
          process.exit(1);
        }
        await renameGroup(args._[1], args._[2], args._[3], args);
        break;
      case 'archive':
        if (!args._[1] || !args._[2]) {
          console.error('Error: Board ID and group ID required');
          console.error('Usage: node groups.js archive <board_id> <group_id>');
          process.exit(1);
        }
        await archiveGroup(args._[1], args._[2], args);
        break;
      case 'delete':
        if (!args._[1] || !args._[2]) {
          console.error('Error: Board ID and group ID required');
          console.error('Usage: node groups.js delete <board_id> <group_id>');
          process.exit(1);
        }
        await deleteGroup(args._[1], args._[2], args);
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
