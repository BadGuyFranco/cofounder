#!/usr/bin/env node

/**
 * Go High Level Opportunities Script
 * Manage opportunities (deals) in pipelines.
 * 
 * Usage:
 *   node opportunities.js list --location "First Strategy" [--pipeline-id <id>]
 *   node opportunities.js get <opportunity-id> --location "Name"
 *   node opportunities.js create --name "Deal" --contact-id <id> --pipeline-id <id> --stage-id <id> --location "Name"
 *   node opportunities.js update <opportunity-id> [--stage-id <id>] [--status "won"] --location "Name"
 *   node opportunities.js pipelines --location "Name"
 *   node opportunities.js locations                          # List available locations
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
  formatCurrency,
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

// List opportunities
async function listOpportunities(location, pipelineId, verbose) {
  const params = new URLSearchParams({
    locationId: location.id
  });
  
  if (pipelineId) {
    params.append('pipelineId', pipelineId);
  }
  
  const data = await apiRequest('GET', `/opportunities/search?${params}`, location.key);
  
  console.log(`Found ${data.opportunities?.length || 0} opportunities:\n`);
  
  for (const opp of data.opportunities || []) {
    console.log(`- ${opp.name}`);
    console.log(`  ID: ${opp.id}`);
    console.log(`  Status: ${opp.status}`);
    if (opp.monetaryValue) console.log(`  Value: $${opp.monetaryValue}`);
    if (opp.pipelineStageId) console.log(`  Stage ID: ${opp.pipelineStageId}`);
    console.log('');
  }
  
  if (verbose) {
    console.log('\nFull response:');
    console.log(JSON.stringify(data, null, 2));
  }
  
  return data.opportunities;
}

// Get single opportunity
async function getOpportunity(opportunityId, location, verbose) {
  const data = await apiRequest('GET', `/opportunities/${opportunityId}`, location.key);
  
  const opp = data.opportunity;
  console.log(`Opportunity: ${opp.name}`);
  console.log(`ID: ${opp.id}`);
  console.log(`Status: ${opp.status}`);
  console.log(`Value: $${opp.monetaryValue || 0}`);
  console.log(`Pipeline ID: ${opp.pipelineId}`);
  console.log(`Stage ID: ${opp.pipelineStageId}`);
  console.log(`Contact ID: ${opp.contactId}`);
  console.log(`Created: ${opp.createdAt || 'N/A'}`);
  
  if (verbose) {
    console.log('\nFull response:');
    console.log(JSON.stringify(data, null, 2));
  }
  
  return opp;
}

// Create opportunity
async function createOpportunity(options, location, verbose) {
  const body = {
    locationId: location.id,
    name: options.name,
    pipelineId: options['pipeline-id'],
    pipelineStageId: options['stage-id'],
    contactId: options['contact-id']
  };
  
  if (options.value) body.monetaryValue = parseFloat(options.value);
  if (options.status) body.status = options.status;
  
  const data = await apiRequest('POST', '/opportunities/', location.key, body);
  
  console.log('Created opportunity:');
  console.log(`ID: ${data.opportunity.id}`);
  console.log(`Name: ${data.opportunity.name}`);
  
  if (verbose) {
    console.log('\nFull response:');
    console.log(JSON.stringify(data, null, 2));
  }
  
  return data.opportunity;
}

// Update opportunity
async function updateOpportunity(opportunityId, options, location, verbose) {
  const body = {};
  
  if (options.name) body.name = options.name;
  if (options['stage-id']) body.pipelineStageId = options['stage-id'];
  if (options.status) body.status = options.status;
  if (options.value) body.monetaryValue = parseFloat(options.value);
  
  const data = await apiRequest('PUT', `/opportunities/${opportunityId}`, location.key, body);
  
  console.log(`Updated opportunity: ${opportunityId}`);
  
  if (verbose) {
    console.log('\nFull response:');
    console.log(JSON.stringify(data, null, 2));
  }
  
  return data.opportunity;
}

// Get pipelines
async function getPipelines(location, verbose) {
  const data = await apiRequest('GET', `/opportunities/pipelines?locationId=${location.id}`, location.key);
  
  console.log(`Found ${data.pipelines?.length || 0} pipelines:\n`);
  
  for (const pipeline of data.pipelines || []) {
    console.log(`Pipeline: ${pipeline.name}`);
    console.log(`  ID: ${pipeline.id}`);
    console.log(`  Stages:`);
    
    for (const stage of pipeline.stages || []) {
      console.log(`    - ${stage.name} (ID: ${stage.id})`);
    }
    console.log('');
  }
  
  if (verbose) {
    console.log('\nFull response:');
    console.log(JSON.stringify(data, null, 2));
  }
  
  return data.pipelines;
}

// Delete opportunity
async function deleteOpportunity(opportunityId, location, verbose, force = false) {
  // Get opportunity details first for confirmation message
  let oppName = opportunityId;
  let oppValue = '';
  try {
    const oppData = await apiRequest('GET', `/opportunities/${opportunityId}`, location.key);
    const o = oppData.opportunity;
    oppName = o.name || opportunityId;
    oppValue = o.monetaryValue ? formatCurrency(o.monetaryValue) : '';
  } catch (e) {
    // If we can't get the opportunity, proceed with ID only
  }
  
  // Confirm destructive action
  const details = [
    `Opportunity: ${oppName}`,
    `ID: ${opportunityId}`
  ];
  if (oppValue) details.push(`Value: ${oppValue}`);
  details.push('', 'This will permanently remove the opportunity.');
  
  const confirmed = await confirmDestructiveAction(
    'You are about to DELETE an opportunity.',
    details,
    force
  );
  
  if (!confirmed) {
    process.exit(0);
  }
  
  const data = await apiRequest('DELETE', `/opportunities/${opportunityId}`, location.key);
  
  console.log(`Deleted opportunity: ${opportunityId}`);
  
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
  
  // Handle locations command separately (doesn't need location)
  if (command === 'locations') {
    listLocations(locationsConfig);
    return;
  }
  
  try {
    switch (command) {
      case 'list': {
        const location = resolveLocation(args.location, locationsConfig);
        await listOpportunities(location, args['pipeline-id'], verbose);
        break;
      }
      
      case 'get': {
        const location = resolveLocation(args.location, locationsConfig);
        const oppId = args._[1];
        
        if (!oppId) {
          console.error('Error: Opportunity ID is required');
          console.error('Usage: node opportunities.js get <opportunity-id> --location "Name"');
          process.exit(1);
        }
        
        await getOpportunity(oppId, location, verbose);
        break;
      }
      
      case 'create': {
        const location = resolveLocation(args.location, locationsConfig);
        
        if (!args.name || !args['contact-id'] || !args['pipeline-id'] || !args['stage-id']) {
          console.error('Error: --name, --contact-id, --pipeline-id, and --stage-id are required');
          console.error('Usage: node opportunities.js create --name "Deal" --contact-id <id> --pipeline-id <id> --stage-id <id> --location "Name"');
          process.exit(1);
        }
        
        await createOpportunity(args, location, verbose);
        break;
      }
      
      case 'update': {
        const location = resolveLocation(args.location, locationsConfig);
        const oppId = args._[1];
        
        if (!oppId) {
          console.error('Error: Opportunity ID is required');
          console.error('Usage: node opportunities.js update <opportunity-id> [--stage-id <id>] [--status "won"] --location "Name"');
          process.exit(1);
        }
        
        await updateOpportunity(oppId, args, location, verbose);
        break;
      }
      
      case 'pipelines': {
        const location = resolveLocation(args.location, locationsConfig);
        await getPipelines(location, verbose);
        break;
      }
      
      case 'delete': {
        const location = resolveLocation(args.location, locationsConfig);
        const oppId = args._[1];
        
        if (!oppId) {
          console.error('Error: Opportunity ID is required');
          console.error('Usage: node opportunities.js delete <opportunity-id> --location "Name"');
          process.exit(1);
        }
        
        await deleteOpportunity(oppId, location, verbose, args.force);
        break;
      }
      
      default:
        console.log('Go High Level Opportunities Script');
        console.log('');
        console.log('Commands:');
        console.log('  list --location "Name"              List opportunities');
        console.log('  get <opportunity-id> --location     Get opportunity details');
        console.log('  create --name "Deal" --location ... Create a new opportunity');
        console.log('  update <opportunity-id> --location  Update an opportunity');
        console.log('  delete <opportunity-id> --location  Delete an opportunity');
        console.log('  pipelines --location "Name"         List all pipelines and stages');
        console.log('  locations                           List available locations');
        console.log('');
        console.log('Location Options:');
        console.log('  --location "Name"             Specify which GHL account to use');
        console.log('');
        console.log('Create Options:');
        console.log('  --name "Deal Name"            Opportunity name (required)');
        console.log('  --contact-id <id>             Associated contact ID (required)');
        console.log('  --pipeline-id <id>            Pipeline ID (required)');
        console.log('  --stage-id <id>               Stage ID (required)');
        console.log('  --value 5000                  Monetary value');
        console.log('  --status "open"               Status: open, won, lost, abandoned');
        console.log('');
        console.log('Update Options:');
        console.log('  --name "New Name"             Update name');
        console.log('  --stage-id <id>               Move to different stage');
        console.log('  --status "won"                Update status');
        console.log('  --value 10000                 Update value');
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
