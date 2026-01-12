#!/usr/bin/env node

/**
 * Publer Workspaces Script
 * List workspaces and connected social accounts.
 *
 * Usage:
 *   node workspaces.js list
 *   node workspaces.js accounts
 *   node workspaces.js account <id>
 *   node workspaces.js help
 */

import { parseArgs, apiRequest, formatAccount, formatWorkspace, validateEnv } from './utils.js';

/**
 * List workspaces
 */
async function listWorkspaces(verbose) {
  const data = await apiRequest('/workspaces', { includeWorkspace: false });
  
  const workspaces = Array.isArray(data) ? data : (data.workspaces || data.data || [data]);
  
  console.log(`Found ${workspaces.length} workspace(s):\n`);
  
  for (const workspace of workspaces) {
    console.log(formatWorkspace(workspace));
    console.log('');
  }
  
  if (verbose) {
    console.log('\nFull response:');
    console.log(JSON.stringify(data, null, 2));
  }
  
  return workspaces;
}

/**
 * Get current workspace details
 */
async function getCurrentWorkspace(verbose) {
  validateEnv(['workspaceId']);
  
  const data = await apiRequest('/workspace');
  
  console.log('Current Workspace:\n');
  console.log(formatWorkspace(data));
  
  if (verbose) {
    console.log('\nFull response:');
    console.log(JSON.stringify(data, null, 2));
  }
  
  return data;
}

/**
 * List connected social accounts
 */
async function listAccounts(verbose) {
  // Try multiple possible endpoints
  let data;
  try {
    data = await apiRequest('/accounts');
  } catch (e) {
    // Fallback to alternative endpoint
    data = await apiRequest('/social_accounts');
  }
  
  const accounts = Array.isArray(data) ? data : (data.accounts || data.social_accounts || data.data || []);
  
  console.log(`Found ${accounts.length} connected account(s):\n`);
  
  for (const account of accounts) {
    console.log(formatAccount(account));
    console.log('');
  }
  
  if (verbose) {
    console.log('\nFull response:');
    console.log(JSON.stringify(data, null, 2));
  }
  
  return accounts;
}

/**
 * Get details for a specific account
 */
async function getAccount(accountId, verbose) {
  let data;
  try {
    data = await apiRequest(`/accounts/${accountId}`);
  } catch (e) {
    // Fallback to alternative endpoint
    data = await apiRequest(`/social_accounts/${accountId}`);
  }
  
  console.log(formatAccount(data));
  
  if (verbose) {
    console.log('\nFull response:');
    console.log(JSON.stringify(data, null, 2));
  }
  
  return data;
}

/**
 * Show help
 */
function showHelp() {
  console.log('Publer Workspaces Script');
  console.log('');
  console.log('Commands:');
  console.log('  list                     List all workspaces');
  console.log('  current                  Get current workspace details');
  console.log('  accounts                 List connected social accounts');
  console.log('  account <id>             Get details for a specific account');
  console.log('  help                     Show this help');
  console.log('');
  console.log('Options:');
  console.log('  --verbose                Show full API responses');
  console.log('');
  console.log('Examples:');
  console.log('  # List all workspaces');
  console.log('  node workspaces.js list');
  console.log('');
  console.log('  # Get current workspace');
  console.log('  node workspaces.js current');
  console.log('');
  console.log('  # List connected social accounts');
  console.log('  node workspaces.js accounts');
  console.log('');
  console.log('  # Get specific account details');
  console.log('  node workspaces.js account abc123 --verbose');
}

/**
 * Main entry point
 */
async function main() {
  const args = parseArgs(process.argv.slice(2));
  const command = args._[0];
  const verbose = args.verbose || false;

  try {
    switch (command) {
      case 'list':
        await listWorkspaces(verbose);
        break;

      case 'current':
        await getCurrentWorkspace(verbose);
        break;

      case 'accounts':
        await listAccounts(verbose);
        break;

      case 'account': {
        const accountId = args._[1];
        if (!accountId) {
          console.error('Error: Account ID is required');
          console.error('Usage: node workspaces.js account <id>');
          process.exit(1);
        }
        await getAccount(accountId, verbose);
        break;
      }

      case 'help':
      default:
        showHelp();
        break;
    }
  } catch (error) {
    console.error('Error:', error.message);
    if (error.status) {
      console.error('Status:', error.status);
    }
    if (verbose && error.details) {
      console.error('Details:', JSON.stringify(error.details, null, 2));
    }
    process.exit(1);
  }
}

main();
