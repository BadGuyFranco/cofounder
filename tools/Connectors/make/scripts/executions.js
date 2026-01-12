#!/usr/bin/env node

/**
 * Make.com Incomplete Executions Script
 * Manage failed and incomplete scenario executions.
 * 
 * Usage:
 *   node executions.js list <scenario-id> [--limit 20]
 *   node executions.js get <execution-id>
 *   node executions.js retry <execution-id>
 *   node executions.js delete <execution-id>
 */

import { get, post, del, parseArgs, printTable, formatOutput } from './utils.js';

// List incomplete executions for a scenario
async function listExecutions(scenarioId, limit, verbose) {
  const params = { confirmed: false };
  if (limit) {
    params.pg = { limit: parseInt(limit) };
  }
  
  const response = await get(`/scenarios/${scenarioId}/incomplete-executions`, params);
  const executions = response.incompleteExecutions || response;
  
  if (verbose) {
    formatOutput(executions, true);
    return;
  }
  
  if (!executions || executions.length === 0) {
    console.log('No incomplete executions found.');
    return;
  }
  
  console.log(`Found ${executions.length} incomplete execution(s):\n`);
  
  printTable(executions, [
    { key: 'id', label: 'ID' },
    { key: 'created', label: 'Created' },
    { key: 'reason', label: 'Reason' },
    { key: 'attempts', label: 'Attempts' }
  ]);
}

// Get a specific incomplete execution
async function getExecution(executionId, verbose) {
  const response = await get(`/incomplete-executions/${executionId}`);
  const execution = response.incompleteExecution || response;
  
  if (verbose) {
    formatOutput(execution, true);
    return;
  }
  
  console.log(`Execution ID: ${execution.id}`);
  console.log(`Scenario ID: ${execution.scenarioId}`);
  console.log(`Created: ${execution.created}`);
  console.log(`Reason: ${execution.reason || 'Unknown'}`);
  console.log(`Attempts: ${execution.attempts || 0}`);
  if (execution.data) {
    console.log(`\nData:`);
    console.log(JSON.stringify(execution.data, null, 2));
  }
}

// Retry an incomplete execution
async function retryExecution(executionId, verbose) {
  const response = await post(`/incomplete-executions/${executionId}/retry`, {});
  
  if (verbose) {
    formatOutput(response, true);
    return;
  }
  
  console.log(`Execution ${executionId} retry initiated.`);
}

// Delete an incomplete execution
async function deleteExecution(executionId, verbose) {
  const response = await del(`/incomplete-executions/${executionId}`);
  
  if (verbose && response) {
    formatOutput(response, true);
    return;
  }
  
  console.log(`Execution ${executionId} deleted.`);
}

// Delete all incomplete executions for a scenario
async function deleteAllExecutions(scenarioId, verbose) {
  const response = await del(`/scenarios/${scenarioId}/incomplete-executions`);
  
  if (verbose && response) {
    formatOutput(response, true);
    return;
  }
  
  console.log(`All incomplete executions for scenario ${scenarioId} deleted.`);
}

// Show help
function showHelp() {
  console.log('Make.com Incomplete Executions Script');
  console.log('');
  console.log('Manage failed and incomplete scenario executions.');
  console.log('');
  console.log('Commands:');
  console.log('  list <scenario-id> [--limit 20]    List incomplete executions');
  console.log('  get <execution-id>                 Get execution details');
  console.log('  retry <execution-id>               Retry an execution');
  console.log('  delete <execution-id>              Delete an execution');
  console.log('  delete-all <scenario-id>           Delete all incomplete executions');
  console.log('');
  console.log('Options:');
  console.log('  --limit <n>       Number of executions to show');
  console.log('  --verbose         Show full API responses');
  console.log('');
  console.log('Examples:');
  console.log('  node executions.js list 12345 --limit 10');
  console.log('  node executions.js get abc123');
  console.log('  node executions.js retry abc123');
  console.log('  node executions.js delete-all 12345');
}

// Main
async function main() {
  const args = parseArgs(process.argv.slice(2));
  const command = args._[0];
  const verbose = args.verbose || false;
  
  try {
    switch (command) {
      case 'list': {
        const scenarioId = args._[1];
        if (!scenarioId) {
          console.error('Error: Scenario ID is required');
          console.error('Usage: node executions.js list <scenario-id> [--limit 20]');
          process.exit(1);
        }
        await listExecutions(scenarioId, args.limit, verbose);
        break;
      }
      
      case 'get': {
        const executionId = args._[1];
        if (!executionId) {
          console.error('Error: Execution ID is required');
          console.error('Usage: node executions.js get <execution-id>');
          process.exit(1);
        }
        await getExecution(executionId, verbose);
        break;
      }
      
      case 'retry': {
        const executionId = args._[1];
        if (!executionId) {
          console.error('Error: Execution ID is required');
          console.error('Usage: node executions.js retry <execution-id>');
          process.exit(1);
        }
        await retryExecution(executionId, verbose);
        break;
      }
      
      case 'delete': {
        const executionId = args._[1];
        if (!executionId) {
          console.error('Error: Execution ID is required');
          console.error('Usage: node executions.js delete <execution-id>');
          process.exit(1);
        }
        await deleteExecution(executionId, verbose);
        break;
      }
      
      case 'delete-all': {
        const scenarioId = args._[1];
        if (!scenarioId) {
          console.error('Error: Scenario ID is required');
          console.error('Usage: node executions.js delete-all <scenario-id>');
          process.exit(1);
        }
        await deleteAllExecutions(scenarioId, verbose);
        break;
      }
      
      case 'help':
      default:
        showHelp();
        process.exit(0);
    }
  } catch (error) {
    console.error('Error:', error.message);
    if (verbose) {
      console.error(error.stack);
    }
    process.exit(1);
  }
}

main();
