#!/usr/bin/env node

/**
 * ClickUp Tasks Script
 * Create, read, update, and delete tasks.
 *
 * Usage:
 *   node tasks.js list <list-id> [options]
 *   node tasks.js get <task-id>
 *   node tasks.js create <list-id> --name "Task Name" [options]
 *   node tasks.js update <task-id> [options]
 *   node tasks.js delete <task-id> [--force]
 *   node tasks.js search <workspace-id> --query "search term"
 *   node tasks.js subtasks <task-id>
 *   node tasks.js help
 */

import { parseArgs, apiRequest, formatTask, parseJSON, toTimestamp, toPriority } from './utils.js';
import * as readline from 'readline';

/**
 * List tasks in a list
 */
async function listTasks(listId, options, verbose) {
  const params = new URLSearchParams();

  if (options.archived) params.append('archived', 'true');
  if (options.subtasks) params.append('subtasks', 'true');
  if (options.statuses) {
    const statusList = parseJSON(options.statuses, 'statuses');
    for (const status of statusList) {
      params.append('statuses[]', status);
    }
  }
  if (options.assignees) {
    const assigneeList = parseJSON(options.assignees, 'assignees');
    for (const assignee of assigneeList) {
      params.append('assignees[]', assignee);
    }
  }
  if (options.dueDateGt) params.append('due_date_gt', options.dueDateGt);
  if (options.dueDateLt) params.append('due_date_lt', options.dueDateLt);
  if (options.dateCreatedGt) params.append('date_created_gt', options.dateCreatedGt);
  if (options.dateCreatedLt) params.append('date_created_lt', options.dateCreatedLt);
  if (options.dateUpdatedGt) params.append('date_updated_gt', options.dateUpdatedGt);
  if (options.dateUpdatedLt) params.append('date_updated_lt', options.dateUpdatedLt);
  if (options.orderBy) params.append('order_by', options.orderBy);
  if (options.reverse) params.append('reverse', 'true');

  const queryString = params.toString();
  const endpoint = `/list/${listId}/task${queryString ? '?' + queryString : ''}`;

  const data = await apiRequest(endpoint);

  const tasks = data.tasks || [];
  console.log(`Found ${tasks.length} task(s):\n`);

  for (const task of tasks) {
    console.log(formatTask(task, verbose));
    console.log('');
  }

  if (verbose) {
    console.log('\nFull response:');
    console.log(JSON.stringify(data, null, 2));
  }

  return tasks;
}

/**
 * Get a single task by ID
 */
async function getTask(taskId, verbose) {
  const task = await apiRequest(`/task/${taskId}?include_subtasks=true`);

  console.log(formatTask(task, true));

  if (task.subtasks && task.subtasks.length > 0) {
    console.log('\nSubtasks:');
    for (const subtask of task.subtasks) {
      console.log(`  - ${subtask.name}`);
      console.log(`    ID: ${subtask.id}`);
      if (subtask.status) {
        console.log(`    Status: ${subtask.status.status}`);
      }
    }
  }

  if (task.custom_fields && task.custom_fields.length > 0) {
    console.log('\nCustom Fields:');
    for (const field of task.custom_fields) {
      const value = field.value !== undefined ? field.value : '(not set)';
      console.log(`  - ${field.name}: ${value}`);
    }
  }

  if (task.checklists && task.checklists.length > 0) {
    console.log('\nChecklists:');
    for (const checklist of task.checklists) {
      const completed = checklist.items?.filter(i => i.resolved).length || 0;
      const total = checklist.items?.length || 0;
      console.log(`  - ${checklist.name} (${completed}/${total})`);
    }
  }

  if (verbose) {
    console.log('\nFull response:');
    console.log(JSON.stringify(task, null, 2));
  }

  return task;
}

/**
 * Create a new task
 */
async function createTask(listId, name, options, verbose) {
  const body = { name };

  if (options.description) body.description = options.description;
  if (options.status) body.status = options.status;
  if (options.priority) body.priority = toPriority(options.priority);
  if (options.dueDate) body.due_date = toTimestamp(options.dueDate);
  if (options.startDate) body.start_date = toTimestamp(options.startDate);
  if (options.timeEstimate) body.time_estimate = parseInt(options.timeEstimate) * 60000; // minutes to ms
  if (options.assignees) body.assignees = parseJSON(options.assignees, 'assignees');
  if (options.tags) body.tags = parseJSON(options.tags, 'tags');
  if (options.parent) body.parent = options.parent;

  // Custom fields
  if (options.customFields) {
    body.custom_fields = parseJSON(options.customFields, 'custom-fields');
  }

  const task = await apiRequest(`/list/${listId}/task`, {
    method: 'POST',
    body
  });

  console.log('Created task:');
  console.log(formatTask(task, true));

  if (verbose) {
    console.log('\nFull response:');
    console.log(JSON.stringify(task, null, 2));
  }

  return task;
}

/**
 * Update a task
 */
async function updateTask(taskId, options, verbose) {
  const body = {};

  if (options.name) body.name = options.name;
  if (options.description) body.description = options.description;
  if (options.status) body.status = options.status;
  if (options.priority) body.priority = toPriority(options.priority);
  if (options.dueDate) body.due_date = toTimestamp(options.dueDate);
  if (options.startDate) body.start_date = toTimestamp(options.startDate);
  if (options.timeEstimate) body.time_estimate = parseInt(options.timeEstimate) * 60000;
  if (options.archived !== undefined) body.archived = options.archived === 'true';

  // Handle clearing fields
  if (options.clearDueDate) body.due_date = null;
  if (options.clearStartDate) body.start_date = null;
  if (options.clearPriority) body.priority = null;

  const task = await apiRequest(`/task/${taskId}`, {
    method: 'PUT',
    body
  });

  console.log('Updated task:');
  console.log(formatTask(task, true));

  if (verbose) {
    console.log('\nFull response:');
    console.log(JSON.stringify(task, null, 2));
  }

  return task;
}

/**
 * Add assignees to a task
 */
async function addAssignees(taskId, assignees, verbose) {
  const body = {
    add: parseJSON(assignees, 'assignees')
  };

  const task = await apiRequest(`/task/${taskId}`, {
    method: 'PUT',
    body: { assignees: body }
  });

  console.log('Updated task assignees:');
  console.log(formatTask(task, false));

  return task;
}

/**
 * Remove assignees from a task
 */
async function removeAssignees(taskId, assignees, verbose) {
  const body = {
    rem: parseJSON(assignees, 'assignees')
  };

  const task = await apiRequest(`/task/${taskId}`, {
    method: 'PUT',
    body: { assignees: body }
  });

  console.log('Updated task assignees:');
  console.log(formatTask(task, false));

  return task;
}

/**
 * Delete a task
 */
async function deleteTask(taskId, force, verbose) {
  if (!force) {
    const confirmed = await confirmDelete(taskId);
    if (!confirmed) {
      console.log('Delete cancelled.');
      return null;
    }
  }

  await apiRequest(`/task/${taskId}`, {
    method: 'DELETE'
  });

  console.log(`Deleted task: ${taskId}`);
  return { success: true, id: taskId };
}

/**
 * Search tasks across a workspace
 */
async function searchTasks(workspaceId, query, options, verbose) {
  const params = new URLSearchParams();

  params.append('query', query);
  if (options.includeArchived) params.append('include_archived', 'true');

  const queryString = params.toString();
  const endpoint = `/team/${workspaceId}/task?${queryString}`;

  const data = await apiRequest(endpoint);

  const tasks = data.tasks || [];
  console.log(`Found ${tasks.length} task(s) matching "${query}":\n`);

  for (const task of tasks) {
    console.log(formatTask(task, verbose));
    console.log('');
  }

  if (verbose) {
    console.log('\nFull response:');
    console.log(JSON.stringify(data, null, 2));
  }

  return tasks;
}

/**
 * List subtasks of a task
 */
async function listSubtasks(taskId, verbose) {
  const task = await apiRequest(`/task/${taskId}?include_subtasks=true`);

  const subtasks = task.subtasks || [];
  console.log(`Found ${subtasks.length} subtask(s):\n`);

  for (const subtask of subtasks) {
    console.log(formatTask(subtask, verbose));
    console.log('');
  }

  if (verbose) {
    console.log('\nFull response:');
    console.log(JSON.stringify(task.subtasks, null, 2));
  }

  return subtasks;
}

/**
 * Confirm deletion
 */
async function confirmDelete(taskId) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  return new Promise((resolve) => {
    rl.question(`Are you sure you want to delete task ${taskId}? (yes/no): `, (answer) => {
      rl.close();
      resolve(answer.toLowerCase() === 'yes' || answer.toLowerCase() === 'y');
    });
  });
}

/**
 * Show help
 */
function showHelp() {
  console.log('ClickUp Tasks Script');
  console.log('');
  console.log('Commands:');
  console.log('  list <list-id>                      List tasks in a list');
  console.log('  get <task-id>                       Get task details');
  console.log('  create <list-id> --name "..."       Create a task');
  console.log('  update <task-id> [options]          Update a task');
  console.log('  delete <task-id>                    Delete a task');
  console.log('  search <workspace-id> --query "..." Search tasks');
  console.log('  subtasks <task-id>                  List subtasks');
  console.log('  help                                Show this help');
  console.log('');
  console.log('Create/Update Options:');
  console.log('  --name "..."                Task name');
  console.log('  --description "..."         Task description');
  console.log('  --status "..."              Status name (e.g., "in progress")');
  console.log('  --priority <level>          urgent, high, normal, low (or 1-4)');
  console.log('  --due-date <date>           Due date (YYYY-MM-DD or ISO)');
  console.log('  --start-date <date>         Start date (YYYY-MM-DD or ISO)');
  console.log('  --time-estimate <minutes>   Time estimate in minutes');
  console.log('  --assignees "[ids]"         Assignee user IDs (JSON array)');
  console.log('  --tags "[names]"            Tag names (JSON array)');
  console.log('  --parent <task-id>          Parent task ID (for subtasks)');
  console.log('  --custom-fields "[{}]"      Custom field values (JSON)');
  console.log('');
  console.log('Update-only Options:');
  console.log('  --clear-due-date            Remove due date');
  console.log('  --clear-start-date          Remove start date');
  console.log('  --clear-priority            Remove priority');
  console.log('  --archived true/false       Archive/unarchive task');
  console.log('');
  console.log('List Options:');
  console.log('  --statuses "[names]"        Filter by status names');
  console.log('  --assignees "[ids]"         Filter by assignee IDs');
  console.log('  --due-date-gt <timestamp>   Due date greater than');
  console.log('  --due-date-lt <timestamp>   Due date less than');
  console.log('  --order-by <field>          Sort by: due_date, created, updated, id');
  console.log('  --reverse                   Reverse sort order');
  console.log('  --subtasks                  Include subtasks');
  console.log('  --archived                  Include archived');
  console.log('');
  console.log('Other Options:');
  console.log('  --verbose                   Show full API responses');
  console.log('  --force                     Skip delete confirmation');
  console.log('');
  console.log('Examples:');
  console.log('  # List tasks');
  console.log('  node tasks.js list 12345678');
  console.log('');
  console.log('  # List tasks with status filter');
  console.log('  node tasks.js list 12345678 --statuses \'["in progress", "review"]\'');
  console.log('');
  console.log('  # Get task details');
  console.log('  node tasks.js get abc123');
  console.log('');
  console.log('  # Create task');
  console.log('  node tasks.js create 12345678 --name "New Task" --priority high');
  console.log('');
  console.log('  # Create task with due date and assignee');
  console.log('  node tasks.js create 12345678 --name "Review docs" --due-date 2024-12-31 --assignees "[123456]"');
  console.log('');
  console.log('  # Create subtask');
  console.log('  node tasks.js create 12345678 --name "Subtask" --parent abc123');
  console.log('');
  console.log('  # Update task status');
  console.log('  node tasks.js update abc123 --status "complete"');
  console.log('');
  console.log('  # Update task priority and due date');
  console.log('  node tasks.js update abc123 --priority urgent --due-date 2024-12-25');
  console.log('');
  console.log('  # Search tasks');
  console.log('  node tasks.js search 12345678 --query "bug fix"');
  console.log('');
  console.log('  # Delete task');
  console.log('  node tasks.js delete abc123');
  console.log('');
  console.log('Priority Levels:');
  console.log('  1 or urgent  - Urgent (red)');
  console.log('  2 or high    - High (yellow)');
  console.log('  3 or normal  - Normal (blue)');
  console.log('  4 or low     - Low (gray)');
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
        const listId = args._[1];
        if (!listId) {
          console.error('Error: List ID is required');
          console.error('Usage: node tasks.js list <list-id>');
          process.exit(1);
        }
        await listTasks(listId, {
          archived: args.archived,
          subtasks: args.subtasks,
          statuses: args.statuses,
          assignees: args.assignees,
          dueDateGt: args['due-date-gt'],
          dueDateLt: args['due-date-lt'],
          dateCreatedGt: args['date-created-gt'],
          dateCreatedLt: args['date-created-lt'],
          dateUpdatedGt: args['date-updated-gt'],
          dateUpdatedLt: args['date-updated-lt'],
          orderBy: args['order-by'],
          reverse: args.reverse
        }, verbose);
        break;
      }

      case 'get': {
        const taskId = args._[1];
        if (!taskId) {
          console.error('Error: Task ID is required');
          console.error('Usage: node tasks.js get <task-id>');
          process.exit(1);
        }
        await getTask(taskId, verbose);
        break;
      }

      case 'create': {
        const listId = args._[1];
        if (!listId) {
          console.error('Error: List ID is required');
          console.error('Usage: node tasks.js create <list-id> --name "..."');
          process.exit(1);
        }
        if (!args.name) {
          console.error('Error: --name is required');
          console.error('Usage: node tasks.js create <list-id> --name "..."');
          process.exit(1);
        }
        await createTask(listId, args.name, {
          description: args.description,
          status: args.status,
          priority: args.priority,
          dueDate: args['due-date'],
          startDate: args['start-date'],
          timeEstimate: args['time-estimate'],
          assignees: args.assignees,
          tags: args.tags,
          parent: args.parent,
          customFields: args['custom-fields']
        }, verbose);
        break;
      }

      case 'update': {
        const taskId = args._[1];
        if (!taskId) {
          console.error('Error: Task ID is required');
          console.error('Usage: node tasks.js update <task-id> [options]');
          process.exit(1);
        }
        await updateTask(taskId, {
          name: args.name,
          description: args.description,
          status: args.status,
          priority: args.priority,
          dueDate: args['due-date'],
          startDate: args['start-date'],
          timeEstimate: args['time-estimate'],
          archived: args.archived,
          clearDueDate: args['clear-due-date'],
          clearStartDate: args['clear-start-date'],
          clearPriority: args['clear-priority']
        }, verbose);
        break;
      }

      case 'delete': {
        const taskId = args._[1];
        if (!taskId) {
          console.error('Error: Task ID is required');
          console.error('Usage: node tasks.js delete <task-id>');
          process.exit(1);
        }
        await deleteTask(taskId, args.force, verbose);
        break;
      }

      case 'search': {
        const workspaceId = args._[1];
        if (!workspaceId) {
          console.error('Error: Workspace ID is required');
          console.error('Usage: node tasks.js search <workspace-id> --query "..."');
          process.exit(1);
        }
        if (!args.query) {
          console.error('Error: --query is required');
          console.error('Usage: node tasks.js search <workspace-id> --query "..."');
          process.exit(1);
        }
        await searchTasks(workspaceId, args.query, {
          includeArchived: args['include-archived']
        }, verbose);
        break;
      }

      case 'subtasks': {
        const taskId = args._[1];
        if (!taskId) {
          console.error('Error: Task ID is required');
          console.error('Usage: node tasks.js subtasks <task-id>');
          process.exit(1);
        }
        await listSubtasks(taskId, verbose);
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
