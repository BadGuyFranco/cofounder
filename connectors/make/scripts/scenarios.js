#!/usr/bin/env node

/**
 * Make.com Scenarios Script
 * List, get, run, start, and stop Make scenarios.
 * 
 * Usage:
 *   node scenarios.js list --team-id <id>
 *   node scenarios.js get <scenario-id>
 *   node scenarios.js run <scenario-id> [--data '{"key":"value"}']
 *   node scenarios.js start <scenario-id>
 *   node scenarios.js stop <scenario-id>
 *   node scenarios.js logs <scenario-id> [--limit 10]
 */

import { get, post, patch, parseArgs, printTable, formatOutput } from './utils.js';

// List scenarios for a team
async function listScenarios(teamId, folderId, verbose) {
  const params = { teamId };
  if (folderId) {
    params.folderId = folderId;
  }
  
  const response = await get('/scenarios', params);
  const scenarios = response.scenarios || response;
  
  if (verbose) {
    formatOutput(scenarios, true);
    return;
  }
  
  console.log(`Found ${scenarios.length} scenario(s):\n`);
  
  printTable(scenarios, [
    { key: 'id', label: 'ID' },
    { key: 'name', label: 'Name' },
    { key: 'isActive', label: 'Active', getter: s => s.isActive ? 'Yes' : 'No' },
    { key: 'isPaused', label: 'Paused', getter: s => s.isPaused ? 'Yes' : 'No' },
    { key: 'scheduling', label: 'Schedule', getter: s => s.scheduling?.type || 'manual' }
  ]);
}

// Get a specific scenario
async function getScenario(scenarioId, verbose) {
  const response = await get(`/scenarios/${scenarioId}`);
  const scenario = response.scenario || response;
  
  if (verbose) {
    formatOutput(scenario, true);
    return;
  }
  
  console.log(`Scenario: ${scenario.name}`);
  console.log(`ID: ${scenario.id}`);
  console.log(`Active: ${scenario.isActive ? 'Yes' : 'No'}`);
  console.log(`Paused: ${scenario.isPaused ? 'Yes' : 'No'}`);
  console.log(`Schedule: ${scenario.scheduling?.type || 'manual'}`);
  if (scenario.description) {
    console.log(`Description: ${scenario.description}`);
  }
  console.log(`Created: ${scenario.created}`);
  console.log(`Last Edit: ${scenario.lastEdit}`);
}

// Run a scenario immediately
async function runScenario(scenarioId, data, verbose) {
  const body = data ? { data: JSON.parse(data) } : {};
  const response = await post(`/scenarios/${scenarioId}/run`, body);
  
  if (verbose) {
    formatOutput(response, true);
    return;
  }
  
  console.log(`Scenario ${scenarioId} triggered successfully.`);
  if (response.executionId) {
    console.log(`Execution ID: ${response.executionId}`);
  }
}

// Start (activate) a scenario
async function startScenario(scenarioId, verbose) {
  const response = await post(`/scenarios/${scenarioId}/start`, {});
  
  if (verbose) {
    formatOutput(response, true);
    return;
  }
  
  console.log(`Scenario ${scenarioId} activated.`);
}

// Stop (deactivate) a scenario
async function stopScenario(scenarioId, verbose) {
  const response = await post(`/scenarios/${scenarioId}/stop`, {});
  
  if (verbose) {
    formatOutput(response, true);
    return;
  }
  
  console.log(`Scenario ${scenarioId} deactivated.`);
}

// Get scenario logs
async function getScenarioLogs(scenarioId, limit, verbose) {
  const params = {};
  if (limit) {
    params.pg = { limit: parseInt(limit) };
  }
  
  const response = await get(`/scenarios/${scenarioId}/logs`, params);
  const logs = response.scenarioLogs || response;
  
  if (verbose) {
    formatOutput(logs, true);
    return;
  }
  
  if (!logs || logs.length === 0) {
    console.log('No logs found.');
    return;
  }
  
  console.log(`Last ${logs.length} execution(s):\n`);
  
  printTable(logs, [
    { key: 'id', label: 'Execution ID' },
    { key: 'timestamp', label: 'Time' },
    { key: 'status', label: 'Status' },
    { key: 'operations', label: 'Ops' },
    { key: 'duration', label: 'Duration (ms)' }
  ]);
}

// Show help
function showHelp() {
  console.log('Make.com Scenarios Script');
  console.log('');
  console.log('Commands:');
  console.log('  list --team-id <id> [--folder-id <id>]   List scenarios for a team');
  console.log('  get <scenario-id>                        Get scenario details');
  console.log('  run <scenario-id> [--data \'{"key":"val"}\'] Run scenario immediately');
  console.log('  start <scenario-id>                      Activate (enable) scenario');
  console.log('  stop <scenario-id>                       Deactivate (disable) scenario');
  console.log('  logs <scenario-id> [--limit 10]          Get scenario execution logs');
  console.log('');
  console.log('Options:');
  console.log('  --team-id <id>     Team ID (required for list)');
  console.log('  --folder-id <id>   Filter by folder ID');
  console.log('  --data <json>      JSON data to pass to scenario (for run)');
  console.log('  --limit <n>        Number of log entries to show');
  console.log('  --verbose          Show full API responses');
  console.log('');
  console.log('Examples:');
  console.log('  node scenarios.js list --team-id 12345');
  console.log('  node scenarios.js get 67890');
  console.log('  node scenarios.js run 67890 --data \'{"email":"test@example.com"}\'');
  console.log('  node scenarios.js start 67890');
  console.log('  node scenarios.js logs 67890 --limit 5');
}

// Main
async function main() {
  const args = parseArgs(process.argv.slice(2));
  const command = args._[0];
  const verbose = args.verbose || false;
  
  try {
    switch (command) {
      case 'list': {
        const teamId = args['team-id'];
        if (!teamId) {
          console.error('Error: --team-id is required');
          console.error('Usage: node scenarios.js list --team-id <id>');
          process.exit(1);
        }
        await listScenarios(teamId, args['folder-id'], verbose);
        break;
      }
      
      case 'get': {
        const scenarioId = args._[1];
        if (!scenarioId) {
          console.error('Error: Scenario ID is required');
          console.error('Usage: node scenarios.js get <scenario-id>');
          process.exit(1);
        }
        await getScenario(scenarioId, verbose);
        break;
      }
      
      case 'run': {
        const scenarioId = args._[1];
        if (!scenarioId) {
          console.error('Error: Scenario ID is required');
          console.error('Usage: node scenarios.js run <scenario-id> [--data \'{"key":"value"}\']');
          process.exit(1);
        }
        await runScenario(scenarioId, args.data, verbose);
        break;
      }
      
      case 'start': {
        const scenarioId = args._[1];
        if (!scenarioId) {
          console.error('Error: Scenario ID is required');
          console.error('Usage: node scenarios.js start <scenario-id>');
          process.exit(1);
        }
        await startScenario(scenarioId, verbose);
        break;
      }
      
      case 'stop': {
        const scenarioId = args._[1];
        if (!scenarioId) {
          console.error('Error: Scenario ID is required');
          console.error('Usage: node scenarios.js stop <scenario-id>');
          process.exit(1);
        }
        await stopScenario(scenarioId, verbose);
        break;
      }
      
      case 'logs': {
        const scenarioId = args._[1];
        if (!scenarioId) {
          console.error('Error: Scenario ID is required');
          console.error('Usage: node scenarios.js logs <scenario-id> [--limit 10]');
          process.exit(1);
        }
        await getScenarioLogs(scenarioId, args.limit, verbose);
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
