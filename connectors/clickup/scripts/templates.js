#!/usr/bin/env node

/**
 * ClickUp Templates Script
 * Work with task and list templates.
 *
 * Usage:
 *   node templates.js list <workspace-id>
 *   node templates.js create-from-task <task-id> --name "Template Name"
 *   node templates.js help
 *
 * Note: ClickUp template API support is limited. Most template operations
 * are performed through the web interface.
 */

import { parseArgs, apiRequest } from './utils.js';

/**
 * Format template for display
 */
function formatTemplate(template) {
  const output = [];

  output.push(`${template.name}`);
  output.push(`  ID: ${template.id}`);

  if (template.date_created) {
    output.push(`  Created: ${new Date(parseInt(template.date_created)).toISOString()}`);
  }

  return output.join('\n');
}

/**
 * List templates in a workspace
 */
async function listTemplates(workspaceId, options, verbose) {
  const params = new URLSearchParams();
  params.append('page', options.page || '0');

  const queryString = params.toString();
  const endpoint = `/team/${workspaceId}/taskTemplate?${queryString}`;

  const data = await apiRequest(endpoint);

  const templates = data.templates || [];
  console.log(`Found ${templates.length} template(s):\n`);

  for (const template of templates) {
    console.log(formatTemplate(template));
    console.log('');
  }

  if (verbose) {
    console.log('\nFull response:');
    console.log(JSON.stringify(data, null, 2));
  }

  return templates;
}

/**
 * Create a task from a template
 */
async function createTaskFromTemplate(listId, templateId, name, verbose) {
  const body = {
    name
  };

  const data = await apiRequest(`/list/${listId}/taskTemplate/${templateId}`, {
    method: 'POST',
    body
  });

  console.log('Created task from template:');
  console.log(`  Task ID: ${data.id || data.task?.id || 'created'}`);
  console.log(`  Name: ${name}`);
  console.log(`  List: ${listId}`);
  console.log(`  Template: ${templateId}`);

  if (verbose) {
    console.log('\nFull response:');
    console.log(JSON.stringify(data, null, 2));
  }

  return data;
}

/**
 * Show help
 */
function showHelp() {
  console.log('ClickUp Templates Script');
  console.log('');
  console.log('Commands:');
  console.log('  list <workspace-id>                       List task templates');
  console.log('  create <list-id> <template-id> --name     Create task from template');
  console.log('  help                                      Show this help');
  console.log('');
  console.log('Options:');
  console.log('  --verbose                Show full API responses');
  console.log('  --name "..."             Name for the new task');
  console.log('  --page <n>               Page number for list (0-indexed)');
  console.log('');
  console.log('Examples:');
  console.log('  # List templates');
  console.log('  node templates.js list 12345678');
  console.log('');
  console.log('  # Create task from template');
  console.log('  node templates.js create 87654321 template-uuid --name "New Feature"');
  console.log('');
  console.log('Template Types:');
  console.log('  ClickUp has several template types:');
  console.log('  - Task Templates: Pre-configured task structures');
  console.log('  - List Templates: Pre-configured lists with tasks');
  console.log('  - Space Templates: Entire space configurations');
  console.log('');
  console.log('Creating Templates:');
  console.log('  Templates are created through the ClickUp web interface:');
  console.log('  1. Open a task or list');
  console.log('  2. Click "..." menu');
  console.log('  3. Select "Save as Template"');
  console.log('');
  console.log('Note: The API primarily supports using existing templates to create');
  console.log('      new tasks. Creating and managing templates is done via the UI.');
}

/**
 * Main entry point
 */
async function main() {
  const args = parseArgs(process.argv.slice(2));
  const command = args._[0];
  const verbose = args.verbose || false;

  try {
    switch (command) {
      case 'list': {
        const workspaceId = args._[1];
        if (!workspaceId) {
          console.error('Error: Workspace ID is required');
          console.error('Usage: node templates.js list <workspace-id>');
          process.exit(1);
        }
        await listTemplates(workspaceId, {
          page: args.page
        }, verbose);
        break;
      }

      case 'create': {
        const listId = args._[1];
        const templateId = args._[2];
        if (!listId || !templateId) {
          console.error('Error: List ID and Template ID are required');
          console.error('Usage: node templates.js create <list-id> <template-id> --name "..."');
          process.exit(1);
        }
        if (!args.name) {
          console.error('Error: --name is required');
          process.exit(1);
        }
        await createTaskFromTemplate(listId, templateId, args.name, verbose);
        break;
      }

      case 'help':
      default:
        showHelp();
        break;
    }
  } catch (error) {
    console.error('Error:', error.message);
    if (error.code) {
      console.error('Code:', error.code);
    }
    if (verbose && error.details) {
      console.error('Details:', JSON.stringify(error.details, null, 2));
    }
    process.exit(1);
  }
}

main();
