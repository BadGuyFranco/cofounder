#!/usr/bin/env node

/**
 * ClickUp Dependencies Script
 * Manage task dependencies (links between tasks).
 *
 * Usage:
 *   node dependencies.js add <task-id> <depends-on-task-id>
 *   node dependencies.js remove <task-id> <depends-on-task-id>
 *   node dependencies.js add-link <task-id> <link-to-task-id>
 *   node dependencies.js remove-link <task-id> <link-to-task-id>
 *   node dependencies.js help
 */

import { parseArgs, apiRequest } from './utils.js';

/**
 * Add a dependency (task depends on another task)
 */
async function addDependency(taskId, dependsOnTaskId, verbose) {
  const body = {
    depends_on: dependsOnTaskId
  };

  const data = await apiRequest(`/task/${taskId}/dependency`, {
    method: 'POST',
    body
  });

  console.log('Added dependency:');
  console.log(`  Task ${taskId} now depends on ${dependsOnTaskId}`);
  console.log(`  (${taskId} is blocked until ${dependsOnTaskId} is complete)`);

  if (verbose) {
    console.log('\nFull response:');
    console.log(JSON.stringify(data, null, 2));
  }

  return data;
}

/**
 * Remove a dependency
 */
async function removeDependency(taskId, dependsOnTaskId, verbose) {
  const params = new URLSearchParams();
  params.append('depends_on', dependsOnTaskId);

  const data = await apiRequest(`/task/${taskId}/dependency?${params.toString()}`, {
    method: 'DELETE'
  });

  console.log('Removed dependency:');
  console.log(`  Task ${taskId} no longer depends on ${dependsOnTaskId}`);

  if (verbose) {
    console.log('\nFull response:');
    console.log(JSON.stringify(data, null, 2));
  }

  return data;
}

/**
 * Add a link (bidirectional relationship)
 */
async function addLink(taskId, linkToTaskId, verbose) {
  const body = {
    links_to: linkToTaskId
  };

  const data = await apiRequest(`/task/${taskId}/link/${linkToTaskId}`, {
    method: 'POST',
    body
  });

  console.log('Added link:');
  console.log(`  Task ${taskId} is now linked to ${linkToTaskId}`);
  console.log(`  (bidirectional reference, no blocking)`);

  if (verbose) {
    console.log('\nFull response:');
    console.log(JSON.stringify(data, null, 2));
  }

  return data;
}

/**
 * Remove a link
 */
async function removeLink(taskId, linkToTaskId, verbose) {
  const data = await apiRequest(`/task/${taskId}/link/${linkToTaskId}`, {
    method: 'DELETE'
  });

  console.log('Removed link:');
  console.log(`  Task ${taskId} is no longer linked to ${linkToTaskId}`);

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
  console.log('ClickUp Dependencies Script');
  console.log('');
  console.log('Commands:');
  console.log('  add <task-id> <depends-on-id>          Add dependency (blocking)');
  console.log('  remove <task-id> <depends-on-id>       Remove dependency');
  console.log('  add-link <task-id> <link-to-id>        Add link (non-blocking)');
  console.log('  remove-link <task-id> <link-to-id>     Remove link');
  console.log('  help                                   Show this help');
  console.log('');
  console.log('Options:');
  console.log('  --verbose                Show full API responses');
  console.log('');
  console.log('Dependency Types:');
  console.log('');
  console.log('  DEPENDENCY (blocking):');
  console.log('    Task A depends on Task B means:');
  console.log('    - Task B must be completed before Task A');
  console.log('    - Task A is "waiting on" Task B');
  console.log('    - Used for: sequential workflows, prerequisites');
  console.log('');
  console.log('  LINK (non-blocking):');
  console.log('    Task A linked to Task B means:');
  console.log('    - Tasks are related but not blocking');
  console.log('    - Bidirectional reference');
  console.log('    - Used for: related tasks, cross-references');
  console.log('');
  console.log('Examples:');
  console.log('  # Make task abc123 depend on xyz789 (abc123 waits for xyz789)');
  console.log('  node dependencies.js add abc123 xyz789');
  console.log('');
  console.log('  # Remove that dependency');
  console.log('  node dependencies.js remove abc123 xyz789');
  console.log('');
  console.log('  # Link two related tasks (no blocking)');
  console.log('  node dependencies.js add-link abc123 def456');
  console.log('');
  console.log('  # Remove that link');
  console.log('  node dependencies.js remove-link abc123 def456');
  console.log('');
  console.log('Workflow Example:');
  console.log('  # Design → Development → Testing → Deployment');
  console.log('  node dependencies.js add development-task design-task');
  console.log('  node dependencies.js add testing-task development-task');
  console.log('  node dependencies.js add deployment-task testing-task');
  console.log('');
  console.log('Note: To view dependencies on a task, use "node tasks.js get <task-id>"');
  console.log('      with --verbose to see the full task object including dependencies.');
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
      case 'add': {
        const taskId = args._[1];
        const dependsOnTaskId = args._[2];
        if (!taskId || !dependsOnTaskId) {
          console.error('Error: Task ID and depends-on Task ID are required');
          console.error('Usage: node dependencies.js add <task-id> <depends-on-task-id>');
          process.exit(1);
        }
        await addDependency(taskId, dependsOnTaskId, verbose);
        break;
      }

      case 'remove': {
        const taskId = args._[1];
        const dependsOnTaskId = args._[2];
        if (!taskId || !dependsOnTaskId) {
          console.error('Error: Task ID and depends-on Task ID are required');
          console.error('Usage: node dependencies.js remove <task-id> <depends-on-task-id>');
          process.exit(1);
        }
        await removeDependency(taskId, dependsOnTaskId, verbose);
        break;
      }

      case 'add-link': {
        const taskId = args._[1];
        const linkToTaskId = args._[2];
        if (!taskId || !linkToTaskId) {
          console.error('Error: Task ID and link-to Task ID are required');
          console.error('Usage: node dependencies.js add-link <task-id> <link-to-task-id>');
          process.exit(1);
        }
        await addLink(taskId, linkToTaskId, verbose);
        break;
      }

      case 'remove-link': {
        const taskId = args._[1];
        const linkToTaskId = args._[2];
        if (!taskId || !linkToTaskId) {
          console.error('Error: Task ID and link-to Task ID are required');
          console.error('Usage: node dependencies.js remove-link <task-id> <link-to-task-id>');
          process.exit(1);
        }
        await removeLink(taskId, linkToTaskId, verbose);
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
