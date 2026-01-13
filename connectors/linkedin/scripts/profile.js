#!/usr/bin/env node

/**
 * LinkedIn Profile Management
 * Get user profile information.
 */

import { fileURLToPath } from 'url';
import path from 'path';
import {
  loadEnv, getToken, parseArgs, apiRequest, handleError, showHelp,
  extractIdFromUrn, buildPersonUrn
} from './utils.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
loadEnv(path.join(__dirname, '..'));

// Help documentation
function printHelp() {
  showHelp('LinkedIn Profile', {
    'Commands': [
      'me                          Get current user profile',
      'id                          Get current user LinkedIn ID (URN)',
      'help                        Show this help'
    ],
    'Options': [
      '--verbose                   Show full API response'
    ],
    'Examples': [
      'node profile.js me',
      'node profile.js me --verbose',
      'node profile.js id'
    ],
    'Notes': [
      'The "me" command uses the OpenID Connect userinfo endpoint.',
      'For basic profile info, you need the "profile" scope.',
      'For email, you need the "email" scope.'
    ]
  });
}

// Get current user profile using OpenID Connect
async function getMyProfile(args) {
  const token = getToken();
  
  console.log('Fetching your profile...\n');
  
  // Use OpenID Connect userinfo endpoint (simpler, more reliable)
  const response = await fetch('https://api.linkedin.com/v2/userinfo', {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });
  
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`API request failed: ${response.status} - ${errorText}`);
  }
  
  const profile = await response.json();
  
  if (args.verbose) {
    console.log(JSON.stringify(profile, null, 2));
    return;
  }
  
  console.log('Profile Information:');
  console.log('====================');
  console.log(`Name: ${profile.name || `${profile.given_name} ${profile.family_name}`}`);
  console.log(`First Name: ${profile.given_name || 'N/A'}`);
  console.log(`Last Name: ${profile.family_name || 'N/A'}`);
  console.log(`Email: ${profile.email || 'N/A'}`);
  console.log(`LinkedIn ID: ${profile.sub}`);
  console.log(`Person URN: urn:li:person:${profile.sub}`);
  if (profile.picture) {
    console.log(`Profile Picture: ${profile.picture}`);
  }
  console.log(`Email Verified: ${profile.email_verified || 'N/A'}`);
  console.log(`Locale: ${profile.locale || 'N/A'}`);
  
  console.log('\n--- For posting, use this Author URN ---');
  console.log(`urn:li:person:${profile.sub}`);
  console.log('-----------------------------------------\n');
}

// Get just the LinkedIn ID/URN
async function getMyId(args) {
  const token = getToken();
  
  const response = await fetch('https://api.linkedin.com/v2/userinfo', {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });
  
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`API request failed: ${response.status} - ${errorText}`);
  }
  
  const profile = await response.json();
  
  if (args.verbose) {
    console.log(`LinkedIn ID: ${profile.sub}`);
    console.log(`Person URN: urn:li:person:${profile.sub}`);
  } else {
    // Just output the URN for piping to other commands
    console.log(`urn:li:person:${profile.sub}`);
  }
}

// Main
async function main() {
  const args = parseArgs(process.argv.slice(2));
  const command = args._[0] || 'me';
  
  try {
    switch (command) {
      case 'me':
        await getMyProfile(args);
        break;
      case 'id':
        await getMyId(args);
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
