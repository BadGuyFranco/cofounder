#!/usr/bin/env node

/**
 * Make.com Connections Script
 * List and manage app connections (Google, Slack, etc.)
 * 
 * Usage:
 *   node connections.js list --team-id <id>
 *   node connections.js get <connection-id>
 *   node connections.js verify <connection-id>
 *   node connections.js delete <connection-id>
 */

import { get, post, del, parseArgs, printTable, formatOutput } from './utils.js';

// List connections for a team
async function listConnections(teamId, verbose) {
  const response = await get('/connections', { teamId });
  const connections = response.connections || response;
  
  if (verbose) {
    formatOutput(connections, true);
    return;
  }
  
  if (!connections || connections.length === 0) {
    console.log('No connections found.');
    return;
  }
  
  console.log(`Found ${connections.length} connection(s):\n`);
  
  printTable(connections, [
    { key: 'id', label: 'ID' },
    { key: 'name', label: 'Name' },
    { key: 'accountName', label: 'Account' },
    { key: 'packageName', label: 'App' },
    { key: 'expire', label: 'Expires', getter: c => c.expire || 'Never' }
  ]);
}

// Get a specific connection
async function getConnection(connectionId, verbose) {
  const response = await get(`/connections/${connectionId}`);
  const connection = response.connection || response;
  
  if (verbose) {
    formatOutput(connection, true);
    return;
  }
  
  console.log(`Connection: ${connection.name}`);
  console.log(`ID: ${connection.id}`);
  console.log(`App: ${connection.packageName}`);
  console.log(`Account: ${connection.accountName || 'N/A'}`);
  console.log(`Team ID: ${connection.teamId}`);
  if (connection.expire) {
    console.log(`Expires: ${connection.expire}`);
  }
}

// Verify a connection is working
async function verifyConnection(connectionId, verbose) {
  const response = await post(`/connections/${connectionId}/verify`, {});
  
  if (verbose) {
    formatOutput(response, true);
    return;
  }
  
  console.log(`Connection ${connectionId} verified successfully.`);
}

// Delete a connection
async function deleteConnection(connectionId, verbose) {
  const response = await del(`/connections/${connectionId}`);
  
  if (verbose && response) {
    formatOutput(response, true);
    return;
  }
  
  console.log(`Connection ${connectionId} deleted.`);
}

// Show help
function showHelp() {
  console.log('Make.com Connections Script');
  console.log('');
  console.log('Manage app connections (Google, Slack, HubSpot, etc.)');
  console.log('');
  console.log('Commands:');
  console.log('  list --team-id <id>       List connections for a team');
  console.log('  get <connection-id>       Get connection details');
  console.log('  verify <connection-id>    Verify connection is working');
  console.log('  delete <connection-id>    Delete a connection (destructive)');
  console.log('');
  console.log('Options:');
  console.log('  --team-id <id>    Team ID (required for list)');
  console.log('  --verbose         Show full API responses');
  console.log('');
  console.log('Examples:');
  console.log('  node connections.js list --team-id 12345');
  console.log('  node connections.js get 67890');
  console.log('  node connections.js verify 67890');
}

// Main
async function main() {
  const args = parseArgs(process.argv.slice(2));
  const command = args._[0];
  const verbose = args.verbose || false;
  
  try {
    switch (command) {
      case 'list': {
        const teamId = args['team-id'];
        if (!teamId) {
          console.error('Error: --team-id is required');
          console.error('Usage: node connections.js list --team-id <id>');
          process.exit(1);
        }
        await listConnections(teamId, verbose);
        break;
      }
      
      case 'get': {
        const connectionId = args._[1];
        if (!connectionId) {
          console.error('Error: Connection ID is required');
          console.error('Usage: node connections.js get <connection-id>');
          process.exit(1);
        }
        await getConnection(connectionId, verbose);
        break;
      }
      
      case 'verify': {
        const connectionId = args._[1];
        if (!connectionId) {
          console.error('Error: Connection ID is required');
          console.error('Usage: node connections.js verify <connection-id>');
          process.exit(1);
        }
        await verifyConnection(connectionId, verbose);
        break;
      }
      
      case 'delete': {
        const connectionId = args._[1];
        if (!connectionId) {
          console.error('Error: Connection ID is required');
          console.error('Usage: node connections.js delete <connection-id>');
          process.exit(1);
        }
        await deleteConnection(connectionId, verbose);
        break;
      }
      
      case 'help':
      default:
        showHelp();
        process.exit(0);
    }
  } catch (error) {
    console.error('Error:', error.message);
    if (verbose) {
      console.error(error.stack);
    }
    process.exit(1);
  }
}

main();
