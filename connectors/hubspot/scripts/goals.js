#!/usr/bin/env node

/**
 * HubSpot Goals Management
 * View and track sales goals and forecasting.
 */

import { fileURLToPath } from 'url';
import path from 'path';
import {
  loadEnv, getToken, parseArgs, apiRequest,
  formatDate, formatCurrency, handleError, showHelp
} from './utils.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
loadEnv(path.join(__dirname, '..'));

const OBJECT_TYPE = 'goal_targets';

// Help documentation
function printHelp() {
  showHelp('HubSpot Goals', {
    'Commands': [
      'list                        List all goals',
      'get <id>                    Get goal details',
      'help                        Show this help'
    ],
    'Options': [
      '--properties <list>         Comma-separated properties to return',
      '--limit <n>                 Results per page',
      '--all                       Fetch all pages',
      '--verbose                   Show full API response'
    ],
    'Examples': [
      'node goals.js list',
      'node goals.js get 12345'
    ],
    'Note': [
      'Goals are primarily configured via HubSpot UI.',
      'API provides read access to goal definitions and progress.',
      'Requires Sales Hub Professional or Enterprise.'
    ]
  });
}

// List goals
async function listGoals(args) {
  const token = getToken();
  const limit = parseInt(args.limit) || 100;
  
  console.log('Fetching goals...\n');
  
  const properties = 'hs_goal_name,hs_target_amount,hs_start_date,hs_end_date';
  const endpoint = `/crm/v3/objects/${OBJECT_TYPE}?properties=${properties}&limit=${limit}`;
  
  try {
    const data = await apiRequest('GET', endpoint, token);
    
    if (args.verbose) {
      console.log(JSON.stringify(data, null, 2));
      return;
    }
    
    const results = data.results || [];
    console.log(`Found ${results.length} goals:\n`);
    
    for (const goal of results) {
      const props = goal.properties;
      console.log(`- ${props.hs_goal_name || 'Unnamed Goal'}`);
      console.log(`  ID: ${goal.id}`);
      console.log(`  Target: ${formatCurrency(props.hs_target_amount)}`);
      if (props.hs_start_date) console.log(`  Start: ${props.hs_start_date}`);
      if (props.hs_end_date) console.log(`  End: ${props.hs_end_date}`);
      console.log('');
    }
  } catch (error) {
    if (error.status === 404 || error.message?.includes('not found')) {
      console.log('No goals found or Goals API not available.');
      console.log('Goals require Sales Hub Professional or Enterprise.');
    } else {
      throw error;
    }
  }
}

// Get single goal
async function getGoal(id, args) {
  const token = getToken();
  
  const properties = 'hs_goal_name,hs_target_amount,hs_start_date,hs_end_date,hs_owner_id,hs_team_id';
  const endpoint = `/crm/v3/objects/${OBJECT_TYPE}/${id}?properties=${properties}`;
  const goal = await apiRequest('GET', endpoint, token);
  
  if (args.verbose) {
    console.log(JSON.stringify(goal, null, 2));
    return;
  }
  
  const props = goal.properties;
  
  console.log(`Goal: ${props.hs_goal_name || 'Unnamed'}\n`);
  console.log(`ID: ${goal.id}`);
  console.log(`Target Amount: ${formatCurrency(props.hs_target_amount)}`);
  console.log(`Start Date: ${props.hs_start_date || 'N/A'}`);
  console.log(`End Date: ${props.hs_end_date || 'N/A'}`);
  console.log(`Owner ID: ${props.hs_owner_id || 'N/A'}`);
  console.log(`Team ID: ${props.hs_team_id || 'N/A'}`);
  console.log(`\nCreated: ${formatDate(goal.createdAt)}`);
}

// Main
async function main() {
  const args = parseArgs(process.argv.slice(2));
  const command = args._[0];
  
  try {
    switch (command) {
      case 'list': await listGoals(args); break;
      case 'get':
        if (!args._[1]) { console.error('Error: Goal ID required'); process.exit(1); }
        await getGoal(args._[1], args); break;
      case 'help':
      default: printHelp();
    }
  } catch (error) {
    handleError(error, args.verbose);
  }
}

main();
