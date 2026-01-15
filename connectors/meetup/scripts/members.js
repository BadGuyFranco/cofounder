#!/usr/bin/env node

/**
 * Meetup Members Script
 * Query member profiles and information.
 */

import { fileURLToPath } from 'url';
import path from 'path';
import {
  loadEnv, getToken, parseArgs, handleError, showHelp, graphqlRequest, formatDate
} from './utils.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
loadEnv(path.join(__dirname, '..'));

// Help documentation
function printHelp() {
  showHelp('Meetup Members', {
    'Commands': [
      'me                          Get your own profile',
      'get <memberId>              Get member by ID',
      'help                        Show this help'
    ],
    'Options': [
      '--verbose                   Show full responses'
    ],
    'Examples': [
      'node members.js me',
      'node members.js me --verbose',
      'node members.js get 123456789'
    ]
  });
}

// Get self profile
async function getSelf(args) {
  const token = getToken();
  
  const query = `
    query GetSelf {
      self {
        id
        name
        email
        bio
        city
        state
        country
        lat
        lon
        isOrganizer
        organizedGroupCount
        startDate
        memberPhoto {
          id
          baseUrl
        }
      }
    }
  `;
  
  const data = await graphqlRequest(query, {}, token);
  const m = data.self;
  
  if (args.verbose) {
    console.log(JSON.stringify(data, null, 2));
    return;
  }
  
  console.log(`\n${m.name}`);
  console.log('='.repeat(m.name.length));
  console.log(`\nMember ID: ${m.id}`);
  console.log(`Email: ${m.email || 'N/A'}`);
  console.log(`Location: ${m.city || 'N/A'}${m.state ? `, ${m.state}` : ''}${m.country ? `, ${m.country}` : ''}`);
  console.log(`Is Organizer: ${m.isOrganizer ? 'Yes' : 'No'}`);
  console.log(`Groups Organized: ${m.organizedGroupCount}`);
  console.log(`Joined Meetup: ${formatDate(m.startDate)}`);
  
  if (m.memberPhoto) {
    console.log(`Photo: ${m.memberPhoto.baseUrl}`);
  }
  
  if (m.bio) {
    console.log(`\nBio:\n${m.bio}`);
  }
}

// Get member by ID
async function getMember(memberId, args) {
  const token = getToken();
  
  const query = `
    query GetMember($memberId: ID!) {
      member(id: $memberId) {
        id
        name
        bio
        city
        state
        country
        isOrganizer
        startDate
        memberPhoto {
          id
          baseUrl
        }
      }
    }
  `;
  
  const data = await graphqlRequest(query, { memberId }, token);
  const m = data.member;
  
  if (!m) {
    console.error(`Error: Member "${memberId}" not found.`);
    process.exit(1);
  }
  
  if (args.verbose) {
    console.log(JSON.stringify(data, null, 2));
    return;
  }
  
  console.log(`\n${m.name}`);
  console.log('='.repeat(m.name.length));
  console.log(`\nMember ID: ${m.id}`);
  console.log(`Location: ${m.city || 'N/A'}${m.state ? `, ${m.state}` : ''}${m.country ? `, ${m.country}` : ''}`);
  console.log(`Is Organizer: ${m.isOrganizer ? 'Yes' : 'No'}`);
  console.log(`Joined Meetup: ${formatDate(m.startDate)}`);
  
  if (m.memberPhoto) {
    console.log(`Photo: ${m.memberPhoto.baseUrl}`);
  }
  
  if (m.bio) {
    console.log(`\nBio:\n${m.bio}`);
  }
}

// Main
async function main() {
  const args = parseArgs(process.argv.slice(2));
  const command = args._[0];
  
  try {
    switch (command) {
      case 'me':
        await getSelf(args);
        break;
      case 'get':
        if (!args._[1]) {
          console.error('Error: Member ID required');
          console.error('Usage: node members.js get <memberId>');
          process.exit(1);
        }
        await getMember(args._[1], args);
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
