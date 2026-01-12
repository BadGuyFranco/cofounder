#!/usr/bin/env node

/**
 * ClickUp Goals Script
 * Manage goals and key results.
 *
 * Usage:
 *   node goals.js list <workspace-id>
 *   node goals.js get <goal-id>
 *   node goals.js create <workspace-id> --name "Goal Name"
 *   node goals.js update <goal-id> [options]
 *   node goals.js delete <goal-id> [--force]
 *   node goals.js key-result-create <goal-id> --name "KR Name" --type <type>
 *   node goals.js key-result-update <key-result-id> [options]
 *   node goals.js key-result-delete <key-result-id> [--force]
 *   node goals.js help
 */

import { parseArgs, apiRequest, toTimestamp } from './utils.js';
import * as readline from 'readline';

/**
 * Format goal for display
 */
function formatGoal(goal) {
  const output = [];

  output.push(`${goal.name}`);
  output.push(`  ID: ${goal.id}`);

  if (goal.team_id) {
    output.push(`  Workspace: ${goal.team_id}`);
  }

  if (goal.due_date) {
    output.push(`  Due: ${new Date(parseInt(goal.due_date)).toISOString().split('T')[0]}`);
  }

  if (goal.description) {
    output.push(`  Description: ${goal.description.substring(0, 100)}${goal.description.length > 100 ? '...' : ''}`);
  }

  if (goal.owner) {
    output.push(`  Owner: ${goal.owner.username || goal.owner.email}`);
  }

  if (goal.percent_completed !== undefined) {
    output.push(`  Progress: ${goal.percent_completed}%`);
  }

  if (goal.key_results && goal.key_results.length > 0) {
    output.push(`  Key Results: ${goal.key_results.length}`);
  }

  return output.join('\n');
}

/**
 * Format key result for display
 */
function formatKeyResult(kr) {
  const output = [];

  output.push(`  - ${kr.name}`);
  output.push(`    ID: ${kr.id}`);
  output.push(`    Type: ${kr.type}`);

  if (kr.steps_current !== undefined && kr.steps_end !== undefined) {
    output.push(`    Progress: ${kr.steps_current}/${kr.steps_end}`);
  }

  if (kr.percent_completed !== undefined) {
    output.push(`    Completed: ${kr.percent_completed}%`);
  }

  if (kr.owner) {
    output.push(`    Owner: ${kr.owner.username || kr.owner.email}`);
  }

  return output.join('\n');
}

/**
 * List goals in a workspace
 */
async function listGoals(workspaceId, options, verbose) {
  const params = new URLSearchParams();
  if (options.includeCompleted) params.append('include_completed', 'true');

  const queryString = params.toString();
  const endpoint = `/team/${workspaceId}/goal${queryString ? '?' + queryString : ''}`;

  const data = await apiRequest(endpoint);

  const goals = data.goals || [];
  console.log(`Found ${goals.length} goal(s):\n`);

  for (const goal of goals) {
    console.log(formatGoal(goal));
    console.log('');
  }

  if (verbose) {
    console.log('\nFull response:');
    console.log(JSON.stringify(data, null, 2));
  }

  return goals;
}

/**
 * Get a single goal
 */
async function getGoal(goalId, verbose) {
  const data = await apiRequest(`/goal/${goalId}`);

  const goal = data.goal;
  console.log(formatGoal(goal));

  if (goal.key_results && goal.key_results.length > 0) {
    console.log('\nKey Results:');
    for (const kr of goal.key_results) {
      console.log(formatKeyResult(kr));
    }
  }

  if (verbose) {
    console.log('\nFull response:');
    console.log(JSON.stringify(data, null, 2));
  }

  return goal;
}

/**
 * Create a goal
 */
async function createGoal(workspaceId, name, options, verbose) {
  const body = {
    name,
    ...(options.dueDate && { due_date: toTimestamp(options.dueDate) }),
    ...(options.description && { description: options.description }),
    ...(options.multipleOwners !== undefined && { multiple_owners: options.multipleOwners === 'true' }),
    ...(options.owners && { owners: JSON.parse(options.owners) }),
    ...(options.color && { color: options.color })
  };

  const data = await apiRequest(`/team/${workspaceId}/goal`, {
    method: 'POST',
    body
  });

  console.log('Created goal:');
  console.log(formatGoal(data.goal));

  if (verbose) {
    console.log('\nFull response:');
    console.log(JSON.stringify(data, null, 2));
  }

  return data.goal;
}

/**
 * Update a goal
 */
async function updateGoal(goalId, options, verbose) {
  const body = {};

  if (options.name) body.name = options.name;
  if (options.dueDate) body.due_date = toTimestamp(options.dueDate);
  if (options.description) body.description = options.description;
  if (options.color) body.color = options.color;
  if (options.addOwners) body.add_owners = JSON.parse(options.addOwners);
  if (options.remOwners) body.rem_owners = JSON.parse(options.remOwners);

  const data = await apiRequest(`/goal/${goalId}`, {
    method: 'PUT',
    body
  });

  console.log('Updated goal:');
  console.log(formatGoal(data.goal));

  if (verbose) {
    console.log('\nFull response:');
    console.log(JSON.stringify(data, null, 2));
  }

  return data.goal;
}

/**
 * Delete a goal
 */
async function deleteGoal(goalId, force, verbose) {
  if (!force) {
    const confirmed = await confirmDelete('goal', goalId);
    if (!confirmed) {
      console.log('Delete cancelled.');
      return null;
    }
  }

  await apiRequest(`/goal/${goalId}`, {
    method: 'DELETE'
  });

  console.log(`Deleted goal: ${goalId}`);
  return { success: true, id: goalId };
}

/**
 * Create a key result
 */
async function createKeyResult(goalId, name, type, options, verbose) {
  const body = {
    name,
    type, // number, currency, boolean, percentage, automatic
    ...(options.stepsStart !== undefined && { steps_start: parseInt(options.stepsStart) }),
    ...(options.stepsEnd !== undefined && { steps_end: parseInt(options.stepsEnd) }),
    ...(options.unit && { unit: options.unit }),
    ...(options.taskIds && { task_ids: JSON.parse(options.taskIds) }),
    ...(options.listIds && { list_ids: JSON.parse(options.listIds) }),
    ...(options.owners && { owners: JSON.parse(options.owners) })
  };

  const data = await apiRequest(`/goal/${goalId}/key_result`, {
    method: 'POST',
    body
  });

  console.log('Created key result:');
  if (data.key_result) {
    console.log(formatKeyResult(data.key_result));
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
 * Update a key result
 */
async function updateKeyResult(keyResultId, options, verbose) {
  const body = {};

  if (options.name) body.name = options.name;
  if (options.stepsCurrent !== undefined) body.steps_current = parseInt(options.stepsCurrent);
  if (options.stepsStart !== undefined) body.steps_start = parseInt(options.stepsStart);
  if (options.stepsEnd !== undefined) body.steps_end = parseInt(options.stepsEnd);
  if (options.unit) body.unit = options.unit;
  if (options.note) body.note = options.note;

  const data = await apiRequest(`/key_result/${keyResultId}`, {
    method: 'PUT',
    body
  });

  console.log('Updated key result:');
  if (data.key_result) {
    console.log(formatKeyResult(data.key_result));
  } else {
    console.log(`Key result ${keyResultId} updated.`);
  }

  if (verbose) {
    console.log('\nFull response:');
    console.log(JSON.stringify(data, null, 2));
  }

  return data;
}

/**
 * Delete a key result
 */
async function deleteKeyResult(keyResultId, force, verbose) {
  if (!force) {
    const confirmed = await confirmDelete('key result', keyResultId);
    if (!confirmed) {
      console.log('Delete cancelled.');
      return null;
    }
  }

  await apiRequest(`/key_result/${keyResultId}`, {
    method: 'DELETE'
  });

  console.log(`Deleted key result: ${keyResultId}`);
  return { success: true, id: keyResultId };
}

/**
 * Confirm deletion
 */
async function confirmDelete(type, id) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  return new Promise((resolve) => {
    rl.question(`Are you sure you want to delete ${type} ${id}? (yes/no): `, (answer) => {
      rl.close();
      resolve(answer.toLowerCase() === 'yes' || answer.toLowerCase() === 'y');
    });
  });
}

/**
 * Show help
 */
function showHelp() {
  console.log('ClickUp Goals Script');
  console.log('');
  console.log('Commands:');
  console.log('  list <workspace-id>                    List goals');
  console.log('  get <goal-id>                          Get goal details');
  console.log('  create <workspace-id> --name "..."     Create a goal');
  console.log('  update <goal-id> [options]             Update a goal');
  console.log('  delete <goal-id>                       Delete a goal');
  console.log('  key-result-create <goal-id> --name     Create a key result');
  console.log('  key-result-update <kr-id> [options]    Update a key result');
  console.log('  key-result-delete <kr-id>              Delete a key result');
  console.log('  help                                   Show this help');
  console.log('');
  console.log('Goal Options:');
  console.log('  --name "..."             Goal name');
  console.log('  --description "..."      Goal description');
  console.log('  --due-date <date>        Due date (YYYY-MM-DD)');
  console.log('  --color "#RRGGBB"        Goal color');
  console.log('  --owners "[ids]"         Owner user IDs (JSON array)');
  console.log('  --add-owners "[ids]"     Add owners (update only)');
  console.log('  --rem-owners "[ids]"     Remove owners (update only)');
  console.log('  --include-completed      Include completed goals (list)');
  console.log('');
  console.log('Key Result Options:');
  console.log('  --type <type>            Type: number, currency, boolean, percentage, automatic');
  console.log('  --steps-start <n>        Starting value');
  console.log('  --steps-end <n>          Target value');
  console.log('  --steps-current <n>      Current value (update)');
  console.log('  --unit "..."             Unit label (e.g., "$", "%", "items")');
  console.log('  --task-ids "[ids]"       Linked task IDs (automatic type)');
  console.log('  --list-ids "[ids]"       Linked list IDs (automatic type)');
  console.log('  --note "..."             Progress note (update)');
  console.log('');
  console.log('Other Options:');
  console.log('  --verbose                Show full API responses');
  console.log('  --force                  Skip delete confirmation');
  console.log('');
  console.log('Examples:');
  console.log('  # List goals');
  console.log('  node goals.js list 12345678');
  console.log('');
  console.log('  # Create a goal');
  console.log('  node goals.js create 12345678 --name "Q1 Revenue" --due-date 2024-03-31');
  console.log('');
  console.log('  # Get goal with key results');
  console.log('  node goals.js get abc-123-def');
  console.log('');
  console.log('  # Create a number key result');
  console.log('  node goals.js key-result-create abc-123-def --name "New customers" --type number --steps-start 0 --steps-end 100');
  console.log('');
  console.log('  # Update key result progress');
  console.log('  node goals.js key-result-update xyz-456 --steps-current 50 --note "Halfway there!"');
  console.log('');
  console.log('Key Result Types:');
  console.log('  number      - Track a numeric value');
  console.log('  currency    - Track money');
  console.log('  boolean     - True/false completion');
  console.log('  percentage  - Track percentage');
  console.log('  automatic   - Auto-calculate from linked tasks/lists');
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
          console.error('Usage: node goals.js list <workspace-id>');
          process.exit(1);
        }
        await listGoals(workspaceId, {
          includeCompleted: args['include-completed']
        }, verbose);
        break;
      }

      case 'get': {
        const goalId = args._[1];
        if (!goalId) {
          console.error('Error: Goal ID is required');
          console.error('Usage: node goals.js get <goal-id>');
          process.exit(1);
        }
        await getGoal(goalId, verbose);
        break;
      }

      case 'create': {
        const workspaceId = args._[1];
        if (!workspaceId) {
          console.error('Error: Workspace ID is required');
          console.error('Usage: node goals.js create <workspace-id> --name "..."');
          process.exit(1);
        }
        if (!args.name) {
          console.error('Error: --name is required');
          process.exit(1);
        }
        await createGoal(workspaceId, args.name, {
          dueDate: args['due-date'],
          description: args.description,
          multipleOwners: args['multiple-owners'],
          owners: args.owners,
          color: args.color
        }, verbose);
        break;
      }

      case 'update': {
        const goalId = args._[1];
        if (!goalId) {
          console.error('Error: Goal ID is required');
          console.error('Usage: node goals.js update <goal-id> [options]');
          process.exit(1);
        }
        await updateGoal(goalId, {
          name: args.name,
          dueDate: args['due-date'],
          description: args.description,
          color: args.color,
          addOwners: args['add-owners'],
          remOwners: args['rem-owners']
        }, verbose);
        break;
      }

      case 'delete': {
        const goalId = args._[1];
        if (!goalId) {
          console.error('Error: Goal ID is required');
          console.error('Usage: node goals.js delete <goal-id>');
          process.exit(1);
        }
        await deleteGoal(goalId, args.force, verbose);
        break;
      }

      case 'key-result-create': {
        const goalId = args._[1];
        if (!goalId) {
          console.error('Error: Goal ID is required');
          console.error('Usage: node goals.js key-result-create <goal-id> --name "..." --type <type>');
          process.exit(1);
        }
        if (!args.name || !args.type) {
          console.error('Error: --name and --type are required');
          process.exit(1);
        }
        await createKeyResult(goalId, args.name, args.type, {
          stepsStart: args['steps-start'],
          stepsEnd: args['steps-end'],
          unit: args.unit,
          taskIds: args['task-ids'],
          listIds: args['list-ids'],
          owners: args.owners
        }, verbose);
        break;
      }

      case 'key-result-update': {
        const keyResultId = args._[1];
        if (!keyResultId) {
          console.error('Error: Key Result ID is required');
          console.error('Usage: node goals.js key-result-update <kr-id> [options]');
          process.exit(1);
        }
        await updateKeyResult(keyResultId, {
          name: args.name,
          stepsCurrent: args['steps-current'],
          stepsStart: args['steps-start'],
          stepsEnd: args['steps-end'],
          unit: args.unit,
          note: args.note
        }, verbose);
        break;
      }

      case 'key-result-delete': {
        const keyResultId = args._[1];
        if (!keyResultId) {
          console.error('Error: Key Result ID is required');
          console.error('Usage: node goals.js key-result-delete <kr-id>');
          process.exit(1);
        }
        await deleteKeyResult(keyResultId, args.force, verbose);
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
