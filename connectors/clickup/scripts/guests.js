#!/usr/bin/env node

/**
 * ClickUp Guests Script
 * Invite and manage guests on tasks.
 *
 * Usage:
 *   node guests.js invite <task-id> --email <email>
 *   node guests.js list <task-id>
 *   node guests.js remove <task-id> <guest-id> [--force]
 *   node guests.js help
 */

import { parseArgs, apiRequest } from './utils.js';
import * as readline from 'readline';

/**
 * Format guest for display
 */
function formatGuest(guest) {
  const output = [];

  output.push(`${guest.username || guest.email}`);
  output.push(`  ID: ${guest.id}`);

  if (guest.email) {
    output.push(`  Email: ${guest.email}`);
  }

  if (guest.initials) {
    output.push(`  Initials: ${guest.initials}`);
  }

  return output.join('\n');
}

/**
 * Invite a guest to a task
 */
async function inviteGuest(taskId, email, options, verbose) {
  const body = {
    email,
    ...(options.canEdit !== undefined && { can_edit: options.canEdit === 'true' }),
    ...(options.canComment !== undefined && { can_comment: options.canComment === 'true' }),
    ...(options.canSeeTimeSpent !== undefined && { can_see_time_spent: options.canSeeTimeSpent === 'true' }),
    ...(options.canSeeTimeEstimated !== undefined && { can_see_time_estimated: options.canSeeTimeEstimated === 'true' })
  };

  const data = await apiRequest(`/task/${taskId}/guest`, {
    method: 'POST',
    body
  });

  console.log('Invited guest:');
  console.log(`  Email: ${email}`);
  console.log(`  Task: ${taskId}`);

  if (data.guest) {
    console.log(`  Guest ID: ${data.guest.id}`);
  }

  if (verbose) {
    console.log('\nFull response:');
    console.log(JSON.stringify(data, null, 2));
  }

  return data;
}

/**
 * List guests on a task
 */
async function listGuests(taskId, verbose) {
  // Get task to see shared_with/guests
  const task = await apiRequest(`/task/${taskId}`);

  // Guests are typically in shared_with or a similar field
  const guests = task.shared || task.shared_with || [];

  console.log(`Task: ${task.name}`);
  console.log(`Found ${guests.length} guest(s):\n`);

  for (const guest of guests) {
    console.log(formatGuest(guest));
    console.log('');
  }

  if (guests.length === 0) {
    console.log('No guests have been invited to this task.');
  }

  if (verbose) {
    console.log('\nFull task response:');
    console.log(JSON.stringify(task, null, 2));
  }

  return guests;
}

/**
 * Remove a guest from a task
 */
async function removeGuest(taskId, guestId, force, verbose) {
  if (!force) {
    const confirmed = await confirmRemove(guestId);
    if (!confirmed) {
      console.log('Remove cancelled.');
      return null;
    }
  }

  await apiRequest(`/task/${taskId}/guest/${guestId}`, {
    method: 'DELETE'
  });

  console.log(`Removed guest ${guestId} from task ${taskId}`);
  return { success: true, guestId };
}

/**
 * Confirm removal
 */
async function confirmRemove(guestId) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  return new Promise((resolve) => {
    rl.question(`Are you sure you want to remove guest ${guestId}? (yes/no): `, (answer) => {
      rl.close();
      resolve(answer.toLowerCase() === 'yes' || answer.toLowerCase() === 'y');
    });
  });
}

/**
 * Show help
 */
function showHelp() {
  console.log('ClickUp Guests Script');
  console.log('');
  console.log('Commands:');
  console.log('  invite <task-id> --email <email>      Invite guest to task');
  console.log('  list <task-id>                        List guests on task');
  console.log('  remove <task-id> <guest-id>           Remove guest from task');
  console.log('  help                                  Show this help');
  console.log('');
  console.log('Options:');
  console.log('  --verbose                Show full API responses');
  console.log('  --force                  Skip remove confirmation');
  console.log('  --email <email>          Guest email address');
  console.log('  --can-edit true/false    Allow guest to edit');
  console.log('  --can-comment true/false Allow guest to comment');
  console.log('  --can-see-time-spent     Allow guest to see time spent');
  console.log('  --can-see-time-estimated Allow guest to see time estimates');
  console.log('');
  console.log('Examples:');
  console.log('  # Invite a guest to a task');
  console.log('  node guests.js invite abc123 --email "guest@example.com"');
  console.log('');
  console.log('  # Invite with edit permissions');
  console.log('  node guests.js invite abc123 --email "guest@example.com" --can-edit true');
  console.log('');
  console.log('  # List guests on a task');
  console.log('  node guests.js list abc123');
  console.log('');
  console.log('  # Remove a guest');
  console.log('  node guests.js remove abc123 guest-uuid');
  console.log('');
  console.log('Guest vs Member:');
  console.log('  - Members: Full workspace access, added by admin');
  console.log('  - Guests: Limited access to specific tasks/lists, invited by email');
  console.log('');
  console.log('Guest Permissions:');
  console.log('  Guests can be given various levels of access:');
  console.log('  - View only (default)');
  console.log('  - Can comment');
  console.log('  - Can edit');
  console.log('  - Can see time tracking info');
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
      case 'invite': {
        const taskId = args._[1];
        if (!taskId) {
          console.error('Error: Task ID is required');
          console.error('Usage: node guests.js invite <task-id> --email <email>');
          process.exit(1);
        }
        if (!args.email) {
          console.error('Error: --email is required');
          process.exit(1);
        }
        await inviteGuest(taskId, args.email, {
          canEdit: args['can-edit'],
          canComment: args['can-comment'],
          canSeeTimeSpent: args['can-see-time-spent'],
          canSeeTimeEstimated: args['can-see-time-estimated']
        }, verbose);
        break;
      }

      case 'list': {
        const taskId = args._[1];
        if (!taskId) {
          console.error('Error: Task ID is required');
          console.error('Usage: node guests.js list <task-id>');
          process.exit(1);
        }
        await listGuests(taskId, verbose);
        break;
      }

      case 'remove': {
        const taskId = args._[1];
        const guestId = args._[2];
        if (!taskId || !guestId) {
          console.error('Error: Task ID and Guest ID are required');
          console.error('Usage: node guests.js remove <task-id> <guest-id>');
          process.exit(1);
        }
        await removeGuest(taskId, guestId, args.force, verbose);
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
