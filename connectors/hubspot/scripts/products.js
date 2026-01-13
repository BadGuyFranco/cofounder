#!/usr/bin/env node

/**
 * HubSpot Products Management
 * Manage product catalog for quotes and line items.
 */

import { fileURLToPath } from 'url';
import path from 'path';
import {
  loadEnv, getToken, parseArgs, apiRequest, apiRequestPaginated,
  searchRequest, confirmDestructiveAction, formatDate, formatCurrency, handleError, showHelp
} from './utils.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
loadEnv(path.join(__dirname, '..'));

const OBJECT_TYPE = 'products';
const DEFAULT_PROPERTIES = ['name', 'description', 'price', 'hs_sku', 'hs_cost_of_goods_sold', 'hs_recurring_billing_period'];

// Help documentation
function printHelp() {
  showHelp('HubSpot Products', {
    'Commands': [
      'list                        List all products',
      'get <id>                    Get product by ID',
      'search <query>              Search products by name',
      'create                      Create a new product',
      'update <id>                 Update a product',
      'delete <id>                 Delete a product (destructive)',
      'help                        Show this help'
    ],
    'Options': [
      '--name <name>               Product name (required for create)',
      '--description <text>        Product description',
      '--price <amount>            Unit price in dollars',
      '--sku <sku>                 SKU/product code',
      '--cost <amount>             Cost of goods sold',
      '--recurring <period>        Billing period: monthly, quarterly,',
      '                            semi_annually, annually',
      '--properties <list>         Comma-separated properties to return',
      '--limit <n>                 Results per page',
      '--all                       Fetch all pages',
      '--verbose                   Show full API response',
      '--force                     Skip confirmation for delete'
    ],
    'Examples': [
      'node products.js list',
      'node products.js search "consulting"',
      'node products.js get 12345',
      'node products.js create --name "Consulting Hour" --price 250 --sku "CONSULT-HR"',
      'node products.js create --name "Monthly Retainer" --price 5000 --recurring monthly',
      'node products.js update 12345 --price 300',
      'node products.js delete 12345'
    ]
  });
}

// List all products
async function listProducts(args) {
  const token = getToken();
  const limit = parseInt(args.limit) || 100;
  const all = args.all || false;
  const properties = args.properties ? args.properties.split(',') : DEFAULT_PROPERTIES;
  
  console.log('Fetching products...\n');
  
  const endpoint = `/crm/v3/objects/${OBJECT_TYPE}?properties=${properties.join(',')}`;
  const { results, meta } = await apiRequestPaginated(endpoint, token, { all, limit });
  
  if (args.verbose) {
    console.log(JSON.stringify(results, null, 2));
    return;
  }
  
  console.log(`Found ${meta.total} products${all ? '' : ' (page 1)'}:\n`);
  
  for (const product of results) {
    const props = product.properties;
    console.log(`- ${props.name || 'Unnamed product'}`);
    console.log(`  ID: ${product.id}`);
    console.log(`  Price: ${formatCurrency(props.price)}`);
    if (props.hs_sku) console.log(`  SKU: ${props.hs_sku}`);
    if (props.hs_recurring_billing_period) console.log(`  Billing: ${props.hs_recurring_billing_period}`);
    console.log('');
  }
}

// Get single product
async function getProduct(id, args) {
  const token = getToken();
  const properties = args.properties ? args.properties.split(',') : DEFAULT_PROPERTIES;
  
  const endpoint = `/crm/v3/objects/${OBJECT_TYPE}/${id}?properties=${properties.join(',')}`;
  const product = await apiRequest('GET', endpoint, token);
  
  if (args.verbose) {
    console.log(JSON.stringify(product, null, 2));
    return;
  }
  
  const props = product.properties;
  
  console.log(`Product: ${props.name || 'Unnamed'}\n`);
  console.log(`ID: ${product.id}`);
  console.log(`Price: ${formatCurrency(props.price)}`);
  console.log(`SKU: ${props.hs_sku || 'N/A'}`);
  console.log(`Cost: ${props.hs_cost_of_goods_sold ? formatCurrency(props.hs_cost_of_goods_sold) : 'N/A'}`);
  console.log(`Billing: ${props.hs_recurring_billing_period || 'One-time'}`);
  if (props.description) console.log(`\nDescription:\n${props.description}`);
  console.log(`\nCreated: ${formatDate(product.createdAt)}`);
}

// Search products
async function searchProducts(query, args) {
  const token = getToken();
  const limit = parseInt(args.limit) || 100;
  const properties = args.properties ? args.properties.split(',') : DEFAULT_PROPERTIES;
  
  console.log(`Searching for "${query}"...\n`);
  
  const filters = [{
    propertyName: 'name',
    operator: 'CONTAINS_TOKEN',
    value: query
  }];
  
  const { results } = await searchRequest(OBJECT_TYPE, token, filters, { limit, properties });
  
  if (args.verbose) {
    console.log(JSON.stringify(results, null, 2));
    return;
  }
  
  console.log(`Found ${results.length} products:\n`);
  
  for (const product of results) {
    const props = product.properties;
    console.log(`- ${props.name || 'Unnamed'}`);
    console.log(`  ID: ${product.id}`);
    console.log(`  Price: ${formatCurrency(props.price)}`);
    console.log('');
  }
}

// Create product
async function createProduct(args) {
  const token = getToken();
  
  if (!args.name) {
    console.error('Error: --name is required');
    process.exit(1);
  }
  
  const properties = {
    name: args.name
  };
  
  if (args.description) properties.description = args.description;
  if (args.price) properties.price = args.price;
  if (args.sku) properties.hs_sku = args.sku;
  if (args.cost) properties.hs_cost_of_goods_sold = args.cost;
  if (args.recurring) properties.hs_recurring_billing_period = args.recurring.toLowerCase();
  
  const product = await apiRequest('POST', `/crm/v3/objects/${OBJECT_TYPE}`, token, { properties });
  
  console.log('Product created successfully!');
  console.log(`ID: ${product.id}`);
  console.log(`Name: ${product.properties.name}`);
  if (product.properties.price) console.log(`Price: ${formatCurrency(product.properties.price)}`);
}

// Update product
async function updateProduct(id, args) {
  const token = getToken();
  
  const properties = {};
  if (args.name) properties.name = args.name;
  if (args.description) properties.description = args.description;
  if (args.price) properties.price = args.price;
  if (args.sku) properties.hs_sku = args.sku;
  if (args.cost) properties.hs_cost_of_goods_sold = args.cost;
  if (args.recurring) properties.hs_recurring_billing_period = args.recurring.toLowerCase();
  
  if (Object.keys(properties).length === 0) {
    console.error('Error: No properties to update.');
    process.exit(1);
  }
  
  await apiRequest('PATCH', `/crm/v3/objects/${OBJECT_TYPE}/${id}`, token, { properties });
  console.log('Product updated successfully!');
}

// Delete product
async function deleteProduct(id, args) {
  const token = getToken();
  
  const product = await apiRequest('GET', `/crm/v3/objects/${OBJECT_TYPE}/${id}?properties=name`, token);
  const name = product.properties.name || id;
  
  const confirmed = await confirmDestructiveAction(
    `Delete product: ${name}`,
    [`ID: ${id}`, 'This product will be permanently removed.'],
    args.force
  );
  
  if (!confirmed) return;
  
  await apiRequest('DELETE', `/crm/v3/objects/${OBJECT_TYPE}/${id}`, token);
  console.log('Product deleted successfully.');
}

// Main
async function main() {
  const args = parseArgs(process.argv.slice(2));
  const command = args._[0];
  
  try {
    switch (command) {
      case 'list': await listProducts(args); break;
      case 'get':
        if (!args._[1]) { console.error('Error: Product ID required'); process.exit(1); }
        await getProduct(args._[1], args); break;
      case 'search':
        if (!args._[1]) { console.error('Error: Search query required'); process.exit(1); }
        await searchProducts(args._[1], args); break;
      case 'create': await createProduct(args); break;
      case 'update':
        if (!args._[1]) { console.error('Error: Product ID required'); process.exit(1); }
        await updateProduct(args._[1], args); break;
      case 'delete':
        if (!args._[1]) { console.error('Error: Product ID required'); process.exit(1); }
        await deleteProduct(args._[1], args); break;
      case 'help':
      default: printHelp();
    }
  } catch (error) {
    handleError(error, args.verbose);
  }
}

main();
