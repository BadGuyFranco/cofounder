#!/usr/bin/env node

/**
 * HubSpot Line Items Management
 * Manage line items that link products to deals.
 */

import { fileURLToPath } from 'url';
import path from 'path';
import {
  loadEnv, getToken, parseArgs, apiRequest, apiRequestPaginated,
  confirmDestructiveAction, formatDate, formatCurrency, handleError, showHelp
} from './utils.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
loadEnv(path.join(__dirname, '..'));

const OBJECT_TYPE = 'line_items';
const DEFAULT_PROPERTIES = ['name', 'quantity', 'price', 'amount', 'hs_product_id', 'hs_sku'];

// Help documentation
function printHelp() {
  showHelp('HubSpot Line Items', {
    'Commands': [
      'list                        List all line items',
      'get <id>                    Get line item by ID',
      'create                      Create a new line item',
      'update <id>                 Update a line item',
      'delete <id>                 Delete a line item (destructive)',
      'help                        Show this help'
    ],
    'Options': [
      '--name <name>               Line item name (required if no product)',
      '--product <id>              Product ID to create line item from',
      '--quantity <n>              Quantity (default: 1)',
      '--price <amount>            Unit price (overrides product price)',
      '--discount <percent>        Discount percentage',
      '--deal <id>                 Associate with deal (required for create)',
      '--quote <id>                Associate with quote',
      '--properties <list>         Comma-separated properties to return',
      '--limit <n>                 Results per page',
      '--all                       Fetch all pages',
      '--verbose                   Show full API response',
      '--force                     Skip confirmation for delete'
    ],
    'Examples': [
      'node line-items.js list',
      'node line-items.js get 12345',
      'node line-items.js create --product 11111 --quantity 2 --deal 22222',
      'node line-items.js create --name "Custom Service" --price 500 --quantity 10 --deal 22222',
      'node line-items.js update 12345 --quantity 5',
      'node line-items.js delete 12345'
    ],
    'Note': [
      'Line items are typically created from products and associated with deals.',
      'Each deal can have multiple line items.'
    ]
  });
}

// List all line items
async function listLineItems(args) {
  const token = getToken();
  const limit = parseInt(args.limit) || 100;
  const all = args.all || false;
  const properties = args.properties ? args.properties.split(',') : DEFAULT_PROPERTIES;
  
  console.log('Fetching line items...\n');
  
  const endpoint = `/crm/v3/objects/${OBJECT_TYPE}?properties=${properties.join(',')}`;
  const { results, meta } = await apiRequestPaginated(endpoint, token, { all, limit });
  
  if (args.verbose) {
    console.log(JSON.stringify(results, null, 2));
    return;
  }
  
  console.log(`Found ${meta.total} line items${all ? '' : ' (page 1)'}:\n`);
  
  for (const item of results) {
    const props = item.properties;
    console.log(`- ${props.name || 'Unnamed item'}`);
    console.log(`  ID: ${item.id}`);
    console.log(`  Quantity: ${props.quantity || 1}`);
    console.log(`  Unit Price: ${formatCurrency(props.price)}`);
    console.log(`  Total: ${formatCurrency(props.amount)}`);
    if (props.hs_sku) console.log(`  SKU: ${props.hs_sku}`);
    console.log('');
  }
}

// Get single line item
async function getLineItem(id, args) {
  const token = getToken();
  const properties = args.properties ? args.properties.split(',') : DEFAULT_PROPERTIES;
  
  const endpoint = `/crm/v3/objects/${OBJECT_TYPE}/${id}?properties=${properties.join(',')}`;
  const item = await apiRequest('GET', endpoint, token);
  
  if (args.verbose) {
    console.log(JSON.stringify(item, null, 2));
    return;
  }
  
  const props = item.properties;
  
  console.log(`Line Item: ${props.name || 'Unnamed'}\n`);
  console.log(`ID: ${item.id}`);
  console.log(`Product ID: ${props.hs_product_id || 'N/A'}`);
  console.log(`SKU: ${props.hs_sku || 'N/A'}`);
  console.log(`Quantity: ${props.quantity || 1}`);
  console.log(`Unit Price: ${formatCurrency(props.price)}`);
  console.log(`Total Amount: ${formatCurrency(props.amount)}`);
  console.log(`\nCreated: ${formatDate(item.createdAt)}`);
}

// Create line item
async function createLineItem(args) {
  const token = getToken();
  
  if (!args.deal) {
    console.error('Error: --deal is required to create a line item');
    process.exit(1);
  }
  
  if (!args.product && !args.name) {
    console.error('Error: Either --product or --name is required');
    process.exit(1);
  }
  
  const properties = {
    quantity: args.quantity || '1'
  };
  
  if (args.product) properties.hs_product_id = args.product;
  if (args.name) properties.name = args.name;
  if (args.price) properties.price = args.price;
  if (args.discount) properties.hs_discount_percentage = args.discount;
  
  const item = await apiRequest('POST', `/crm/v3/objects/${OBJECT_TYPE}`, token, { properties });
  
  console.log('Line item created successfully!');
  console.log(`ID: ${item.id}\n`);
  
  // Associate with deal
  try {
    const assocBody = [{ associationCategory: 'HUBSPOT_DEFINED', associationTypeId: 20 }];
    await apiRequest('PUT', `/crm/v4/objects/line_items/${item.id}/associations/deals/${args.deal}`, token, assocBody);
    console.log(`Associated with deal/${args.deal}`);
  } catch (error) {
    console.error(`Warning: Failed to associate with deal: ${error.message}`);
  }
  
  // Associate with quote if specified
  if (args.quote) {
    try {
      const assocBody = [{ associationCategory: 'HUBSPOT_DEFINED', associationTypeId: 68 }];
      await apiRequest('PUT', `/crm/v4/objects/line_items/${item.id}/associations/quotes/${args.quote}`, token, assocBody);
      console.log(`Associated with quote/${args.quote}`);
    } catch (error) {
      console.error(`Warning: Failed to associate with quote: ${error.message}`);
    }
  }
}

// Update line item
async function updateLineItem(id, args) {
  const token = getToken();
  
  const properties = {};
  if (args.name) properties.name = args.name;
  if (args.quantity) properties.quantity = args.quantity;
  if (args.price) properties.price = args.price;
  if (args.discount) properties.hs_discount_percentage = args.discount;
  
  if (Object.keys(properties).length === 0) {
    console.error('Error: No properties to update.');
    process.exit(1);
  }
  
  await apiRequest('PATCH', `/crm/v3/objects/${OBJECT_TYPE}/${id}`, token, { properties });
  console.log('Line item updated successfully!');
}

// Delete line item
async function deleteLineItem(id, args) {
  const token = getToken();
  
  const item = await apiRequest('GET', `/crm/v3/objects/${OBJECT_TYPE}/${id}?properties=name`, token);
  const name = item.properties.name || id;
  
  const confirmed = await confirmDestructiveAction(
    `Delete line item: ${name}`,
    [`ID: ${id}`, 'This line item will be removed from associated deals/quotes.'],
    args.force
  );
  
  if (!confirmed) return;
  
  await apiRequest('DELETE', `/crm/v3/objects/${OBJECT_TYPE}/${id}`, token);
  console.log('Line item deleted successfully.');
}

// Main
async function main() {
  const args = parseArgs(process.argv.slice(2));
  const command = args._[0];
  
  try {
    switch (command) {
      case 'list': await listLineItems(args); break;
      case 'get':
        if (!args._[1]) { console.error('Error: Line item ID required'); process.exit(1); }
        await getLineItem(args._[1], args); break;
      case 'create': await createLineItem(args); break;
      case 'update':
        if (!args._[1]) { console.error('Error: Line item ID required'); process.exit(1); }
        await updateLineItem(args._[1], args); break;
      case 'delete':
        if (!args._[1]) { console.error('Error: Line item ID required'); process.exit(1); }
        await deleteLineItem(args._[1], args); break;
      case 'help':
      default: printHelp();
    }
  } catch (error) {
    handleError(error, args.verbose);
  }
}

main();
