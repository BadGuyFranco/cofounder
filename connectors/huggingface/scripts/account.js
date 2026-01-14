#!/usr/bin/env node

/**
 * HuggingFace Account Script
 * Verify credentials and check account status.
 *
 * Usage:
 *   node account.js verify
 *   node account.js help
 */

import { parseArgs, hubApiRequest, loadConfig } from './utils.js';

/**
 * Verify API token is valid
 * @param {boolean} verbose - Show full response
 */
async function verifyAccount(verbose) {
  console.log('Verifying HuggingFace credentials...\n');

  // Get user info via whoami endpoint
  const user = await hubApiRequest('/whoami-v2');

  console.log('Authentication successful!');
  console.log('');

  // Load config to show what's configured
  const config = loadConfig();

  console.log('Configuration:');
  console.log(`  API Token: ${config.apiToken.slice(0, 8)}...`);
  console.log(`  Username: ${user.name || user.fullname || 'N/A'}`);

  if (user.email) {
    console.log(`  Email: ${user.email}`);
  }

  if (user.type) {
    console.log(`  Account type: ${user.type}`);
  }

  if (user.orgs && user.orgs.length > 0) {
    console.log(`\nOrganizations:`);
    for (const org of user.orgs) {
      console.log(`  - ${org.name}`);
    }
  }

  if (user.auth && user.auth.accessToken) {
    const token = user.auth.accessToken;
    console.log(`\nToken details:`);
    console.log(`  Name: ${token.displayName || 'N/A'}`);
    console.log(`  Role: ${token.role || 'N/A'}`);
    if (token.createdAt) {
      console.log(`  Created: ${new Date(token.createdAt).toLocaleDateString()}`);
    }
  }

  if (verbose) {
    console.log('\nFull response:');
    console.log(JSON.stringify(user, null, 2));
  }

  return true;
}

/**
 * Show current configuration
 */
function showConfig() {
  const config = loadConfig();

  console.log('Current configuration:');
  console.log(`  API Token: ${config.apiToken.slice(0, 8)}...`);
  console.log('\nCredentials file: /memory/connectors/huggingface/.env');
}

// Show help
function showHelp() {
  console.log(`HuggingFace Account Script

Commands:
  verify              Verify API token is valid
  config              Show current configuration
  help                Show this help

Options:
  --verbose           Show full API responses

Examples:
  # Verify credentials
  node account.js verify

  # Show current config
  node account.js config
`);
}

// Main
async function main() {
  const args = parseArgs(process.argv.slice(2));
  const command = args._[0];
  const verbose = args.verbose || false;

  try {
    switch (command) {
      case 'verify':
        await verifyAccount(verbose);
        break;

      case 'config':
        showConfig();
        break;

      case 'help':
      default:
        showHelp();
        break;
    }
  } catch (error) {
    console.error('Error:', error.message);
    if (error.status === 401) {
      console.error('\nAuthentication failed. Please check your API token.');
      console.error('Get a new token at: https://huggingface.co/settings/tokens');
    }
    if (verbose) {
      console.error('Status:', error.status);
    }
    process.exit(1);
  }
}

main();
