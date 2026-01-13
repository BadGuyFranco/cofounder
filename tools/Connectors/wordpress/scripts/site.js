#!/usr/bin/env node

/**
 * WordPress Site Script
 * Verify connection and get site information.
 */

import path from 'path';
import { fileURLToPath } from 'url';
import { initScript, parseArgs, getConfig, apiRequest, showHelp, handleError } from './utils.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const args = parseArgs(process.argv.slice(2));

function displayHelp() {
  showHelp('WordPress Site Management', {
    'Usage': 'node scripts/site.js <command> [options]',
    'Commands': [
      'verify              Verify connection and credentials',
      'info                Get site information',
      'help                Show this help'
    ],
    'Examples': [
      'node scripts/site.js verify',
      'node scripts/site.js info --site myblog'
    ]
  });
}

async function verify() {
  const config = getConfig();
  console.log(`Connecting to: ${config.siteUrl}`);
  console.log(`Username: ${config.username}\n`);
  
  try {
    // Test by getting current user
    const user = await apiRequest('/users/me');
    console.log('Connection successful!\n');
    console.log(`Logged in as: ${user.name} (${user.slug})`);
    console.log(`User ID: ${user.id}`);
    console.log(`Roles: ${user.roles?.join(', ') || 'N/A'}`);
  } catch (error) {
    if (error.status === 401) {
      console.error('Authentication failed.');
      console.error('Check your username and application password.');
    } else {
      throw error;
    }
  }
}

async function info() {
  const config = getConfig();
  
  // Get site root info (public endpoint)
  const rootUrl = `${config.siteUrl}/wp-json`;
  const response = await fetch(rootUrl);
  const data = await response.json();
  
  console.log('Site Information\n');
  console.log(`Name: ${data.name || 'N/A'}`);
  console.log(`Description: ${data.description || 'N/A'}`);
  console.log(`URL: ${data.url || config.siteUrl}`);
  console.log(`Home: ${data.home || 'N/A'}`);
  console.log(`GMT Offset: ${data.gmt_offset || 'N/A'}`);
  console.log(`Timezone: ${data.timezone_string || 'N/A'}`);
  
  if (data.namespaces) {
    console.log(`\nAvailable API Namespaces:`);
    for (const ns of data.namespaces) {
      console.log(`  - ${ns}`);
    }
  }
}

async function main() {
  initScript(__dirname, args);
  
  const command = args._[0] || 'help';
  
  try {
    switch (command) {
      case 'verify':
        await verify();
        break;
      case 'info':
        await info();
        break;
      case 'help':
      default:
        displayHelp();
    }
  } catch (error) {
    handleError(error, args.verbose);
  }
}

main();
