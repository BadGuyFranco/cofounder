#!/usr/bin/env node

/**
 * ClickUp Time Tracking Script
 * Track time on tasks, manage time entries.
 *
 * Usage:
 *   node time.js list <task-id>
 *   node time.js get <interval-id>
 *   node time.js create <task-id> --duration <ms> [options]
 *   node time.js start <task-id>
 *   node time.js stop <workspace-id>
 *   node time.js running <workspace-id>
 *   node time.js update <interval-id> [options]
 *   node time.js delete <interval-id> [--force]
 *   node time.js range <workspace-id> --start <date> --end <date>
 *   node time.js help
 */

import { parseArgs, apiRequest, toTimestamp } from './utils.js';
import * as readline from 'readline';

/**
 * Format time entry for display
 */
function formatTimeEntry(entry) {
  const output = [];

  output.push(`Time Entry ID: ${entry.id}`);

  if (entry.task) {
    output.push(`  Task: ${entry.task.name} (${entry.task.id})`);
  }

  if (entry.user) {
    output.push(`  User: ${entry.user.username || entry.user.email}`);
  }

  if (entry.duration !== undefined) {
    const hours = Math.floor(entry.duration / 3600000);
    const minutes = Math.floor((entry.duration % 3600000) / 60000);
    output.push(`  Duration: ${hours}h ${minutes}m (${entry.duration}ms)`);
  }

  if (entry.start) {
    output.push(`  Start: ${new Date(parseInt(entry.start)).toISOString()}`);
  }

  if (entry.end) {
    output.push(`  End: ${new Date(parseInt(entry.end)).toISOString()}`);
  }

  if (entry.description) {
    output.push(`  Description: ${entry.description}`);
  }

  if (entry.billable !== undefined) {
    output.push(`  Billable: ${entry.billable}`);
  }

  return output.join('\n');
}

/**
 * List time entries for a task
 */
async function listTimeEntries(taskId, verbose) {
  const data = await apiRequest(`/task/${taskId}/time`);

  const entries = data.data || [];
  console.log(`Found ${entries.length} time entry(ies):\n`);

  for (const entry of entries) {
    console.log(formatTimeEntry(entry));
    console.log('');
  }

  if (verbose) {
    console.log('\nFull response:');
    console.log(JSON.stringify(data, null, 2));
  }

  return entries;
}

/**
 * Get a single time entry
 */
async function getTimeEntry(workspaceId, intervalId, verbose) {
  const data = await apiRequest(`/team/${workspaceId}/time_entries/${intervalId}`);

  const entry = data.data;
  console.log(formatTimeEntry(entry));

  if (verbose) {
    console.log('\nFull response:');
    console.log(JSON.stringify(data, null, 2));
  }

  return entry;
}

/**
 * Create a time entry (manual)
 */
async function createTimeEntry(taskId, duration, options, verbose) {
  const body = {
    duration: parseInt(duration),
    ...(options.description && { description: options.description }),
    ...(options.start && { start: toTimestamp(options.start) }),
    ...(options.end && { end: toTimestamp(options.end) }),
    ...(options.billable !== undefined && { billable: options.billable === 'true' }),
    ...(options.assignee && { assignee: parseInt(options.assignee) })
  };

  const data = await apiRequest(`/task/${taskId}/time`, {
    method: 'POST',
    body
  });

  console.log('Created time entry:');
  console.log(formatTimeEntry(data.data));

  if (verbose) {
    console.log('\nFull response:');
    console.log(JSON.stringify(data, null, 2));
  }

  return data.data;
}

/**
 * Start a timer on a task
 */
async function startTimer(taskId, options, verbose) {
  const body = {
    tid: taskId,
    ...(options.description && { description: options.description }),
    ...(options.billable !== undefined && { billable: options.billable === 'true' })
  };

  const data = await apiRequest(`/team/${options.workspaceId}/time_entries/start`, {
    method: 'POST',
    body
  });

  console.log('Started timer:');
  if (data.data) {
    console.log(formatTimeEntry(data.data));
  } else {
    console.log(JSON.stringify(data, null, 2));
  }

  if (verbose) {
    console.log('\nFull response:');
    console.log(JSON.stringify(data, null, 2));
  }

  return data;
}

/**
 * Stop the current running timer
 */
async function stopTimer(workspaceId, verbose) {
  const data = await apiRequest(`/team/${workspaceId}/time_entries/stop`, {
    method: 'POST'
  });

  console.log('Stopped timer:');
  if (data.data) {
    console.log(formatTimeEntry(data.data));
  } else {
    console.log('No timer was running.');
  }

  if (verbose) {
    console.log('\nFull response:');
    console.log(JSON.stringify(data, null, 2));
  }

  return data;
}

/**
 * Get currently running time entry
 */
async function getRunningTimer(workspaceId, options, verbose) {
  const params = new URLSearchParams();
  if (options.assignee) params.append('assignee', options.assignee);

  const queryString = params.toString();
  const endpoint = `/team/${workspaceId}/time_entries/current${queryString ? '?' + queryString : ''}`;

  const data = await apiRequest(endpoint);

  if (data.data) {
    console.log('Currently running timer:');
    console.log(formatTimeEntry(data.data));
  } else {
    console.log('No timer currently running.');
  }

  if (verbose) {
    console.log('\nFull response:');
    console.log(JSON.stringify(data, null, 2));
  }

  return data.data;
}

/**
 * Update a time entry
 */
async function updateTimeEntry(workspaceId, intervalId, options, verbose) {
  const body = {};

  if (options.description) body.description = options.description;
  if (options.start) body.start = toTimestamp(options.start);
  if (options.end) body.end = toTimestamp(options.end);
  if (options.duration) body.duration = parseInt(options.duration);
  if (options.billable !== undefined) body.billable = options.billable === 'true';
  if (options.tagAction && options.tags) {
    body.tag_action = options.tagAction;
    body.tags = JSON.parse(options.tags);
  }

  const data = await apiRequest(`/team/${workspaceId}/time_entries/${intervalId}`, {
    method: 'PUT',
    body
  });

  console.log('Updated time entry:');
  if (data.data) {
    console.log(formatTimeEntry(data.data));
  } else {
    console.log(`Time entry ${intervalId} updated.`);
  }

  if (verbose) {
    console.log('\nFull response:');
    console.log(JSON.stringify(data, null, 2));
  }

  return data;
}

/**
 * Delete a time entry
 */
async function deleteTimeEntry(workspaceId, intervalId, force, verbose) {
  if (!force) {
    const confirmed = await confirmDelete(intervalId);
    if (!confirmed) {
      console.log('Delete cancelled.');
      return null;
    }
  }

  await apiRequest(`/team/${workspaceId}/time_entries/${intervalId}`, {
    method: 'DELETE'
  });

  console.log(`Deleted time entry: ${intervalId}`);
  return { success: true, id: intervalId };
}

/**
 * Get time entries within a date range
 */
async function getTimeEntriesInRange(workspaceId, startDate, endDate, options, verbose) {
  const params = new URLSearchParams();
  params.append('start_date', toTimestamp(startDate));
  params.append('end_date', toTimestamp(endDate));

  if (options.assignee) params.append('assignee', options.assignee);
  if (options.includeTaskTags) params.append('include_task_tags', 'true');
  if (options.includeLocationNames) params.append('include_location_names', 'true');

  const queryString = params.toString();
  const endpoint = `/team/${workspaceId}/time_entries?${queryString}`;

  const data = await apiRequest(endpoint);

  const entries = data.data || [];
  console.log(`Found ${entries.length} time entry(ies) in range:\n`);

  for (const entry of entries) {
    console.log(formatTimeEntry(entry));
    console.log('');
  }

  if (verbose) {
    console.log('\nFull response:');
    console.log(JSON.stringify(data, null, 2));
  }

  return entries;
}

/**
 * Confirm deletion
 */
async function confirmDelete(intervalId) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  return new Promise((resolve) => {
    rl.question(`Are you sure you want to delete time entry ${intervalId}? (yes/no): `, (answer) => {
      rl.close();
      resolve(answer.toLowerCase() === 'yes' || answer.toLowerCase() === 'y');
    });
  });
}

/**
 * Show help
 */
function showHelp() {
  console.log('ClickUp Time Tracking Script');
  console.log('');
  console.log('Commands:');
  console.log('  list <task-id>                         List time entries for a task');
  console.log('  get <workspace-id> <interval-id>       Get a time entry');
  console.log('  create <task-id> --duration <ms>       Create manual time entry');
  console.log('  start <task-id> --workspace <id>       Start a timer');
  console.log('  stop <workspace-id>                    Stop running timer');
  console.log('  running <workspace-id>                 Get running timer');
  console.log('  update <workspace-id> <interval-id>    Update a time entry');
  console.log('  delete <workspace-id> <interval-id>    Delete a time entry');
  console.log('  range <workspace-id> --start --end     Get entries in date range');
  console.log('  help                                   Show this help');
  console.log('');
  console.log('Options:');
  console.log('  --verbose                Show full API responses');
  console.log('  --force                  Skip delete confirmation');
  console.log('  --duration <ms>          Duration in milliseconds');
  console.log('  --description "..."      Time entry description');
  console.log('  --start <date>           Start time (YYYY-MM-DD or ISO)');
  console.log('  --end <date>             End time (YYYY-MM-DD or ISO)');
  console.log('  --billable true/false    Mark as billable');
  console.log('  --assignee <user-id>     User ID for the time entry');
  console.log('  --workspace <id>         Workspace ID (required for start)');
  console.log('');
  console.log('Examples:');
  console.log('  # List time entries for a task');
  console.log('  node time.js list abc123');
  console.log('');
  console.log('  # Create manual time entry (1 hour = 3600000ms)');
  console.log('  node time.js create abc123 --duration 3600000 --description "Development"');
  console.log('');
  console.log('  # Start a timer');
  console.log('  node time.js start abc123 --workspace 12345678');
  console.log('');
  console.log('  # Stop running timer');
  console.log('  node time.js stop 12345678');
  console.log('');
  console.log('  # Get running timer');
  console.log('  node time.js running 12345678');
  console.log('');
  console.log('  # Get time entries for a date range');
  console.log('  node time.js range 12345678 --start 2024-01-01 --end 2024-01-31');
  console.log('');
  console.log('Duration Reference:');
  console.log('  1 minute  = 60000ms');
  console.log('  1 hour    = 3600000ms');
  console.log('  8 hours   = 28800000ms');
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
        const taskId = args._[1];
        if (!taskId) {
          console.error('Error: Task ID is required');
          console.error('Usage: node time.js list <task-id>');
          process.exit(1);
        }
        await listTimeEntries(taskId, verbose);
        break;
      }

      case 'get': {
        const workspaceId = args._[1];
        const intervalId = args._[2];
        if (!workspaceId || !intervalId) {
          console.error('Error: Workspace ID and Interval ID are required');
          console.error('Usage: node time.js get <workspace-id> <interval-id>');
          process.exit(1);
        }
        await getTimeEntry(workspaceId, intervalId, verbose);
        break;
      }

      case 'create': {
        const taskId = args._[1];
        if (!taskId) {
          console.error('Error: Task ID is required');
          console.error('Usage: node time.js create <task-id> --duration <ms>');
          process.exit(1);
        }
        if (!args.duration) {
          console.error('Error: --duration is required');
          console.error('Usage: node time.js create <task-id> --duration <ms>');
          process.exit(1);
        }
        await createTimeEntry(taskId, args.duration, {
          description: args.description,
          start: args.start,
          end: args.end,
          billable: args.billable,
          assignee: args.assignee
        }, verbose);
        break;
      }

      case 'start': {
        const taskId = args._[1];
        if (!taskId) {
          console.error('Error: Task ID is required');
          console.error('Usage: node time.js start <task-id> --workspace <id>');
          process.exit(1);
        }
        if (!args.workspace) {
          console.error('Error: --workspace is required');
          console.error('Usage: node time.js start <task-id> --workspace <id>');
          process.exit(1);
        }
        await startTimer(taskId, {
          workspaceId: args.workspace,
          description: args.description,
          billable: args.billable
        }, verbose);
        break;
      }

      case 'stop': {
        const workspaceId = args._[1];
        if (!workspaceId) {
          console.error('Error: Workspace ID is required');
          console.error('Usage: node time.js stop <workspace-id>');
          process.exit(1);
        }
        await stopTimer(workspaceId, verbose);
        break;
      }

      case 'running': {
        const workspaceId = args._[1];
        if (!workspaceId) {
          console.error('Error: Workspace ID is required');
          console.error('Usage: node time.js running <workspace-id>');
          process.exit(1);
        }
        await getRunningTimer(workspaceId, {
          assignee: args.assignee
        }, verbose);
        break;
      }

      case 'update': {
        const workspaceId = args._[1];
        const intervalId = args._[2];
        if (!workspaceId || !intervalId) {
          console.error('Error: Workspace ID and Interval ID are required');
          console.error('Usage: node time.js update <workspace-id> <interval-id> [options]');
          process.exit(1);
        }
        await updateTimeEntry(workspaceId, intervalId, {
          description: args.description,
          start: args.start,
          end: args.end,
          duration: args.duration,
          billable: args.billable,
          tagAction: args['tag-action'],
          tags: args.tags
        }, verbose);
        break;
      }

      case 'delete': {
        const workspaceId = args._[1];
        const intervalId = args._[2];
        if (!workspaceId || !intervalId) {
          console.error('Error: Workspace ID and Interval ID are required');
          console.error('Usage: node time.js delete <workspace-id> <interval-id>');
          process.exit(1);
        }
        await deleteTimeEntry(workspaceId, intervalId, args.force, verbose);
        break;
      }

      case 'range': {
        const workspaceId = args._[1];
        if (!workspaceId) {
          console.error('Error: Workspace ID is required');
          console.error('Usage: node time.js range <workspace-id> --start <date> --end <date>');
          process.exit(1);
        }
        if (!args.start || !args.end) {
          console.error('Error: --start and --end are required');
          console.error('Usage: node time.js range <workspace-id> --start <date> --end <date>');
          process.exit(1);
        }
        await getTimeEntriesInRange(workspaceId, args.start, args.end, {
          assignee: args.assignee,
          includeTaskTags: args['include-task-tags'],
          includeLocationNames: args['include-location-names']
        }, verbose);
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
