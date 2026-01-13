#!/usr/bin/env node

/**
 * HubSpot Quotes Management
 * Create and manage sales quotes.
 */

import { fileURLToPath } from 'url';
import path from 'path';
import {
  loadEnv, getToken, parseArgs, apiRequest, apiRequestPaginated,
  searchRequest, confirmDestructiveAction, formatDate, formatCurrency, handleError, showHelp
} from './utils.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
loadEnv(path.join(__dirname, '..'));

const OBJECT_TYPE = 'quotes';
const DEFAULT_PROPERTIES = ['hs_title', 'hs_status', 'hs_expiration_date', 'hs_quote_amount', 'hs_currency'];

// Help documentation
function printHelp() {
  showHelp('HubSpot Quotes', {
    'Commands': [
      'list                        List all quotes',
      'get <id>                    Get quote by ID',
      'search <query>              Search quotes by title',
      'create                      Create a new quote',
      'update <id>                 Update a quote',
      'delete <id>                 Delete a quote (destructive)',
      'help                        Show this help'
    ],
    'Options': [
      '--title <title>             Quote title (required for create)',
      '--status <status>           Status: DRAFT, PENDING_APPROVAL, APPROVED,',
      '                            REJECTED, SENT, SIGNED, PAID',
      '--expiration <date>         Expiration date (YYYY-MM-DD)',
      '--deal <id>                 Associate with deal',
      '--contact <id>              Associate with contact',
      '--company <id>              Associate with company',
      '--properties <list>         Comma-separated properties to return',
      '--limit <n>                 Results per page',
      '--all                       Fetch all pages',
      '--verbose                   Show full API response',
      '--force                     Skip confirmation for delete'
    ],
    'Examples': [
      'node quotes.js list',
      'node quotes.js get 12345',
      'node quotes.js search "consulting"',
      'node quotes.js create --title "Q1 Consulting Proposal" --deal 67890',
      'node quotes.js update 12345 --status APPROVED',
      'node quotes.js delete 12345'
    ],
    'Note': [
      'Quotes require Sales Hub Professional or Enterprise.',
      'Line items are added separately (see line-items.js).'
    ]
  });
}

// List all quotes
async function listQuotes(args) {
  const token = getToken();
  const limit = parseInt(args.limit) || 100;
  const all = args.all || false;
  const properties = args.properties ? args.properties.split(',') : DEFAULT_PROPERTIES;
  
  console.log('Fetching quotes...\n');
  
  const endpoint = `/crm/v3/objects/${OBJECT_TYPE}?properties=${properties.join(',')}`;
  const { results, meta } = await apiRequestPaginated(endpoint, token, { all, limit });
  
  if (args.verbose) {
    console.log(JSON.stringify(results, null, 2));
    return;
  }
  
  console.log(`Found ${meta.total} quotes${all ? '' : ' (page 1)'}:\n`);
  
  for (const quote of results) {
    const props = quote.properties;
    console.log(`- ${props.hs_title || 'Untitled quote'}`);
    console.log(`  ID: ${quote.id}`);
    console.log(`  Status: ${props.hs_status || 'N/A'}`);
    console.log(`  Amount: ${formatCurrency(props.hs_quote_amount)}`);
    if (props.hs_expiration_date) console.log(`  Expires: ${props.hs_expiration_date}`);
    console.log(`  Created: ${formatDate(quote.createdAt)}`);
    console.log('');
  }
}

// Get single quote
async function getQuote(id, args) {
  const token = getToken();
  const properties = args.properties ? args.properties.split(',') : DEFAULT_PROPERTIES;
  
  const endpoint = `/crm/v3/objects/${OBJECT_TYPE}/${id}?properties=${properties.join(',')}`;
  const quote = await apiRequest('GET', endpoint, token);
  
  if (args.verbose) {
    console.log(JSON.stringify(quote, null, 2));
    return;
  }
  
  const props = quote.properties;
  
  console.log(`Quote: ${props.hs_title || 'Untitled'}\n`);
  console.log(`ID: ${quote.id}`);
  console.log(`Status: ${props.hs_status || 'N/A'}`);
  console.log(`Amount: ${formatCurrency(props.hs_quote_amount)}`);
  console.log(`Currency: ${props.hs_currency || 'USD'}`);
  console.log(`Expires: ${props.hs_expiration_date || 'N/A'}`);
  console.log(`Created: ${formatDate(quote.createdAt)}`);
  console.log(`Updated: ${formatDate(quote.updatedAt)}`);
}

// Search quotes
async function searchQuotes(query, args) {
  const token = getToken();
  const limit = parseInt(args.limit) || 100;
  const properties = args.properties ? args.properties.split(',') : DEFAULT_PROPERTIES;
  
  console.log(`Searching for "${query}"...\n`);
  
  const filters = [{
    propertyName: 'hs_title',
    operator: 'CONTAINS_TOKEN',
    value: query
  }];
  
  const { results } = await searchRequest(OBJECT_TYPE, token, filters, { limit, properties });
  
  if (args.verbose) {
    console.log(JSON.stringify(results, null, 2));
    return;
  }
  
  console.log(`Found ${results.length} quotes:\n`);
  
  for (const quote of results) {
    const props = quote.properties;
    console.log(`- ${props.hs_title || 'Untitled'}`);
    console.log(`  ID: ${quote.id}`);
    console.log(`  Status: ${props.hs_status || 'N/A'}`);
    console.log(`  Amount: ${formatCurrency(props.hs_quote_amount)}`);
    console.log('');
  }
}

// Create quote
async function createQuote(args) {
  const token = getToken();
  
  if (!args.title) {
    console.error('Error: --title is required');
    process.exit(1);
  }
  
  const properties = {
    hs_title: args.title,
    hs_status: args.status || 'DRAFT'
  };
  
  if (args.expiration) properties.hs_expiration_date = args.expiration;
  
  const quote = await apiRequest('POST', `/crm/v3/objects/${OBJECT_TYPE}`, token, { properties });
  
  console.log('Quote created successfully!');
  console.log(`ID: ${quote.id}`);
  console.log(`Title: ${quote.properties.hs_title}\n`);
  
  // Associate with objects
  const associations = [];
  if (args.deal) associations.push({ type: 'deals', id: args.deal, typeId: 64 });
  if (args.contact) associations.push({ type: 'contacts', id: args.contact, typeId: 70 });
  if (args.company) associations.push({ type: 'companies', id: args.company, typeId: 72 });
  
  for (const assoc of associations) {
    try {
      const assocBody = [{ associationCategory: 'HUBSPOT_DEFINED', associationTypeId: assoc.typeId }];
      await apiRequest('PUT', `/crm/v4/objects/quotes/${quote.id}/associations/${assoc.type}/${assoc.id}`, token, assocBody);
      console.log(`Associated with ${assoc.type}/${assoc.id}`);
    } catch (error) {
      console.error(`Warning: Failed to associate: ${error.message}`);
    }
  }
}

// Update quote
async function updateQuote(id, args) {
  const token = getToken();
  
  const properties = {};
  if (args.title) properties.hs_title = args.title;
  if (args.status) properties.hs_status = args.status.toUpperCase();
  if (args.expiration) properties.hs_expiration_date = args.expiration;
  
  if (Object.keys(properties).length === 0) {
    console.error('Error: No properties to update.');
    process.exit(1);
  }
  
  await apiRequest('PATCH', `/crm/v3/objects/${OBJECT_TYPE}/${id}`, token, { properties });
  console.log('Quote updated successfully!');
}

// Delete quote
async function deleteQuote(id, args) {
  const token = getToken();
  
  const quote = await apiRequest('GET', `/crm/v3/objects/${OBJECT_TYPE}/${id}?properties=hs_title`, token);
  const title = quote.properties.hs_title || id;
  
  const confirmed = await confirmDestructiveAction(
    `Delete quote: ${title}`,
    [`ID: ${id}`, 'This quote will be permanently removed.'],
    args.force
  );
  
  if (!confirmed) return;
  
  await apiRequest('DELETE', `/crm/v3/objects/${OBJECT_TYPE}/${id}`, token);
  console.log('Quote deleted successfully.');
}

// Main
async function main() {
  const args = parseArgs(process.argv.slice(2));
  const command = args._[0];
  
  try {
    switch (command) {
      case 'list': await listQuotes(args); break;
      case 'get':
        if (!args._[1]) { console.error('Error: Quote ID required'); process.exit(1); }
        await getQuote(args._[1], args); break;
      case 'search':
        if (!args._[1]) { console.error('Error: Search query required'); process.exit(1); }
        await searchQuotes(args._[1], args); break;
      case 'create': await createQuote(args); break;
      case 'update':
        if (!args._[1]) { console.error('Error: Quote ID required'); process.exit(1); }
        await updateQuote(args._[1], args); break;
      case 'delete':
        if (!args._[1]) { console.error('Error: Quote ID required'); process.exit(1); }
        await deleteQuote(args._[1], args); break;
      case 'help':
      default: printHelp();
    }
  } catch (error) {
    handleError(error, args.verbose);
  }
}

main();
