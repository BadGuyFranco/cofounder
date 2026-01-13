#!/usr/bin/env node

/**
 * X.com Spaces
 * Find and get information about Twitter Spaces (live audio).
 */

import { fileURLToPath } from 'url';
import path from 'path';
import {
  parseArgs, initScript, apiRequest,
  formatDate, handleError, showHelp
} from './utils.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const args = parseArgs(process.argv.slice(2));
initScript(path.join(__dirname, '..'), args);

// Help documentation
function printHelp() {
  showHelp('X.com Spaces', {
    'Commands': [
      'get <space_id>            Get Space details',
      'by-creator <user_id>      Get Spaces created by user',
      'search <query>            Search for Spaces',
      'buyers <space_id>         List users who bought tickets',
      'help                      Show this help'
    ],
    'Options': [
      '--limit <n>               Max results (default: 25, max: 100)',
      '--state <state>           Filter by state: live, scheduled, all (default: all)',
      '--verbose                 Show full API response'
    ],
    'Examples': [
      'node spaces.js get 1DXxyZYMnoMJM',
      'node spaces.js by-creator 1234567890123456789',
      'node spaces.js search "AI" --state live',
      'node spaces.js buyers 1DXxyZYMnoMJM'
    ],
    'Space States': [
      'live       - Currently broadcasting',
      'scheduled  - Scheduled for future',
      'ended      - Has ended'
    ]
  });
}

const SPACE_FIELDS = 'host_ids,created_at,creator_id,id,lang,invited_user_ids,participant_count,speaker_ids,started_at,ended_at,subscriber_count,topic_ids,state,title,scheduled_start,is_ticketed';
const USER_FIELDS = 'name,username';

// Get Space by ID
async function getSpace(spaceId, args) {
  const params = {
    'space.fields': SPACE_FIELDS,
    'user.fields': USER_FIELDS,
    'expansions': 'host_ids,creator_id,speaker_ids,invited_user_ids'
  };
  
  console.log(`Fetching Space ${spaceId}...\n`);
  
  const data = await apiRequest('GET', `/spaces/${spaceId}`, { params });
  
  if (args.verbose) {
    console.log(JSON.stringify(data, null, 2));
    return;
  }
  
  displaySpace(data.data, data.includes || {});
}

// Get Spaces by creator
async function getByCreator(userId, args) {
  const limit = parseInt(args.limit) || 25;
  
  const params = {
    'space.fields': SPACE_FIELDS,
    'user.fields': USER_FIELDS,
    'expansions': 'host_ids,creator_id'
  };
  
  console.log(`Fetching Spaces by user ${userId}...\n`);
  
  const data = await apiRequest('GET', `/spaces/by/creator_ids`, { 
    params: { ...params, user_ids: userId }
  });
  
  if (args.verbose) {
    console.log(JSON.stringify(data, null, 2));
    return;
  }
  
  const spaces = data.data || [];
  console.log(`Found ${spaces.length} Spaces:\n`);
  
  for (const space of spaces) {
    displaySpace(space, data.includes || {});
  }
}

// Search Spaces
async function searchSpaces(query, args) {
  const limit = parseInt(args.limit) || 25;
  const state = args.state || 'all';
  
  const params = {
    query,
    'space.fields': SPACE_FIELDS,
    'user.fields': USER_FIELDS,
    'expansions': 'host_ids,creator_id',
    max_results: Math.min(limit, 100)
  };
  
  if (state !== 'all') {
    params.state = state;
  }
  
  console.log(`Searching Spaces for "${query}"...\n`);
  
  const data = await apiRequest('GET', '/spaces/search', { params });
  
  if (args.verbose) {
    console.log(JSON.stringify(data, null, 2));
    return;
  }
  
  const spaces = data.data || [];
  console.log(`Found ${spaces.length} Spaces:\n`);
  
  for (const space of spaces) {
    displaySpace(space, data.includes || {});
  }
}

// Get Space buyers
async function getSpaceBuyers(spaceId, args) {
  const params = {
    'user.fields': 'name,username,public_metrics'
  };
  
  console.log(`Fetching ticket buyers for Space ${spaceId}...\n`);
  
  const data = await apiRequest('GET', `/spaces/${spaceId}/buyers`, { params });
  
  if (args.verbose) {
    console.log(JSON.stringify(data, null, 2));
    return;
  }
  
  const users = data.data || [];
  console.log(`Found ${users.length} ticket buyers:\n`);
  
  for (const user of users) {
    console.log(`${user.name} (@${user.username})`);
    console.log(`  Followers: ${user.public_metrics?.followers_count?.toLocaleString() || 0}`);
    console.log('');
  }
}

// Display Space details
function displaySpace(space, includes) {
  const creator = includes.users?.find(u => u.id === space.creator_id);
  const hosts = space.host_ids?.map(id => includes.users?.find(u => u.id === id)).filter(Boolean) || [];
  
  console.log(`${space.title || '[Untitled Space]'}`);
  console.log(`  State: ${space.state?.toUpperCase() || 'Unknown'}`);
  console.log(`  ID: ${space.id}`);
  
  if (creator) {
    console.log(`  Creator: ${creator.name} (@${creator.username})`);
  }
  
  if (hosts.length > 0) {
    console.log(`  Hosts: ${hosts.map(h => `@${h.username}`).join(', ')}`);
  }
  
  if (space.participant_count) {
    console.log(`  Participants: ${space.participant_count}`);
  }
  
  if (space.scheduled_start) {
    console.log(`  Scheduled: ${formatDate(space.scheduled_start)}`);
  }
  
  if (space.started_at) {
    console.log(`  Started: ${formatDate(space.started_at)}`);
  }
  
  if (space.ended_at) {
    console.log(`  Ended: ${formatDate(space.ended_at)}`);
  }
  
  if (space.is_ticketed) {
    console.log(`  Ticketed: Yes`);
  }
  
  if (space.lang) {
    console.log(`  Language: ${space.lang}`);
  }
  
  console.log('');
}

// Main
async function main() {
  const command = args._[0];
  
  try {
    switch (command) {
      case 'get':
        if (!args._[1]) {
          console.error('Error: Space ID required');
          console.error('Usage: node spaces.js get <space_id>');
          process.exit(1);
        }
        await getSpace(args._[1], args);
        break;
      case 'by-creator':
        if (!args._[1]) {
          console.error('Error: User ID required');
          console.error('Usage: node spaces.js by-creator <user_id>');
          process.exit(1);
        }
        await getByCreator(args._[1], args);
        break;
      case 'search':
        if (!args._[1]) {
          console.error('Error: Search query required');
          console.error('Usage: node spaces.js search <query>');
          process.exit(1);
        }
        await searchSpaces(args._[1], args);
        break;
      case 'buyers':
        if (!args._[1]) {
          console.error('Error: Space ID required');
          console.error('Usage: node spaces.js buyers <space_id>');
          process.exit(1);
        }
        await getSpaceBuyers(args._[1], args);
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
