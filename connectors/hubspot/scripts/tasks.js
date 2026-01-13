#!/usr/bin/env node

/**
 * HubSpot Tasks Management
 * Create, read, update, and delete tasks.
 */

import { fileURLToPath } from 'url';
import path from 'path';
import {
  loadEnv, getToken, parseArgs, apiRequest, apiRequestPaginated,
  confirmDestructiveAction, formatDate, handleError, showHelp
} from './utils.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
loadEnv(path.join(__dirname, '..'));

const OBJECT_TYPE = 'tasks';

// Help documentation
function printHelp() {
  showHelp('HubSpot Tasks', {
    'Commands': [
      'list                        List all tasks',
      'get <id>                    Get task by ID',
      'create                      Create a new task',
      'update <id>                 Update a task',
      'complete <id>               Mark task as complete',
      'delete <id>                 Delete a task (destructive)',
      'help                        Show this help'
    ],
    'Options': [
      '--subject <text>            Task subject/title (required for create)',
      '--body <text>               Task description/notes',
      '--due <date>                Due date (YYYY-MM-DD or YYYY-MM-DDTHH:MM:SS)',
      '--priority <level>          Priority: LOW, MEDIUM, HIGH',
      '--status <status>           Status: NOT_STARTED, IN_PROGRESS, COMPLETED',
      '--type <type>               Type: TODO, CALL, EMAIL',
      '--owner <id>                Owner user ID',
      '--contact <id>              Associate with contact ID',
      '--company <id>              Associate with company ID',
      '--deal <id>                 Associate with deal ID',
      '--limit <n>                 Results per page (default: 100)',
      '--all                       Fetch all pages',
      '--verbose                   Show full API response',
      '--force                     Skip confirmation for delete'
    ],
    'Examples': [
      'node tasks.js list',
      'node tasks.js list --all',
      'node tasks.js get 12345',
      'node tasks.js create --subject "Follow up call" --due 2024-01-20 --contact 67890',
      'node tasks.js create --subject "Send proposal" --priority HIGH --deal 11111',
      'node tasks.js update 12345 --status IN_PROGRESS',
      'node tasks.js complete 12345',
      'node tasks.js delete 12345'
    ],
    'Task Types': [
      'TODO - General to-do item',
      'CALL - Phone call task',
      'EMAIL - Email task'
    ]
  });
}

// List all tasks
async function listTasks(args) {
  const token = getToken();
  const limit = parseInt(args.limit) || 100;
  const all = args.all || false;
  
  console.log('Fetching tasks...\n');
  
  const properties = 'hs_task_subject,hs_task_body,hs_task_status,hs_task_priority,hs_timestamp';
  const endpoint = `/crm/v3/objects/${OBJECT_TYPE}?properties=${properties}`;
  const { results, meta } = await apiRequestPaginated(endpoint, token, { all, limit });
  
  if (args.verbose) {
    console.log(JSON.stringify(results, null, 2));
    return;
  }
  
  console.log(`Found ${meta.total} tasks${all ? '' : ' (page 1)'}:\n`);
  
  for (const task of results) {
    const props = task.properties;
    console.log(`- ${props.hs_task_subject || 'No subject'}`);
    console.log(`  ID: ${task.id}`);
    console.log(`  Status: ${props.hs_task_status || 'N/A'}`);
    console.log(`  Priority: ${props.hs_task_priority || 'N/A'}`);
    if (props.hs_timestamp) console.log(`  Due: ${formatDate(props.hs_timestamp)}`);
    console.log(`  Created: ${formatDate(task.createdAt)}`);
    console.log('');
  }
}

// Get single task
async function getTask(id, args) {
  const token = getToken();
  
  const properties = 'hs_task_subject,hs_task_body,hs_task_status,hs_task_priority,hs_task_type,hs_timestamp,hubspot_owner_id';
  const endpoint = `/crm/v3/objects/${OBJECT_TYPE}/${id}?properties=${properties}`;
  const task = await apiRequest('GET', endpoint, token);
  
  if (args.verbose) {
    console.log(JSON.stringify(task, null, 2));
    return;
  }
  
  const props = task.properties;
  
  console.log(`Task: ${props.hs_task_subject || 'No subject'}\n`);
  console.log(`ID: ${task.id}`);
  console.log(`Status: ${props.hs_task_status || 'N/A'}`);
  console.log(`Priority: ${props.hs_task_priority || 'N/A'}`);
  console.log(`Type: ${props.hs_task_type || 'N/A'}`);
  console.log(`Due: ${props.hs_timestamp ? formatDate(props.hs_timestamp) : 'N/A'}`);
  console.log(`Owner ID: ${props.hubspot_owner_id || 'N/A'}`);
  if (props.hs_task_body) console.log(`\nDescription:\n${props.hs_task_body}`);
  console.log(`\nCreated: ${formatDate(task.createdAt)}`);
  console.log(`Updated: ${formatDate(task.updatedAt)}`);
}

// Create task
async function createTask(args) {
  const token = getToken();
  
  if (!args.subject) {
    console.error('Error: --subject is required');
    process.exit(1);
  }
  
  const properties = {
    hs_task_subject: args.subject,
    hs_task_status: args.status || 'NOT_STARTED'
  };
  
  if (args.body) properties.hs_task_body = args.body;
  if (args.due) properties.hs_timestamp = new Date(args.due).toISOString();
  if (args.priority) properties.hs_task_priority = args.priority.toUpperCase();
  if (args.type) properties.hs_task_type = args.type.toUpperCase();
  if (args.owner) properties.hubspot_owner_id = args.owner;
  
  // Create the task
  const task = await apiRequest('POST', `/crm/v3/objects/${OBJECT_TYPE}`, token, { properties });
  
  console.log('Task created successfully!');
  console.log(`ID: ${task.id}`);
  console.log(`Subject: ${task.properties.hs_task_subject}\n`);
  
  // Associate with objects if specified
  const associations = [];
  if (args.contact) associations.push({ type: 'contacts', id: args.contact, typeId: 204 });
  if (args.company) associations.push({ type: 'companies', id: args.company, typeId: 192 });
  if (args.deal) associations.push({ type: 'deals', id: args.deal, typeId: 216 });
  
  for (const assoc of associations) {
    try {
      const assocBody = [{
        associationCategory: 'HUBSPOT_DEFINED',
        associationTypeId: assoc.typeId
      }];
      await apiRequest('PUT', `/crm/v4/objects/tasks/${task.id}/associations/${assoc.type}/${assoc.id}`, token, assocBody);
      console.log(`Associated with ${assoc.type}/${assoc.id}`);
    } catch (error) {
      console.error(`Warning: Failed to associate with ${assoc.type}/${assoc.id}: ${error.message}`);
    }
  }
}

// Update task
async function updateTask(id, args) {
  const token = getToken();
  
  const properties = {};
  
  if (args.subject) properties.hs_task_subject = args.subject;
  if (args.body) properties.hs_task_body = args.body;
  if (args.due) properties.hs_timestamp = new Date(args.due).toISOString();
  if (args.priority) properties.hs_task_priority = args.priority.toUpperCase();
  if (args.status) properties.hs_task_status = args.status.toUpperCase();
  if (args.type) properties.hs_task_type = args.type.toUpperCase();
  if (args.owner) properties.hubspot_owner_id = args.owner;
  
  if (Object.keys(properties).length === 0) {
    console.error('Error: No properties to update.');
    console.error('Use --subject, --body, --due, --priority, --status, --type, or --owner');
    process.exit(1);
  }
  
  const task = await apiRequest('PATCH', `/crm/v3/objects/${OBJECT_TYPE}/${id}`, token, { properties });
  
  if (args.verbose) {
    console.log(JSON.stringify(task, null, 2));
    return;
  }
  
  console.log('Task updated successfully!');
  console.log(`ID: ${task.id}`);
  console.log(`Updated properties: ${Object.keys(properties).join(', ')}`);
}

// Complete task
async function completeTask(id, args) {
  const token = getToken();
  
  const properties = {
    hs_task_status: 'COMPLETED'
  };
  
  const task = await apiRequest('PATCH', `/crm/v3/objects/${OBJECT_TYPE}/${id}`, token, { properties });
  
  console.log('Task marked as complete!');
  console.log(`ID: ${task.id}`);
}

// Delete task
async function deleteTask(id, args) {
  const token = getToken();
  
  // Get task info first
  const task = await apiRequest('GET', `/crm/v3/objects/${OBJECT_TYPE}/${id}?properties=hs_task_subject`, token);
  const subject = task.properties.hs_task_subject || 'Untitled task';
  
  const confirmed = await confirmDestructiveAction(
    `Delete task: ${subject}`,
    [
      `ID: ${id}`,
      'This task will be permanently removed.'
    ],
    args.force
  );
  
  if (!confirmed) return;
  
  await apiRequest('DELETE', `/crm/v3/objects/${OBJECT_TYPE}/${id}`, token);
  
  console.log('Task deleted successfully.');
}

// Main
async function main() {
  const args = parseArgs(process.argv.slice(2));
  const command = args._[0];
  
  try {
    switch (command) {
      case 'list':
        await listTasks(args);
        break;
      case 'get':
        if (!args._[1]) {
          console.error('Error: Task ID required');
          console.error('Usage: node tasks.js get <id>');
          process.exit(1);
        }
        await getTask(args._[1], args);
        break;
      case 'create':
        await createTask(args);
        break;
      case 'update':
        if (!args._[1]) {
          console.error('Error: Task ID required');
          console.error('Usage: node tasks.js update <id> --property value');
          process.exit(1);
        }
        await updateTask(args._[1], args);
        break;
      case 'complete':
        if (!args._[1]) {
          console.error('Error: Task ID required');
          console.error('Usage: node tasks.js complete <id>');
          process.exit(1);
        }
        await completeTask(args._[1], args);
        break;
      case 'delete':
        if (!args._[1]) {
          console.error('Error: Task ID required');
          console.error('Usage: node tasks.js delete <id>');
          process.exit(1);
        }
        await deleteTask(args._[1], args);
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
