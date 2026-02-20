#!/usr/bin/env node

/**
 * Zoho CRM Tags Management
 * Create, read, update, delete tags for organizing records.
 */

import { fileURLToPath } from 'url';
import path from 'path';
import {
  initScript, parseArgs, apiRequest, confirmDestructiveAction, handleError, showHelp
} from './utils.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Help documentation
function printHelp() {
  showHelp('Zoho CRM Tags', {
    'Commands': [
      'list <module>               List tags in a module',
      'create <module>             Create a new tag',
      'update <module> <id>        Update a tag',
      'delete <module> <id>        Delete a tag',
      'merge <module>              Merge two tags',
      'add <module> <record_id>    Add tag(s) to a record',
      'remove <module> <record_id> Remove tag(s) from a record',
      'count <module> <id>         Get record count for a tag',
      'help                        Show this help'
    ],
    'Options': [
      '--org <name>                Organization to use',
      '--name <name>               Tag name',
      '--color <code>              Tag color code',
      '--tags <list>               Comma-separated tag names',
      '--source <id>               Source tag ID (for merge)',
      '--target <id>               Target tag ID (for merge)',
      '--verbose                   Show full API response',
      '--force                     Skip confirmation for destructive actions'
    ],
    'Examples': [
      'node tags.js list Leads',
      'node tags.js create Leads --name "Hot Lead" --color "#FF0000"',
      'node tags.js update Leads 123 --name "Very Hot Lead"',
      'node tags.js add Leads 456 --tags "Hot Lead,Priority"',
      'node tags.js remove Leads 456 --tags "Hot Lead"',
      'node tags.js merge Leads --source 111 --target 222',
      'node tags.js count Leads 123',
      'node tags.js delete Leads 123'
    ],
    'Color Codes': [
      'Use hex color codes: #FF0000 (red), #00FF00 (green), etc.',
      'Or Zoho color names: tag-red, tag-green, tag-blue, etc.'
    ]
  });
}

// List tags in a module
async function listTags(moduleName, args) {
  const { config, token } = await initScript(args);
  
  console.log(`Fetching tags for ${moduleName}...\n`);
  
  const data = await apiRequest('GET', `/settings/tags?module=${moduleName}`, token, null, { region: config.region });
  
  if (args.verbose) {
    console.log(JSON.stringify(data, null, 2));
    return;
  }
  
  const tags = data.tags || [];
  
  console.log(`Found ${tags.length} tags:\n`);
  
  for (const tag of tags) {
    const color = tag.color_code ? ` [${tag.color_code}]` : '';
    console.log(`- ${tag.name}${color}`);
    console.log(`  ID: ${tag.id}`);
    console.log('');
  }
}

// Create tag
async function createTag(moduleName, args) {
  const { config, token } = await initScript(args);
  
  if (!args.name) {
    console.error('Error: --name is required');
    process.exit(1);
  }
  
  const tag = {
    name: args.name
  };
  
  if (args.color) {
    tag.color_code = args.color;
  }
  
  const body = { tags: [tag] };
  
  const data = await apiRequest('POST', `/settings/tags?module=${moduleName}`, token, body, { region: config.region });
  
  if (args.verbose) {
    console.log(JSON.stringify(data, null, 2));
    return;
  }
  
  if (data.tags && data.tags[0]) {
    const result = data.tags[0];
    if (result.status === 'success') {
      console.log('Tag created successfully!\n');
      console.log(`ID: ${result.details.id}`);
      console.log(`Name: ${args.name}`);
    } else {
      console.error(`Error: ${result.message}`);
      process.exit(1);
    }
  }
}

// Update tag
async function updateTag(moduleName, tagId, args) {
  const { config, token } = await initScript(args);
  
  const tag = { id: tagId };
  
  if (args.name) tag.name = args.name;
  if (args.color) tag.color_code = args.color;
  
  if (!args.name && !args.color) {
    console.error('Error: Provide --name or --color to update');
    process.exit(1);
  }
  
  const body = { tags: [tag] };
  
  const data = await apiRequest('PUT', `/settings/tags/${tagId}?module=${moduleName}`, token, body, { region: config.region });
  
  if (args.verbose) {
    console.log(JSON.stringify(data, null, 2));
    return;
  }
  
  if (data.tags && data.tags[0]) {
    const result = data.tags[0];
    if (result.status === 'success') {
      console.log('Tag updated successfully!');
    } else {
      console.error(`Error: ${result.message}`);
      process.exit(1);
    }
  }
}

// Delete tag
async function deleteTag(moduleName, tagId, args) {
  const { config, token } = await initScript(args);
  
  // Get tag info first
  let tagName = tagId;
  try {
    const existing = await apiRequest('GET', `/settings/tags?module=${moduleName}`, token, null, { region: config.region });
    const tag = (existing.tags || []).find(t => t.id === tagId);
    if (tag) tagName = tag.name;
  } catch (e) {
    // Proceed with ID
  }
  
  const confirmed = await confirmDestructiveAction(
    `Delete tag: ${tagName}`,
    [`ID: ${tagId}`, `Module: ${moduleName}`, 'Tag will be removed from all records.'],
    args.force
  );
  
  if (!confirmed) return;
  
  const data = await apiRequest('DELETE', `/settings/tags/${tagId}?module=${moduleName}`, token, null, { region: config.region });
  
  if (args.verbose) {
    console.log(JSON.stringify(data, null, 2));
    return;
  }
  
  console.log('Tag deleted successfully.');
}

// Merge tags
async function mergeTags(moduleName, args) {
  const { config, token } = await initScript(args);
  
  if (!args.source) {
    console.error('Error: --source <tag_id> is required');
    process.exit(1);
  }
  
  if (!args.target) {
    console.error('Error: --target <tag_id> is required');
    process.exit(1);
  }
  
  const body = {
    tags: [{
      conflict_id: args.source
    }]
  };
  
  const data = await apiRequest('POST', `/settings/tags/${args.target}/actions/merge?module=${moduleName}`, token, body, { region: config.region });
  
  if (args.verbose) {
    console.log(JSON.stringify(data, null, 2));
    return;
  }
  
  if (data.tags && data.tags[0]) {
    const result = data.tags[0];
    if (result.status === 'success') {
      console.log('Tags merged successfully!');
      console.log(`Records from tag ${args.source} are now under tag ${args.target}`);
    } else {
      console.error(`Error: ${result.message}`);
      process.exit(1);
    }
  }
}

// Add tags to record
async function addTagsToRecord(moduleName, recordId, args) {
  const { config, token } = await initScript(args);
  
  if (!args.tags) {
    console.error('Error: --tags is required');
    console.error('Usage: --tags "Tag1,Tag2,Tag3"');
    process.exit(1);
  }
  
  const tagNames = args.tags.split(',').map(t => t.trim());
  
  const body = {
    tags: tagNames.map(name => ({ name })),
    ids: [recordId]
  };
  
  const data = await apiRequest('POST', `/${moduleName}/actions/add_tags`, token, body, { region: config.region });
  
  if (args.verbose) {
    console.log(JSON.stringify(data, null, 2));
    return;
  }
  
  if (data.data && data.data[0]) {
    const result = data.data[0];
    if (result.status === 'success') {
      console.log('Tags added successfully!');
      console.log(`Added to record: ${recordId}`);
      console.log(`Tags: ${tagNames.join(', ')}`);
    } else {
      console.error(`Error: ${result.message}`);
      process.exit(1);
    }
  }
}

// Remove tags from record
async function removeTagsFromRecord(moduleName, recordId, args) {
  const { config, token } = await initScript(args);
  
  if (!args.tags) {
    console.error('Error: --tags is required');
    console.error('Usage: --tags "Tag1,Tag2,Tag3"');
    process.exit(1);
  }
  
  const tagNames = args.tags.split(',').map(t => t.trim());
  
  const body = {
    tags: tagNames.map(name => ({ name })),
    ids: [recordId]
  };
  
  const data = await apiRequest('POST', `/${moduleName}/actions/remove_tags`, token, body, { region: config.region });
  
  if (args.verbose) {
    console.log(JSON.stringify(data, null, 2));
    return;
  }
  
  if (data.data && data.data[0]) {
    const result = data.data[0];
    if (result.status === 'success') {
      console.log('Tags removed successfully!');
      console.log(`Removed from record: ${recordId}`);
      console.log(`Tags: ${tagNames.join(', ')}`);
    } else {
      console.error(`Error: ${result.message}`);
      process.exit(1);
    }
  }
}

// Get tag record count
async function getTagCount(moduleName, tagId, args) {
  const { config, token } = await initScript(args);
  
  const data = await apiRequest('GET', `/settings/tags/${tagId}/actions/records_count?module=${moduleName}`, token, null, { region: config.region });
  
  if (args.verbose) {
    console.log(JSON.stringify(data, null, 2));
    return;
  }
  
  console.log(`Tag Record Count\n`);
  console.log(`Tag ID: ${tagId}`);
  console.log(`Module: ${moduleName}`);
  console.log(`Count: ${data.count || 0}`);
}

// Main
async function main() {
  const args = parseArgs(process.argv.slice(2));
  const command = args._[0];
  
  try {
    switch (command) {
      case 'list':
        if (!args._[1]) {
          console.error('Error: Module name required');
          console.error('Usage: node tags.js list <module>');
          process.exit(1);
        }
        await listTags(args._[1], args);
        break;
      case 'create':
        if (!args._[1]) {
          console.error('Error: Module name required');
          process.exit(1);
        }
        await createTag(args._[1], args);
        break;
      case 'update':
        if (!args._[1] || !args._[2]) {
          console.error('Error: Module name and tag ID required');
          console.error('Usage: node tags.js update <module> <tag_id> --name "New Name"');
          process.exit(1);
        }
        await updateTag(args._[1], args._[2], args);
        break;
      case 'delete':
        if (!args._[1] || !args._[2]) {
          console.error('Error: Module name and tag ID required');
          process.exit(1);
        }
        await deleteTag(args._[1], args._[2], args);
        break;
      case 'merge':
        if (!args._[1]) {
          console.error('Error: Module name required');
          process.exit(1);
        }
        await mergeTags(args._[1], args);
        break;
      case 'add':
        if (!args._[1] || !args._[2]) {
          console.error('Error: Module name and record ID required');
          console.error('Usage: node tags.js add <module> <record_id> --tags "Tag1,Tag2"');
          process.exit(1);
        }
        await addTagsToRecord(args._[1], args._[2], args);
        break;
      case 'remove':
        if (!args._[1] || !args._[2]) {
          console.error('Error: Module name and record ID required');
          console.error('Usage: node tags.js remove <module> <record_id> --tags "Tag1,Tag2"');
          process.exit(1);
        }
        await removeTagsFromRecord(args._[1], args._[2], args);
        break;
      case 'count':
        if (!args._[1] || !args._[2]) {
          console.error('Error: Module name and tag ID required');
          console.error('Usage: node tags.js count <module> <tag_id>');
          process.exit(1);
        }
        await getTagCount(args._[1], args._[2], args);
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
