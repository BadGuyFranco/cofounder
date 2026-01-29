/**
 * Zoom Auth Script
 * Verify credentials and token management
 */

import { parseArgs, getAccessToken, apiRequest, output, outputError, loadConfig, MEMORY_DIR } from './utils.js';
import { existsSync, unlinkSync } from 'fs';
import { join } from 'path';

function showHelp() {
  console.log(`
Zoom Auth Script - Verify credentials and manage tokens

Usage: node scripts/auth.js <command>

Commands:
  verify              Verify credentials and get account info
  token               Display current access token
  clear               Clear cached token (forces refresh on next request)
  help                Show this help

Examples:
  node scripts/auth.js verify
  node scripts/auth.js token
  node scripts/auth.js clear
`);
}

async function verify() {
  const token = await getAccessToken();
  
  // Get current user info to verify credentials work
  const user = await apiRequest('/users/me', {}, token);
  
  console.log('Credentials verified successfully!');
  console.log('');
  output({
    status: 'verified',
    account_id: user.account_id,
    user_id: user.id,
    email: user.email,
    first_name: user.first_name,
    last_name: user.last_name,
    type: user.type,
    role_name: user.role_name,
    account_number: user.account_number
  });
}

async function getToken() {
  const token = await getAccessToken();
  output({
    access_token: token,
    note: 'Token expires in ~1 hour. Use auth.js verify to check validity.'
  });
}

function clearCache() {
  const tokenCachePath = join(MEMORY_DIR, '.token-cache.json');
  if (existsSync(tokenCachePath)) {
    unlinkSync(tokenCachePath);
    console.log('Token cache cleared. Next API call will fetch a new token.');
  } else {
    console.log('No token cache found.');
  }
}

async function main() {
  const { command } = parseArgs();

  if (command === 'help') {
    showHelp();
    return;
  }

  try {
    switch (command) {
      case 'verify':
        await verify();
        break;
      case 'token':
        await getToken();
        break;
      case 'clear':
        clearCache();
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
