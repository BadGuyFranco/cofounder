#!/usr/bin/env node

/**
 * Go High Level Trigger Links Management
 * 
 * Commands:
 *   list                  List all trigger links
 *   get <id>             Get link details
 *   create               Create new trigger link
 *   update <id>          Update link
 *   delete <id>          Delete link (DESTRUCTIVE)
 */

import path from 'path';
import { fileURLToPath } from 'url';
import {
  loadEnv,
  loadLocations,
  resolveLocation,
  parseArgs,
  apiRequest,
  confirmDestructiveAction,
  listLocations,
  formatDate,
  handleError
} from './utils.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment
loadEnv(__dirname);
const locationsConfig = loadLocations();

// Parse arguments
const args = parseArgs(process.argv.slice(2));
const command = args._[0];
const verbose = args.verbose || false;
const force = args.force || false;

async function listLinks(locationConfig) {
  try {
    const data = await apiRequest(
      'GET',
      `/links/?locationId=${locationConfig.id}`,
      locationConfig.key
    );
    
    const links = data.links || data.data || [];
    console.log(`Found ${links.length} trigger links:\n`);
    displayLinks(links);
  } catch (error) {
    handleError(error, verbose);
  }
}

function displayLinks(links) {
  if (links.length === 0) {
    console.log('No trigger links found.');
    return;
  }
  
  for (const link of links) {
    console.log(`- ${link.name}`);
    console.log(`  ID: ${link._id || link.id}`);
    if (link.redirectTo) console.log(`  Redirect: ${link.redirectTo}`);
    if (link.url || link.linkUrl) console.log(`  URL: ${link.url || link.linkUrl}`);
    if (link.clickCount !== undefined) console.log(`  Clicks: ${link.clickCount}`);
    console.log('');
  }
}

async function getLink(linkId, locationConfig) {
  try {
    const data = await apiRequest(
      'GET',
      `/links/${linkId}?locationId=${locationConfig.id}`,
      locationConfig.key
    );
    
    console.log('Trigger Link Details:\n');
    const link = data.link || data;
    console.log(`Name: ${link.name}`);
    console.log(`ID: ${link._id || link.id}`);
    if (link.redirectTo) console.log(`Redirect URL: ${link.redirectTo}`);
    if (link.url || link.linkUrl) console.log(`Trigger URL: ${link.url || link.linkUrl}`);
    if (link.clickCount !== undefined) console.log(`Total Clicks: ${link.clickCount}`);
    
    // Show associated workflow/tag
    if (link.workflowId) console.log(`Workflow ID: ${link.workflowId}`);
    if (link.tagId || link.tags) {
      const tags = link.tags || [link.tagId];
      console.log(`Tags: ${tags.join(', ')}`);
    }
    
    console.log(`\nCreated: ${formatDate(link.createdAt)}`);
    
    if (verbose) {
      console.log('\nFull Response:');
      console.log(JSON.stringify(data, null, 2));
    }
  } catch (error) {
    handleError(error, verbose);
  }
}

async function createLink(locationConfig) {
  try {
    const name = args.name;
    const redirectTo = args.redirect || args.url;
    
    if (!name) {
      console.error('Error: --name is required');
      process.exit(1);
    }
    
    if (!redirectTo) {
      console.error('Error: --redirect URL is required');
      process.exit(1);
    }
    
    const body = {
      locationId: locationConfig.id,
      name,
      redirectTo
    };
    
    // Add workflow if specified
    if (args['workflow-id']) body.workflowId = args['workflow-id'];
    
    // Add tags if specified
    if (args.tags) {
      body.tags = args.tags.split(',').map(t => t.trim());
    }
    
    const data = await apiRequest('POST', '/links/', locationConfig.key, body);
    
    console.log('Trigger link created successfully!\n');
    const link = data.link || data;
    console.log(`ID: ${link._id || link.id}`);
    console.log(`Name: ${link.name}`);
    console.log(`Redirect: ${link.redirectTo}`);
    if (link.url || link.linkUrl) {
      console.log(`\nTrigger URL (share this):`);
      console.log(`  ${link.url || link.linkUrl}`);
    }
    
  } catch (error) {
    handleError(error, verbose);
  }
}

async function updateLink(linkId, locationConfig) {
  try {
    const body = {
      locationId: locationConfig.id
    };
    
    if (args.name) body.name = args.name;
    if (args.redirect || args.url) body.redirectTo = args.redirect || args.url;
    if (args['workflow-id']) body.workflowId = args['workflow-id'];
    if (args.tags) {
      body.tags = args.tags.split(',').map(t => t.trim());
    }
    
    if (Object.keys(body).length <= 1) {
      console.error('Error: No fields to update');
      console.error('Use --name, --redirect, --workflow-id, or --tags');
      process.exit(1);
    }
    
    const data = await apiRequest('PUT', `/links/${linkId}`, locationConfig.key, body);
    
    console.log('Trigger link updated successfully!\n');
    const link = data.link || data;
    console.log(`ID: ${link._id || link.id}`);
    console.log(`Name: ${link.name}`);
    
  } catch (error) {
    handleError(error, verbose);
  }
}

async function deleteLink(linkId, locationConfig) {
  try {
    // Get link details first
    const linkData = await apiRequest(
      'GET',
      `/links/${linkId}?locationId=${locationConfig.id}`,
      locationConfig.key
    );
    const link = linkData.link || linkData;
    
    const confirmed = await confirmDestructiveAction(
      'You are about to DELETE a trigger link',
      [
        `Name: ${link.name}`,
        `Redirect: ${link.redirectTo || 'N/A'}`,
        link.clickCount !== undefined ? `Clicks: ${link.clickCount}` : '',
        '',
        'WARNING: Any emails or SMS messages containing this',
        'link will have broken links after deletion.'
      ].filter(Boolean),
      force
    );
    
    if (!confirmed) return;
    
    await apiRequest(
      'DELETE',
      `/links/${linkId}?locationId=${locationConfig.id}`,
      locationConfig.key
    );
    
    console.log('Trigger link deleted successfully.');
    
  } catch (error) {
    handleError(error, verbose);
  }
}

function showHelp() {
  console.log(`
Go High Level Trigger Links Management

Usage:
  node links.js <command> [options]

Commands:
  list                   List all trigger links
  get <id>              Get link details
  create                Create new trigger link
  update <id>           Update link
  delete <id>           Delete link (DESTRUCTIVE)
  locations             List configured locations

Options:
  --location "Name"     Specify GHL sub-account
  --name "Name"         Link name
  --redirect "URL"      Redirect URL (where user goes after clicking)
  --url "URL"           Alias for --redirect
  --workflow-id <id>    Workflow to trigger when clicked
  --tags "tag1,tag2"    Tags to add when clicked (comma-separated)
  --verbose             Show full API response
  --force               Skip confirmation prompts

Examples:
  node links.js list --location "My Account"
  node links.js create --name "Book Call" --redirect "https://calendly.com/me" --location "My Account"
  node links.js create --name "Interest Click" --redirect "https://example.com" --workflow-id "wf123" --location "My Account"
  node links.js update link123 --name "Updated Name" --location "My Account"
  node links.js delete link123 --location "My Account"

TRIGGER LINKS:
Trigger links are trackable URLs that can:
- Redirect users to any URL
- Add tags to the contact who clicked
- Trigger workflows when clicked
- Track click counts

Use them in emails, SMS, and other campaigns to track engagement.

WARNING: Deleting a link will break any existing references to it.
`);
}

// Main execution
async function main() {
  if (!command || command === 'help' || command === '--help' || command === '-h') {
    showHelp();
    return;
  }
  
  if (command === 'locations') {
    listLocations(locationsConfig);
    return;
  }
  
  const locationConfig = resolveLocation(args.location, locationsConfig);
  
  switch (command) {
    case 'list':
      await listLinks(locationConfig);
      break;
    case 'get':
      if (!args._[1]) {
        console.error('Error: Link ID required');
        process.exit(1);
      }
      await getLink(args._[1], locationConfig);
      break;
    case 'create':
      await createLink(locationConfig);
      break;
    case 'update':
      if (!args._[1]) {
        console.error('Error: Link ID required');
        process.exit(1);
      }
      await updateLink(args._[1], locationConfig);
      break;
    case 'delete':
      if (!args._[1]) {
        console.error('Error: Link ID required');
        process.exit(1);
      }
      await deleteLink(args._[1], locationConfig);
      break;
    default:
      console.error(`Unknown command: ${command}`);
      console.error('Run "node links.js help" for usage');
      process.exit(1);
  }
}

main();
