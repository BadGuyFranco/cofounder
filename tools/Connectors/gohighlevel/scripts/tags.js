#!/usr/bin/env node

/**
 * Go High Level Tags Script
 * Manage tags for the location.
 * 
 * Usage:
 *   node tags.js list --location "Name"
 *   node tags.js get <tag-id> --location "Name"
 *   node tags.js create --name "Tag Name" --location "Name"
 *   node tags.js update <tag-id> --name "New Name" --location "Name"
 *   node tags.js delete <tag-id> --location "Name"
 *   node tags.js locations
 */

import path from 'path';
import { fileURLToPath } from 'url';
import {
  loadEnv,
  loadLocations,
  resolveLocation,
  parseArgs,
  confirmDestructiveAction,
  listLocations,
  handleError
} from './utils.js';

const LOCAL_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const BASE_URL = 'https://services.leadconnectorhq.com';

// Load environment
loadEnv(LOCAL_DIR);

// API request wrapper
async function apiRequest(method, endpoint, apiKey, body = null) {
  const url = `${BASE_URL}${endpoint}`;
  const options = {
    method,
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'Version': '2021-07-28'
    }
  };
  
  if (body) {
    options.body = JSON.stringify(body);
  }
  
  const response = await fetch(url, options);
  const data = await response.json();
  
  if (!response.ok) {
    const error = new Error(data.message || data.error || 'API request failed');
    error.status = response.status;
    error.data = data;
    throw error;
  }
  
  return data;
}

// List tags
async function listTags(location, verbose) {
  const data = await apiRequest('GET', `/locations/${location.id}/tags`, location.key);
  
  const tags = data.tags || [];
  console.log(`Found ${tags.length} tags:\n`);
  
  for (const tag of tags) {
    console.log(`- ${tag.name}`);
    console.log(`  ID: ${tag.id}`);
    console.log('');
  }
  
  if (verbose) {
    console.log('\nFull response:');
    console.log(JSON.stringify(data, null, 2));
  }
  
  return tags;
}

// Get tag details
async function getTag(tagId, location, verbose) {
  const data = await apiRequest('GET', `/locations/${location.id}/tags/${tagId}`, location.key);
  
  const tag = data.tag || data;
  console.log(`Tag: ${tag.name}`);
  console.log(`ID: ${tag.id}`);
  
  if (verbose) {
    console.log('\nFull response:');
    console.log(JSON.stringify(data, null, 2));
  }
  
  return tag;
}

// Create tag
async function createTag(name, location, verbose) {
  const data = await apiRequest('POST', `/locations/${location.id}/tags`, location.key, {
    name: name
  });
  
  console.log('Tag created successfully!');
  console.log(`Tag ID: ${data.tag?.id || data.id}`);
  console.log(`Name: ${name}`);
  
  if (verbose) {
    console.log('\nFull response:');
    console.log(JSON.stringify(data, null, 2));
  }
  
  return data;
}

// Update tag
async function updateTag(tagId, name, location, verbose) {
  const data = await apiRequest('PUT', `/locations/${location.id}/tags/${tagId}`, location.key, {
    name: name
  });
  
  console.log(`Updated tag: ${tagId}`);
  console.log(`New name: ${name}`);
  
  if (verbose) {
    console.log('\nFull response:');
    console.log(JSON.stringify(data, null, 2));
  }
  
  return data;
}

// Delete tag
async function deleteTag(tagId, location, verbose, force = false) {
  // Get tag name for confirmation
  let tagName = tagId;
  try {
    const tagData = await apiRequest('GET', `/locations/${location.id}/tags/${tagId}`, location.key);
    tagName = tagData.tag?.name || tagData.name || tagId;
  } catch (e) {
    // Continue with ID only
  }
  
  const confirmed = await confirmDestructiveAction(
    'You are about to DELETE a tag.',
    [
      `Tag: ${tagName}`,
      `ID: ${tagId}`,
      '',
      'This will remove the tag from all contacts.',
      'This action cannot be undone.'
    ],
    force
  );
  
  if (!confirmed) {
    process.exit(0);
  }
  
  const data = await apiRequest('DELETE', `/locations/${location.id}/tags/${tagId}`, location.key);
  
  console.log(`Deleted tag: ${tagId}`);
  
  if (verbose) {
    console.log('\nFull response:');
    console.log(JSON.stringify(data, null, 2));
  }
  
  return data;
}

// Main
async function main() {
  const args = parseArgs(process.argv.slice(2));
  const command = args._[0];
  const verbose = args.verbose || false;
  const locationsConfig = loadLocations();
  
  if (command === 'locations') {
    listLocations(locationsConfig);
    return;
  }
  
  try {
    switch (command) {
      case 'list': {
        const location = resolveLocation(args.location, locationsConfig);
        await listTags(location, verbose);
        break;
      }
      
      case 'get': {
        const location = resolveLocation(args.location, locationsConfig);
        const tagId = args._[1];
        
        if (!tagId) {
          console.error('Error: Tag ID is required');
          console.error('Usage: node tags.js get <tag-id> --location "Name"');
          process.exit(1);
        }
        
        await getTag(tagId, location, verbose);
        break;
      }
      
      case 'create': {
        const location = resolveLocation(args.location, locationsConfig);
        const name = args.name;
        
        if (!name) {
          console.error('Error: --name is required');
          console.error('Usage: node tags.js create --name "Tag Name" --location "Name"');
          process.exit(1);
        }
        
        await createTag(name, location, verbose);
        break;
      }
      
      case 'update': {
        const location = resolveLocation(args.location, locationsConfig);
        const tagId = args._[1];
        const name = args.name;
        
        if (!tagId || !name) {
          console.error('Error: Tag ID and --name are required');
          console.error('Usage: node tags.js update <tag-id> --name "New Name" --location "Name"');
          process.exit(1);
        }
        
        await updateTag(tagId, name, location, verbose);
        break;
      }
      
      case 'delete': {
        const location = resolveLocation(args.location, locationsConfig);
        const tagId = args._[1];
        
        if (!tagId) {
          console.error('Error: Tag ID is required');
          console.error('Usage: node tags.js delete <tag-id> --location "Name"');
          process.exit(1);
        }
        
        await deleteTag(tagId, location, verbose, args.force);
        break;
      }
      
      default:
        console.log('Go High Level Tags Script');
        console.log('');
        console.log('Commands:');
        console.log('  list --location "Name"          List all tags');
        console.log('  get <tag-id> --location         Get tag details');
        console.log('  create --name "Name" --location Create a new tag');
        console.log('  update <tag-id> --name "Name"   Update a tag');
        console.log('  delete <tag-id> --location      Delete a tag');
        console.log('  locations                       List available locations');
        console.log('');
        console.log('Location Options:');
        console.log('  --location "Name"             Specify which GHL account to use');
        console.log('');
        console.log('Create/Update Options:');
        console.log('  --name "Tag Name"             Tag name (required)');
        console.log('');
        console.log('Global Options:');
        console.log('  --verbose                     Show full API responses');
        console.log('  --force                       Skip confirmation for destructive actions');
        console.log('');
        console.log('Note: To add/remove tags from contacts, use contacts.js --tags option');
        process.exit(0);
    }
  } catch (error) {
    console.error('Error:', error.message);
    if (error.status) {
      console.error('Status:', error.status);
    }
    if (verbose && error.data) {
      console.error('Details:', JSON.stringify(error.data, null, 2));
    }
    process.exit(1);
  }
}

main();
