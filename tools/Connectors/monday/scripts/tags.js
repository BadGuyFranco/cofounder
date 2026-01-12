#!/usr/bin/env node

/**
 * Monday.com Tags Management
 * List and manage tags.
 */

import { fileURLToPath } from 'url';
import path from 'path';
import {
  loadEnv, getToken, parseArgs, graphqlRequest,
  handleError, showHelp
} from './utils.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
loadEnv(path.join(__dirname, '..'));

// Help documentation
function printHelp() {
  showHelp('Monday.com Tags', {
    'Commands': [
      'list                        List all tags in account',
      'create <board_id> <name>    Create or get a tag',
      'help                        Show this help'
    ],
    'Options': [
      '--verbose                   Show full API response'
    ],
    'Examples': [
      'node tags.js list',
      'node tags.js create 1234567890 "Urgent"',
      'node tags.js create 1234567890 "High Priority"'
    ],
    'Notes': [
      'Tags are account-wide',
      'Creating an existing tag returns the existing tag',
      'Assign tags to items using items.js with --column tags_col=\'[tagId1, tagId2]\'',
      'Tag IDs are numeric'
    ]
  });
}

// List all tags
async function listTags(args) {
  const token = getToken();
  
  console.log('Fetching tags...\n');
  
  const query = `
    query {
      tags {
        id
        name
        color
      }
    }
  `;
  
  const data = await graphqlRequest(query, {}, token);
  
  if (args.verbose) {
    console.log(JSON.stringify(data, null, 2));
    return;
  }
  
  const tags = data.tags || [];
  console.log(`Found ${tags.length} tags:\n`);
  
  for (const tag of tags) {
    console.log(`- ${tag.name}`);
    console.log(`  ID: ${tag.id}`);
    console.log(`  Color: ${tag.color}`);
    console.log('');
  }
  
  if (tags.length === 0) {
    console.log('No tags found. Create tags using: node tags.js create <board_id> "Tag Name"');
  }
}

// Create a tag (or get existing one with same name)
async function createTag(boardId, tagName, args) {
  const token = getToken();
  
  const mutation = `
    mutation ($boardId: ID, $tagName: String) {
      create_or_get_tag(board_id: $boardId, tag_name: $tagName) {
        id
        name
        color
      }
    }
  `;
  
  const data = await graphqlRequest(mutation, {
    boardId: parseInt(boardId),
    tagName
  }, token);
  
  if (args.verbose) {
    console.log(JSON.stringify(data, null, 2));
    return;
  }
  
  const tag = data.create_or_get_tag;
  console.log('Tag created/retrieved successfully!\n');
  console.log(`ID: ${tag.id}`);
  console.log(`Name: ${tag.name}`);
  console.log(`Color: ${tag.color}`);
  console.log('\nTo assign this tag to an item:');
  console.log(`  node items.js update <item_id> --column tags_col='{"tag_ids": [${tag.id}]}'`);
}

// Main
async function main() {
  const args = parseArgs(process.argv.slice(2));
  const command = args._[0];
  
  try {
    switch (command) {
      case 'list':
        await listTags(args);
        break;
      case 'create':
        if (!args._[1] || !args._[2]) {
          console.error('Error: Board ID and tag name required');
          console.error('Usage: node tags.js create <board_id> <name>');
          process.exit(1);
        }
        await createTag(args._[1], args._[2], args);
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
