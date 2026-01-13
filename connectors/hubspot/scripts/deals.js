#!/usr/bin/env node

/**
 * HubSpot Deals Management
 * Create, read, update, delete, and search deals.
 */

import { fileURLToPath } from 'url';
import path from 'path';
import {
  loadEnv, getToken, parseArgs, apiRequest, apiRequestPaginated,
  searchRequest, confirmDestructiveAction, formatDate, formatCurrency, handleError, showHelp
} from './utils.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
loadEnv(path.join(__dirname, '..'));

const OBJECT_TYPE = 'deals';
const DEFAULT_PROPERTIES = ['dealname', 'amount', 'dealstage', 'pipeline', 'closedate', 'hubspot_owner_id', 'createdate'];

// Help documentation
function printHelp() {
  showHelp('HubSpot Deals', {
    'Commands': [
      'list                        List all deals',
      'get <id>                    Get deal by ID',
      'search <query>              Search deals by name',
      'create                      Create a new deal',
      'update <id>                 Update a deal',
      'delete <id>                 Delete a deal (destructive)',
      'pipelines                   List available pipelines and stages',
      'help                        Show this help'
    ],
    'Options': [
      '--name <name>               Deal name (required for create)',
      '--amount <amount>           Deal amount in dollars',
      '--stage <stage>             Deal stage ID',
      '--pipeline <pipeline>       Pipeline ID',
      '--closedate <date>          Expected close date (YYYY-MM-DD)',
      '--owner <owner_id>          Owner user ID',
      '--properties <list>         Comma-separated properties to return',
      '--limit <n>                 Results per page (default: 100)',
      '--all                       Fetch all pages',
      '--verbose                   Show full API response',
      '--force                     Skip confirmation for destructive actions'
    ],
    'Examples': [
      'node deals.js list',
      'node deals.js list --all',
      'node deals.js get 12345',
      'node deals.js search "acme"',
      'node deals.js pipelines',
      'node deals.js create --name "Acme Deal" --amount 50000 --stage appointmentscheduled',
      'node deals.js update 12345 --stage closedwon',
      'node deals.js delete 12345'
    ],
    'Common Stages': [
      'appointmentscheduled, qualifiedtobuy, presentationscheduled,',
      'decisionmakerboughtin, contractsent, closedwon, closedlost'
    ]
  });
}

// List all deals
async function listDeals(args) {
  const token = getToken();
  const limit = parseInt(args.limit) || 100;
  const all = args.all || false;
  const properties = args.properties ? args.properties.split(',') : DEFAULT_PROPERTIES;
  
  console.log('Fetching deals...\n');
  
  const endpoint = `/crm/v3/objects/${OBJECT_TYPE}?properties=${properties.join(',')}`;
  const { results, meta } = await apiRequestPaginated(endpoint, token, { all, limit });
  
  if (args.verbose) {
    console.log(JSON.stringify(results, null, 2));
    return;
  }
  
  console.log(`Found ${meta.total} deals${all ? '' : ' (page 1)'}:\n`);
  
  for (const deal of results) {
    const props = deal.properties;
    console.log(`- ${props.dealname || 'No name'}`);
    console.log(`  ID: ${deal.id}`);
    console.log(`  Amount: ${formatCurrency(props.amount)}`);
    console.log(`  Stage: ${props.dealstage || 'N/A'}`);
    if (props.closedate) console.log(`  Close Date: ${props.closedate}`);
    console.log(`  Created: ${formatDate(deal.createdAt)}`);
    console.log('');
  }
}

// Get single deal
async function getDeal(id, args) {
  const token = getToken();
  const properties = args.properties ? args.properties.split(',') : DEFAULT_PROPERTIES;
  
  const endpoint = `/crm/v3/objects/${OBJECT_TYPE}/${id}?properties=${properties.join(',')}`;
  const deal = await apiRequest('GET', endpoint, token);
  
  if (args.verbose) {
    console.log(JSON.stringify(deal, null, 2));
    return;
  }
  
  const props = deal.properties;
  
  console.log(`Deal: ${props.dealname || 'No name'}\n`);
  console.log(`ID: ${deal.id}`);
  console.log(`Amount: ${formatCurrency(props.amount)}`);
  console.log(`Stage: ${props.dealstage || 'N/A'}`);
  console.log(`Pipeline: ${props.pipeline || 'N/A'}`);
  console.log(`Close Date: ${props.closedate || 'N/A'}`);
  console.log(`Owner ID: ${props.hubspot_owner_id || 'N/A'}`);
  console.log(`Created: ${formatDate(deal.createdAt)}`);
  console.log(`Updated: ${formatDate(deal.updatedAt)}`);
}

// Search deals
async function searchDeals(query, args) {
  const token = getToken();
  const limit = parseInt(args.limit) || 100;
  const all = args.all || false;
  const properties = args.properties ? args.properties.split(',') : DEFAULT_PROPERTIES;
  
  console.log(`Searching for "${query}"...\n`);
  
  const filters = [{
    propertyName: 'dealname',
    operator: 'CONTAINS_TOKEN',
    value: query
  }];
  
  const { results } = await searchRequest(OBJECT_TYPE, token, filters, { limit, properties, all });
  
  if (args.verbose) {
    console.log(JSON.stringify(results, null, 2));
    return;
  }
  
  console.log(`Found ${results.length} deals:\n`);
  
  for (const deal of results) {
    const props = deal.properties;
    console.log(`- ${props.dealname || 'No name'}`);
    console.log(`  ID: ${deal.id}`);
    console.log(`  Amount: ${formatCurrency(props.amount)}`);
    console.log(`  Stage: ${props.dealstage || 'N/A'}`);
    console.log('');
  }
}

// List pipelines
async function listPipelines(args) {
  const token = getToken();
  
  const data = await apiRequest('GET', '/crm/v3/pipelines/deals', token);
  
  if (args.verbose) {
    console.log(JSON.stringify(data, null, 2));
    return;
  }
  
  console.log('Deal Pipelines:\n');
  
  for (const pipeline of data.results) {
    console.log(`Pipeline: ${pipeline.label}`);
    console.log(`  ID: ${pipeline.id}`);
    console.log('  Stages:');
    for (const stage of pipeline.stages) {
      console.log(`    - ${stage.label} (${stage.id})`);
    }
    console.log('');
  }
}

// Create deal
async function createDeal(args) {
  const token = getToken();
  
  if (!args.name) {
    console.error('Error: --name is required');
    process.exit(1);
  }
  
  const properties = {
    dealname: args.name
  };
  
  if (args.amount) properties.amount = args.amount;
  if (args.stage) properties.dealstage = args.stage;
  if (args.pipeline) properties.pipeline = args.pipeline;
  if (args.closedate) properties.closedate = args.closedate;
  if (args.owner) properties.hubspot_owner_id = args.owner;
  
  const deal = await apiRequest('POST', `/crm/v3/objects/${OBJECT_TYPE}`, token, { properties });
  
  if (args.verbose) {
    console.log(JSON.stringify(deal, null, 2));
    return;
  }
  
  console.log('Deal created successfully!\n');
  console.log(`ID: ${deal.id}`);
  console.log(`Name: ${deal.properties.dealname}`);
  if (deal.properties.amount) console.log(`Amount: ${formatCurrency(deal.properties.amount)}`);
  if (deal.properties.dealstage) console.log(`Stage: ${deal.properties.dealstage}`);
}

// Update deal
async function updateDeal(id, args) {
  const token = getToken();
  
  const properties = {};
  
  if (args.name) properties.dealname = args.name;
  if (args.amount) properties.amount = args.amount;
  if (args.stage) properties.dealstage = args.stage;
  if (args.pipeline) properties.pipeline = args.pipeline;
  if (args.closedate) properties.closedate = args.closedate;
  if (args.owner) properties.hubspot_owner_id = args.owner;
  
  if (Object.keys(properties).length === 0) {
    console.error('Error: No properties to update. Use --name, --amount, --stage, etc.');
    process.exit(1);
  }
  
  const deal = await apiRequest('PATCH', `/crm/v3/objects/${OBJECT_TYPE}/${id}`, token, { properties });
  
  if (args.verbose) {
    console.log(JSON.stringify(deal, null, 2));
    return;
  }
  
  console.log('Deal updated successfully!\n');
  console.log(`ID: ${deal.id}`);
  console.log(`Updated properties: ${Object.keys(properties).join(', ')}`);
}

// Delete deal
async function deleteDeal(id, args) {
  const token = getToken();
  
  // Get deal info first
  const deal = await apiRequest('GET', `/crm/v3/objects/${OBJECT_TYPE}/${id}?properties=dealname,amount`, token);
  const name = deal.properties.dealname || id;
  
  const confirmed = await confirmDestructiveAction(
    `Delete deal: ${name}`,
    [
      `ID: ${id}`,
      `Amount: ${formatCurrency(deal.properties.amount)}`,
      'All associated data will be removed.'
    ],
    args.force
  );
  
  if (!confirmed) return;
  
  await apiRequest('DELETE', `/crm/v3/objects/${OBJECT_TYPE}/${id}`, token);
  
  console.log('Deal deleted successfully.');
}

// Main
async function main() {
  const args = parseArgs(process.argv.slice(2));
  const command = args._[0];
  
  try {
    switch (command) {
      case 'list':
        await listDeals(args);
        break;
      case 'get':
        if (!args._[1]) {
          console.error('Error: Deal ID required');
          console.error('Usage: node deals.js get <id>');
          process.exit(1);
        }
        await getDeal(args._[1], args);
        break;
      case 'search':
        if (!args._[1]) {
          console.error('Error: Search query required');
          console.error('Usage: node deals.js search <query>');
          process.exit(1);
        }
        await searchDeals(args._[1], args);
        break;
      case 'pipelines':
        await listPipelines(args);
        break;
      case 'create':
        await createDeal(args);
        break;
      case 'update':
        if (!args._[1]) {
          console.error('Error: Deal ID required');
          console.error('Usage: node deals.js update <id> --property value');
          process.exit(1);
        }
        await updateDeal(args._[1], args);
        break;
      case 'delete':
        if (!args._[1]) {
          console.error('Error: Deal ID required');
          console.error('Usage: node deals.js delete <id>');
          process.exit(1);
        }
        await deleteDeal(args._[1], args);
        break;
      case 'help':
      default:
        printHelp();
    }
  } catch (error) {
    handleError(error, args.verbose);
  }
}

main();
