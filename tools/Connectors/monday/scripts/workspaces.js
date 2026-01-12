#!/usr/bin/env node

/**
 * Monday.com Workspaces Management
 * List and manage workspaces.
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
  showHelp('Monday.com Workspaces', {
    'Commands': [
      'list                        List all workspaces',
      'get <id>                    Get workspace details',
      'create <name>               Create a new workspace',
      'delete <id>                 Delete a workspace (destructive)',
      'help                        Show this help'
    ],
    'Options': [
      '--kind <type>               Workspace kind: open or closed',
      '--description <text>        Description for new workspace',
      '--limit <n>                 Number of workspaces (default: 50)',
      '--verbose                   Show full API response',
      '--force                     Skip confirmation for destructive actions'
    ],
    'Examples': [
      'node workspaces.js list',
      'node workspaces.js get 12345',
      'node workspaces.js create "Marketing"',
      'node workspaces.js create "Private Team" --kind closed',
      'node workspaces.js create "Engineering" --description "Engineering team workspace"',
      'node workspaces.js delete 12345'
    ],
    'Workspace Kinds': [
      'open   - Visible to all team members (default)',
      'closed - Only visible to workspace members'
    ],
    'Notes': [
      'Workspace IDs are numeric',
      'Deleting a workspace deletes all its boards',
      '"Main workspace" is the default workspace'
    ]
  });
}

// List all workspaces
async function listWorkspaces(args) {
  const token = getToken();
  const limit = parseInt(args.limit) || 50;
  
  console.log('Fetching workspaces...\n');
  
  const query = `
    query ($limit: Int!) {
      workspaces(limit: $limit) {
        id
        name
        kind
        description
        state
        created_at
        owners_subscribers {
          id
          name
        }
        teams_subscribers {
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
  
  const workspaces = data.workspaces || [];
  console.log(`Found ${workspaces.length} workspaces:\n`);
  
  for (const ws of workspaces) {
    console.log(`- ${ws.name}`);
    console.log(`  ID: ${ws.id}`);
    console.log(`  Kind: ${ws.kind}`);
    console.log(`  State: ${ws.state}`);
    if (ws.description) {
      console.log(`  Description: ${ws.description.substring(0, 100)}${ws.description.length > 100 ? '...' : ''}`);
    }
    if (ws.owners_subscribers?.length > 0) {
      console.log(`  Owners: ${ws.owners_subscribers.map(o => o.name).join(', ')}`);
    }
    console.log('');
  }
}

// Get single workspace
async function getWorkspace(workspaceId, args) {
  const token = getToken();
  
  const query = `
    query ($workspaceId: [ID!]!) {
      workspaces(ids: $workspaceId) {
        id
        name
        kind
        description
        state
        created_at
        owners_subscribers {
          id
          name
          email
        }
        users_subscribers {
          id
          name
          email
        }
        teams_subscribers {
          id
          name
        }
      }
    }
  `;
  
  const data = await graphqlRequest(query, { workspaceId: [parseInt(workspaceId)] }, token);
  
  if (args.verbose) {
    console.log(JSON.stringify(data, null, 2));
    return;
  }
  
  const ws = data.workspaces?.[0];
  if (!ws) {
    console.error(`Workspace not found: ${workspaceId}`);
    process.exit(1);
  }
  
  console.log(`Workspace: ${ws.name}\n`);
  console.log(`ID: ${ws.id}`);
  console.log(`Kind: ${ws.kind}`);
  console.log(`State: ${ws.state}`);
  if (ws.description) {
    console.log(`Description: ${ws.description}`);
  }
  console.log(`Created: ${formatDate(ws.created_at)}`);
  
  if (ws.owners_subscribers?.length > 0) {
    console.log('\n--- Owners ---');
    for (const owner of ws.owners_subscribers) {
      console.log(`  ${owner.name} (${owner.email})`);
    }
  }
  
  if (ws.users_subscribers?.length > 0) {
    console.log('\n--- Members ---');
    for (const user of ws.users_subscribers) {
      console.log(`  ${user.name} (${user.email})`);
    }
  }
  
  if (ws.teams_subscribers?.length > 0) {
    console.log('\n--- Teams ---');
    for (const team of ws.teams_subscribers) {
      console.log(`  ${team.name} (${team.id})`);
    }
  }
}

// Create a workspace
async function createWorkspace(workspaceName, args) {
  const token = getToken();
  const kind = args.kind || 'open';
  const description = args.description || null;
  
  const mutation = `
    mutation ($workspaceName: String!, $workspaceKind: WorkspaceKind!, $description: String) {
      create_workspace(
        name: $workspaceName
        kind: $workspaceKind
        description: $description
      ) {
        id
        name
        kind
        description
      }
    }
  `;
  
  const data = await graphqlRequest(mutation, {
    workspaceName,
    workspaceKind: kind,
    description
  }, token);
  
  if (args.verbose) {
    console.log(JSON.stringify(data, null, 2));
    return;
  }
  
  const ws = data.create_workspace;
  console.log('Workspace created successfully!\n');
  console.log(`ID: ${ws.id}`);
  console.log(`Name: ${ws.name}`);
  console.log(`Kind: ${ws.kind}`);
  if (ws.description) {
    console.log(`Description: ${ws.description}`);
  }
}

// Delete a workspace
async function deleteWorkspace(workspaceId, args) {
  const token = getToken();
  
  // Get workspace info first
  const getQuery = `
    query ($workspaceId: [ID!]!) {
      workspaces(ids: $workspaceId) {
        id
        name
      }
    }
  `;
  
  const wsData = await graphqlRequest(getQuery, { workspaceId: [parseInt(workspaceId)] }, token);
  const ws = wsData.workspaces?.[0];
  
  if (!ws) {
    console.error(`Workspace not found: ${workspaceId}`);
    process.exit(1);
  }
  
  const confirmed = await confirmDestructiveAction(
    `Delete workspace: ${ws.name}`,
    [
      `ID: ${workspaceId}`,
      'All boards in this workspace will be deleted.',
      'All items, groups, and data will be permanently lost.'
    ],
    args.force
  );
  
  if (!confirmed) return;
  
  const mutation = `
    mutation ($workspaceId: ID!) {
      delete_workspace(workspace_id: $workspaceId) {
        id
      }
    }
  `;
  
  await graphqlRequest(mutation, { workspaceId }, token);
  
  console.log('Workspace deleted successfully.');
}

// Main
async function main() {
  const args = parseArgs(process.argv.slice(2));
  const command = args._[0];
  
  try {
    switch (command) {
      case 'list':
        await listWorkspaces(args);
        break;
      case 'get':
        if (!args._[1]) {
          console.error('Error: Workspace ID required');
          console.error('Usage: node workspaces.js get <id>');
          process.exit(1);
        }
        await getWorkspace(args._[1], args);
        break;
      case 'create':
        if (!args._[1]) {
          console.error('Error: Workspace name required');
          console.error('Usage: node workspaces.js create <name>');
          process.exit(1);
        }
        await createWorkspace(args._[1], args);
        break;
      case 'delete':
        if (!args._[1]) {
          console.error('Error: Workspace ID required');
          console.error('Usage: node workspaces.js delete <id>');
          process.exit(1);
        }
        await deleteWorkspace(args._[1], args);
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
