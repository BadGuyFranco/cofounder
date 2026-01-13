#!/usr/bin/env node

/**
 * Publer User Script
 * Get current user profile and settings.
 *
 * Usage:
 *   node user.js me
 *   node user.js help
 */

import { parseArgs, apiRequest, formatUser } from './utils.js';

/**
 * Get current authenticated user
 */
async function getMe(verbose) {
  const data = await apiRequest('/me', { includeWorkspace: false });
  
  console.log('Current User:\n');
  console.log(formatUser(data));
  
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
  console.log('Publer User Script');
  console.log('');
  console.log('Commands:');
  console.log('  me                       Get current authenticated user profile');
  console.log('  help                     Show this help');
  console.log('');
  console.log('Options:');
  console.log('  --verbose                Show full API responses');
  console.log('');
  console.log('Examples:');
  console.log('  # Get current user');
  console.log('  node user.js me');
  console.log('');
  console.log('  # Verify API credentials');
  console.log('  node user.js me --verbose');
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
      case 'me':
        await getMe(verbose);
        break;

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
