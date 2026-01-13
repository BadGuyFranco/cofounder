#!/usr/bin/env node

/**
 * Go High Level Tasks Script
 * Manage tasks for contacts.
 * 
 * Usage:
 *   node tasks.js list --contact-id <id> --location "Name"
 *   node tasks.js get <task-id> --contact-id <id> --location "Name"
 *   node tasks.js create --contact-id <id> --title "Task" --due "datetime" --location "Name"
 *   node tasks.js update <task-id> --contact-id <id> [options] --location "Name"
 *   node tasks.js complete <task-id> --contact-id <id> --location "Name"
 *   node tasks.js delete <task-id> --contact-id <id> --location "Name"
 *   node tasks.js locations
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
  formatDate,
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

// List tasks for a contact
async function listTasks(contactId, location, verbose) {
  const data = await apiRequest('GET', `/contacts/${contactId}/tasks`, location.key);
  
  const tasks = data.tasks || [];
  console.log(`Found ${tasks.length} tasks:\n`);
  
  for (const task of tasks) {
    const status = task.completed ? '[X]' : '[ ]';
    console.log(`${status} ${task.title || 'Untitled'}`);
    console.log(`   ID: ${task.id}`);
    if (task.dueDate) console.log(`   Due: ${formatDate(task.dueDate)}`);
    if (task.description) console.log(`   ${task.description}`);
    if (task.assignedTo) console.log(`   Assigned to: ${task.assignedTo}`);
    console.log('');
  }
  
  if (verbose) {
    console.log('\nFull response:');
    console.log(JSON.stringify(data, null, 2));
  }
  
  return tasks;
}

// Get task details
async function getTask(taskId, contactId, location, verbose) {
  const data = await apiRequest('GET', `/contacts/${contactId}/tasks/${taskId}`, location.key);
  
  const task = data.task || data;
  const status = task.completed ? 'Completed' : 'Pending';
  console.log(`Task: ${task.title || 'Untitled'}`);
  console.log(`ID: ${task.id}`);
  console.log(`Status: ${status}`);
  console.log(`Due: ${formatDate(task.dueDate)}`);
  console.log(`Description: ${task.description || 'N/A'}`);
  console.log(`Assigned To: ${task.assignedTo || 'N/A'}`);
  console.log(`Created: ${formatDate(task.dateAdded)}`);
  
  if (verbose) {
    console.log('\nFull response:');
    console.log(JSON.stringify(data, null, 2));
  }
  
  return task;
}

// Create task
async function createTask(contactId, options, location, verbose) {
  const body = {
    title: options.title,
    dueDate: options.due || options.dueDate
  };
  
  if (options.description) body.description = options.description;
  if (options.assignedTo) body.assignedTo = options.assignedTo;
  
  const data = await apiRequest('POST', `/contacts/${contactId}/tasks`, location.key, body);
  
  console.log('Task created successfully!');
  console.log(`Task ID: ${data.task?.id || data.id}`);
  console.log(`Title: ${options.title}`);
  console.log(`Due: ${formatDate(options.due || options.dueDate)}`);
  
  if (verbose) {
    console.log('\nFull response:');
    console.log(JSON.stringify(data, null, 2));
  }
  
  return data;
}

// Update task
async function updateTask(taskId, contactId, options, location, verbose) {
  const body = {};
  
  if (options.title) body.title = options.title;
  if (options.due || options.dueDate) body.dueDate = options.due || options.dueDate;
  if (options.description) body.description = options.description;
  if (options.assignedTo) body.assignedTo = options.assignedTo;
  if (options.completed !== undefined) body.completed = options.completed;
  
  const data = await apiRequest('PUT', `/contacts/${contactId}/tasks/${taskId}`, location.key, body);
  
  console.log(`Updated task: ${taskId}`);
  
  if (verbose) {
    console.log('\nFull response:');
    console.log(JSON.stringify(data, null, 2));
  }
  
  return data;
}

// Complete task
async function completeTask(taskId, contactId, location, verbose) {
  const data = await apiRequest('PUT', `/contacts/${contactId}/tasks/${taskId}`, location.key, {
    completed: true
  });
  
  console.log(`Completed task: ${taskId}`);
  
  if (verbose) {
    console.log('\nFull response:');
    console.log(JSON.stringify(data, null, 2));
  }
  
  return data;
}

// Delete task
async function deleteTask(taskId, contactId, location, verbose, force = false) {
  // Get task details for confirmation
  let taskTitle = taskId;
  try {
    const taskData = await apiRequest('GET', `/contacts/${contactId}/tasks/${taskId}`, location.key);
    taskTitle = taskData.task?.title || taskData.title || taskId;
  } catch (e) {
    // Continue with ID only
  }
  
  const confirmed = await confirmDestructiveAction(
    'You are about to DELETE a task.',
    [
      `Task: ${taskTitle}`,
      `ID: ${taskId}`,
      `Contact ID: ${contactId}`,
      '',
      'This action cannot be undone.'
    ],
    force
  );
  
  if (!confirmed) {
    process.exit(0);
  }
  
  const data = await apiRequest('DELETE', `/contacts/${contactId}/tasks/${taskId}`, location.key);
  
  console.log(`Deleted task: ${taskId}`);
  
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
        const contactId = args['contact-id'];
        
        if (!contactId) {
          console.error('Error: --contact-id is required');
          console.error('Usage: node tasks.js list --contact-id <id> --location "Name"');
          process.exit(1);
        }
        
        await listTasks(contactId, location, verbose);
        break;
      }
      
      case 'get': {
        const location = resolveLocation(args.location, locationsConfig);
        const taskId = args._[1];
        const contactId = args['contact-id'];
        
        if (!taskId || !contactId) {
          console.error('Error: Task ID and --contact-id are required');
          console.error('Usage: node tasks.js get <task-id> --contact-id <id> --location "Name"');
          process.exit(1);
        }
        
        await getTask(taskId, contactId, location, verbose);
        break;
      }
      
      case 'create': {
        const location = resolveLocation(args.location, locationsConfig);
        const contactId = args['contact-id'];
        const title = args.title;
        
        if (!contactId || !title) {
          console.error('Error: --contact-id and --title are required');
          console.error('Usage: node tasks.js create --contact-id <id> --title "Task" [--due "datetime"] --location "Name"');
          process.exit(1);
        }
        
        await createTask(contactId, {
          title: title,
          due: args.due,
          dueDate: args.dueDate,
          description: args.description,
          assignedTo: args['assigned-to']
        }, location, verbose);
        break;
      }
      
      case 'update': {
        const location = resolveLocation(args.location, locationsConfig);
        const taskId = args._[1];
        const contactId = args['contact-id'];
        
        if (!taskId || !contactId) {
          console.error('Error: Task ID and --contact-id are required');
          console.error('Usage: node tasks.js update <task-id> --contact-id <id> [options] --location "Name"');
          process.exit(1);
        }
        
        await updateTask(taskId, contactId, {
          title: args.title,
          due: args.due,
          dueDate: args.dueDate,
          description: args.description,
          assignedTo: args['assigned-to']
        }, location, verbose);
        break;
      }
      
      case 'complete': {
        const location = resolveLocation(args.location, locationsConfig);
        const taskId = args._[1];
        const contactId = args['contact-id'];
        
        if (!taskId || !contactId) {
          console.error('Error: Task ID and --contact-id are required');
          console.error('Usage: node tasks.js complete <task-id> --contact-id <id> --location "Name"');
          process.exit(1);
        }
        
        await completeTask(taskId, contactId, location, verbose);
        break;
      }
      
      case 'delete': {
        const location = resolveLocation(args.location, locationsConfig);
        const taskId = args._[1];
        const contactId = args['contact-id'];
        
        if (!taskId || !contactId) {
          console.error('Error: Task ID and --contact-id are required');
          console.error('Usage: node tasks.js delete <task-id> --contact-id <id> --location "Name"');
          process.exit(1);
        }
        
        await deleteTask(taskId, contactId, location, verbose, args.force);
        break;
      }
      
      default:
        console.log('Go High Level Tasks Script');
        console.log('');
        console.log('Commands:');
        console.log('  list --contact-id <id> --location     List tasks for a contact');
        console.log('  get <task-id> --contact-id <id>       Get task details');
        console.log('  create --contact-id <id> --title      Create a new task');
        console.log('  update <task-id> --contact-id <id>    Update a task');
        console.log('  complete <task-id> --contact-id <id>  Mark task as complete');
        console.log('  delete <task-id> --contact-id <id>    Delete a task');
        console.log('  locations                             List available locations');
        console.log('');
        console.log('Location Options:');
        console.log('  --location "Name"             Specify which GHL account to use');
        console.log('');
        console.log('Create/Update Options:');
        console.log('  --contact-id <id>             Contact ID (required)');
        console.log('  --title "Task title"          Task title');
        console.log('  --due "2024-01-15T10:00"      Due date/time');
        console.log('  --description "Details"       Task description');
        console.log('  --assigned-to <user-id>       Assign to user');
        console.log('');
        console.log('Global Options:');
        console.log('  --verbose                     Show full API responses');
        console.log('  --force                       Skip confirmation for destructive actions');
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
