#!/usr/bin/env node

/**
 * Make.com Analytics Script
 * View usage statistics and consumption data.
 * 
 * Usage:
 *   node analytics.js usage --team-id <id> [--from YYYY-MM-DD] [--to YYYY-MM-DD]
 *   node analytics.js scenario <scenario-id> [--from YYYY-MM-DD] [--to YYYY-MM-DD]
 *   node analytics.js consumption --org-id <id>
 */

import { get, parseArgs, printTable, formatOutput } from './utils.js';

// Get team analytics
async function getTeamAnalytics(teamId, from, to, verbose) {
  const params = { teamId };
  if (from) params.fromDate = from;
  if (to) params.toDate = to;
  
  const response = await get('/analytics', params);
  const analytics = response.analytics || response;
  
  if (verbose) {
    formatOutput(analytics, true);
    return;
  }
  
  console.log('Team Analytics:\n');
  console.log(JSON.stringify(analytics, null, 2));
}

// Get scenario consumption
async function getScenarioConsumption(scenarioId, from, to, verbose) {
  const params = {};
  if (from) params.fromDate = from;
  if (to) params.toDate = to;
  
  const response = await get(`/scenarios/${scenarioId}/consumption`, params);
  const consumption = response.consumption || response;
  
  if (verbose) {
    formatOutput(consumption, true);
    return;
  }
  
  console.log(`Scenario ${scenarioId} Consumption:\n`);
  
  if (Array.isArray(consumption)) {
    printTable(consumption, [
      { key: 'date', label: 'Date' },
      { key: 'operations', label: 'Operations' },
      { key: 'transfer', label: 'Data Transfer' },
      { key: 'centicredits', label: 'Credits' }
    ]);
  } else {
    console.log(JSON.stringify(consumption, null, 2));
  }
}

// Get organization consumption
async function getOrgConsumption(orgId, verbose) {
  const response = await get(`/organizations/${orgId}/consumption`);
  const consumption = response.consumption || response;
  
  if (verbose) {
    formatOutput(consumption, true);
    return;
  }
  
  console.log('Organization Consumption:\n');
  console.log(JSON.stringify(consumption, null, 2));
}

// Get scenario logs (execution history)
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
    console.log('No execution logs found.');
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
  console.log('Make.com Analytics Script');
  console.log('');
  console.log('View usage statistics and consumption data.');
  console.log('');
  console.log('Commands:');
  console.log('  usage --team-id <id> [--from YYYY-MM-DD] [--to YYYY-MM-DD]');
  console.log('  scenario <scenario-id> [--from YYYY-MM-DD] [--to YYYY-MM-DD]');
  console.log('  logs <scenario-id> [--limit 20]');
  console.log('  consumption --org-id <id>');
  console.log('');
  console.log('Options:');
  console.log('  --team-id <id>    Team ID');
  console.log('  --org-id <id>     Organization ID');
  console.log('  --from <date>     Start date (YYYY-MM-DD)');
  console.log('  --to <date>       End date (YYYY-MM-DD)');
  console.log('  --limit <n>       Number of log entries');
  console.log('  --verbose         Show full API responses');
  console.log('');
  console.log('Examples:');
  console.log('  node analytics.js usage --team-id 12345');
  console.log('  node analytics.js scenario 67890 --from 2024-01-01 --to 2024-01-31');
  console.log('  node analytics.js logs 67890 --limit 50');
  console.log('  node analytics.js consumption --org-id 12345');
}

// Main
async function main() {
  const args = parseArgs(process.argv.slice(2));
  const command = args._[0];
  const verbose = args.verbose || false;
  
  try {
    switch (command) {
      case 'usage': {
        const teamId = args['team-id'];
        if (!teamId) {
          console.error('Error: --team-id is required');
          console.error('Usage: node analytics.js usage --team-id <id>');
          process.exit(1);
        }
        await getTeamAnalytics(teamId, args.from, args.to, verbose);
        break;
      }
      
      case 'scenario': {
        const scenarioId = args._[1];
        if (!scenarioId) {
          console.error('Error: Scenario ID is required');
          console.error('Usage: node analytics.js scenario <scenario-id>');
          process.exit(1);
        }
        await getScenarioConsumption(scenarioId, args.from, args.to, verbose);
        break;
      }
      
      case 'logs': {
        const scenarioId = args._[1];
        if (!scenarioId) {
          console.error('Error: Scenario ID is required');
          console.error('Usage: node analytics.js logs <scenario-id> [--limit 20]');
          process.exit(1);
        }
        await getScenarioLogs(scenarioId, args.limit, verbose);
        break;
      }
      
      case 'consumption': {
        const orgId = args['org-id'];
        if (!orgId) {
          console.error('Error: --org-id is required');
          console.error('Usage: node analytics.js consumption --org-id <id>');
          process.exit(1);
        }
        await getOrgConsumption(orgId, verbose);
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
