#!/usr/bin/env node
/**
 * Figma Users Script
 * Get current user information. Used for verifying token setup.
 */

import { parseArgs, apiRequest, output, outputError } from './utils.js';

function showHelp() {
  console.log(`
Figma Users - Get user information

Usage: node scripts/users.js <command>

Commands:
  me                      Get current user info (verify token)
  help                    Show this help

Examples:
  node scripts/users.js me
`);
}

/**
 * Get current user info
 */
async function getMe() {
  const endpoint = '/v1/me';
  const data = await apiRequest(endpoint);
  
  console.log('Authenticated as:');
  console.log(`  Name: ${data.handle || data.email}`);
  console.log(`  Email: ${data.email}`);
  console.log(`  User ID: ${data.id}`);
  if (data.img_url) {
    console.log(`  Avatar: ${data.img_url}`);
  }
  
  return data;
}

async function main() {
  const { command } = parseArgs();

  if (command === 'help') {
    showHelp();
    return;
  }

  try {
    switch (command) {
      case 'me':
      case undefined:
        await getMe();
        break;
      default:
        console.error(`Unknown command: ${command}`);
        showHelp();
        process.exit(1);
    }
  } catch (error) {
    outputError(error);
  }
}

main();
