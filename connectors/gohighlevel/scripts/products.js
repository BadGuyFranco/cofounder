#!/usr/bin/env node

/**
 * Go High Level Products Management
 * 
 * Commands:
 *   list                     List all products
 *   get <id>                Get product details
 *   create                  Create new product
 *   update <id>             Update product
 *   delete <id>             Delete product (DESTRUCTIVE)
 *   prices <product-id>     List prices for a product
 *   create-price <prod-id>  Create price for product
 *   delete-price <price-id> Delete price (DESTRUCTIVE)
 */

import path from 'path';
import { fileURLToPath } from 'url';
import {
  loadEnv,
  loadLocations,
  resolveLocation,
  parseArgs,
  apiRequest,
  apiRequestPaginated,
  confirmDestructiveAction,
  listLocations,
  formatCurrency,
  handleError
} from './utils.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment
loadEnv(__dirname);
const locationsConfig = loadLocations();

// Parse arguments
const args = parseArgs(process.argv.slice(2));
const command = args._[0];
const verbose = args.verbose || false;
const force = args.force || false;

async function listProducts(locationConfig) {
  try {
    const params = new URLSearchParams();
    params.append('locationId', locationConfig.id);
    
    if (args.limit) params.append('limit', args.limit);
    if (args.offset) params.append('offset', args.offset);
    
    const endpoint = `/products/?${params.toString()}`;
    
    if (args.all) {
      const { results, meta } = await apiRequestPaginated(endpoint, locationConfig.key, { 
        all: true, 
        limit: args.limit || 100 
      });
      console.log(`Found ${meta.total} products (${meta.pages} pages):\n`);
      displayProducts(results);
    } else {
      const data = await apiRequest('GET', endpoint, locationConfig.key);
      const products = data.products || [];
      console.log(`Found ${products.length} products:\n`);
      displayProducts(products);
    }
  } catch (error) {
    handleError(error, verbose);
  }
}

function displayProducts(products) {
  if (products.length === 0) {
    console.log('No products found.');
    return;
  }
  
  for (const prod of products) {
    console.log(`- ${prod.name}`);
    console.log(`  ID: ${prod._id || prod.id}`);
    console.log(`  Type: ${prod.productType || 'N/A'}`);
    if (prod.description) console.log(`  Description: ${prod.description.substring(0, 50)}...`);
    if (prod.prices && prod.prices.length > 0) {
      console.log(`  Prices: ${prod.prices.length} variant(s)`);
    }
    console.log('');
  }
}

async function getProduct(productId, locationConfig) {
  try {
    const data = await apiRequest(
      'GET',
      `/products/${productId}?locationId=${locationConfig.id}`,
      locationConfig.key
    );
    
    console.log('Product Details:\n');
    const prod = data.product || data;
    console.log(`Name: ${prod.name}`);
    console.log(`ID: ${prod._id || prod.id}`);
    console.log(`Type: ${prod.productType || 'N/A'}`);
    if (prod.description) console.log(`Description: ${prod.description}`);
    if (prod.statementDescriptor) console.log(`Statement: ${prod.statementDescriptor}`);
    
    if (prod.prices && prod.prices.length > 0) {
      console.log('\nPrices:');
      for (const price of prod.prices) {
        console.log(`  - ${price.name || 'Default'}`);
        console.log(`    ID: ${price._id || price.id}`);
        console.log(`    Amount: ${formatCurrency(price.amount / 100)}`); // Usually in cents
        console.log(`    Type: ${price.type || 'one_time'}`);
        if (price.recurring) {
          console.log(`    Interval: ${price.recurring.interval}`);
        }
      }
    }
    
    if (verbose) {
      console.log('\nFull Response:');
      console.log(JSON.stringify(data, null, 2));
    }
  } catch (error) {
    handleError(error, verbose);
  }
}

async function createProduct(locationConfig) {
  try {
    const name = args.name;
    
    if (!name) {
      console.error('Error: --name is required');
      process.exit(1);
    }
    
    const body = {
      locationId: locationConfig.id,
      name,
      productType: args.type || 'SERVICE'
    };
    
    if (args.description) body.description = args.description;
    if (args.statement) body.statementDescriptor = args.statement;
    if (args.image) body.image = args.image;
    
    const data = await apiRequest('POST', '/products/', locationConfig.key, body);
    
    console.log('Product created successfully!\n');
    const prod = data.product || data;
    console.log(`ID: ${prod._id || prod.id}`);
    console.log(`Name: ${prod.name}`);
    console.log(`Type: ${prod.productType}`);
    
    console.log('\nNext: Create a price for this product:');
    console.log(`  node products.js create-price ${prod._id || prod.id} --amount 1000 --name "Standard" --location "${args.location}"`);
    
  } catch (error) {
    handleError(error, verbose);
  }
}

async function updateProduct(productId, locationConfig) {
  try {
    const body = {
      locationId: locationConfig.id
    };
    
    if (args.name) body.name = args.name;
    if (args.description) body.description = args.description;
    if (args.statement) body.statementDescriptor = args.statement;
    if (args.image) body.image = args.image;
    
    if (Object.keys(body).length <= 1) {
      console.error('Error: No fields to update');
      console.error('Use --name, --description, --statement, or --image');
      process.exit(1);
    }
    
    const data = await apiRequest('PUT', `/products/${productId}`, locationConfig.key, body);
    
    console.log('Product updated successfully!\n');
    const prod = data.product || data;
    console.log(`ID: ${prod._id || prod.id}`);
    console.log(`Name: ${prod.name}`);
    
  } catch (error) {
    handleError(error, verbose);
  }
}

async function deleteProduct(productId, locationConfig) {
  try {
    // Get product details first
    const productData = await apiRequest(
      'GET',
      `/products/${productId}?locationId=${locationConfig.id}`,
      locationConfig.key
    );
    const prod = productData.product || productData;
    
    const confirmed = await confirmDestructiveAction(
      'You are about to DELETE a product',
      [
        `Product: ${prod.name}`,
        `Type: ${prod.productType}`,
        '',
        'This will remove the product from your catalog.',
        'Existing orders will not be affected.'
      ],
      force
    );
    
    if (!confirmed) return;
    
    await apiRequest(
      'DELETE',
      `/products/${productId}?locationId=${locationConfig.id}`,
      locationConfig.key
    );
    
    console.log('Product deleted successfully.');
    
  } catch (error) {
    handleError(error, verbose);
  }
}

async function listPrices(productId, locationConfig) {
  try {
    const data = await apiRequest(
      'GET',
      `/products/${productId}/prices?locationId=${locationConfig.id}`,
      locationConfig.key
    );
    
    const prices = data.prices || [];
    console.log(`Found ${prices.length} prices:\n`);
    
    if (prices.length === 0) {
      console.log('No prices found for this product.');
      return;
    }
    
    for (const price of prices) {
      console.log(`- ${price.name || 'Default'}`);
      console.log(`  ID: ${price._id || price.id}`);
      console.log(`  Amount: ${formatCurrency(price.amount / 100)}`);
      console.log(`  Type: ${price.type || 'one_time'}`);
      console.log(`  Currency: ${price.currency || 'USD'}`);
      if (price.recurring) {
        console.log(`  Recurring: Every ${price.recurring.intervalCount || 1} ${price.recurring.interval}`);
      }
      console.log('');
    }
    
  } catch (error) {
    handleError(error, verbose);
  }
}

async function createPrice(productId, locationConfig) {
  try {
    const amount = parseInt(args.amount);
    
    if (!amount || isNaN(amount)) {
      console.error('Error: --amount is required (in cents, e.g., 1000 = $10.00)');
      process.exit(1);
    }
    
    const body = {
      locationId: locationConfig.id,
      amount,
      currency: args.currency || 'USD',
      type: args['price-type'] || 'one_time'
    };
    
    if (args.name) body.name = args.name;
    
    // Handle recurring pricing
    if (args.interval) {
      body.type = 'recurring';
      body.recurring = {
        interval: args.interval, // day, week, month, year
        intervalCount: parseInt(args['interval-count']) || 1
      };
    }
    
    const data = await apiRequest('POST', `/products/${productId}/prices`, locationConfig.key, body);
    
    console.log('Price created successfully!\n');
    const price = data.price || data;
    console.log(`ID: ${price._id || price.id}`);
    console.log(`Amount: ${formatCurrency(price.amount / 100)}`);
    console.log(`Type: ${price.type}`);
    
  } catch (error) {
    handleError(error, verbose);
  }
}

async function deletePrice(priceId, locationConfig) {
  try {
    const productId = args['product-id'];
    
    if (!productId) {
      console.error('Error: --product-id is required');
      process.exit(1);
    }
    
    const confirmed = await confirmDestructiveAction(
      'You are about to DELETE a price',
      [
        `Price ID: ${priceId}`,
        `Product ID: ${productId}`,
        '',
        'This will remove this pricing option.',
        'Existing subscriptions may be affected.'
      ],
      force
    );
    
    if (!confirmed) return;
    
    await apiRequest(
      'DELETE',
      `/products/${productId}/prices/${priceId}?locationId=${locationConfig.id}`,
      locationConfig.key
    );
    
    console.log('Price deleted successfully.');
    
  } catch (error) {
    handleError(error, verbose);
  }
}

function showHelp() {
  console.log(`
Go High Level Product Management

Usage:
  node products.js <command> [options]

Commands:
  list                      List all products
  get <id>                 Get product details
  create                   Create new product
  update <id>              Update product
  delete <id>              Delete product (DESTRUCTIVE)
  prices <product-id>      List prices for a product
  create-price <prod-id>   Create price for product
  delete-price <price-id>  Delete price (DESTRUCTIVE)
  locations                List configured locations

Options:
  --location "Name"        Specify GHL sub-account
  --name "Name"            Product/price name
  --description "Desc"     Product description
  --type "TYPE"            Product type: DIGITAL, PHYSICAL, SERVICE
  --statement "Desc"       Statement descriptor
  --image "URL"            Product image URL
  --amount <cents>         Price amount in cents (1000 = $10.00)
  --currency "USD"         Currency code
  --price-type "type"      Price type: one_time, recurring
  --interval "month"       Recurring interval: day, week, month, year
  --interval-count <n>     Number of intervals between billing
  --product-id <id>        Product ID (for delete-price)
  --all                    Fetch all pages
  --limit <n>              Results per page
  --verbose                Show full API response
  --force                  Skip confirmation prompts

Examples:
  node products.js list --location "My Account"
  node products.js create --name "Consulting Package" --type SERVICE --location "My Account"
  node products.js create-price prod123 --amount 50000 --name "Monthly" --interval month --location "My Account"
  node products.js delete prod123 --location "My Account"

Product Types: DIGITAL, PHYSICAL, SERVICE
Price Types: one_time, recurring
`);
}

// Main execution
async function main() {
  if (!command || command === 'help' || command === '--help' || command === '-h') {
    showHelp();
    return;
  }
  
  if (command === 'locations') {
    listLocations(locationsConfig);
    return;
  }
  
  const locationConfig = resolveLocation(args.location, locationsConfig);
  
  switch (command) {
    case 'list':
      await listProducts(locationConfig);
      break;
    case 'get':
      if (!args._[1]) {
        console.error('Error: Product ID required');
        process.exit(1);
      }
      await getProduct(args._[1], locationConfig);
      break;
    case 'create':
      await createProduct(locationConfig);
      break;
    case 'update':
      if (!args._[1]) {
        console.error('Error: Product ID required');
        process.exit(1);
      }
      await updateProduct(args._[1], locationConfig);
      break;
    case 'delete':
      if (!args._[1]) {
        console.error('Error: Product ID required');
        process.exit(1);
      }
      await deleteProduct(args._[1], locationConfig);
      break;
    case 'prices':
      if (!args._[1]) {
        console.error('Error: Product ID required');
        process.exit(1);
      }
      await listPrices(args._[1], locationConfig);
      break;
    case 'create-price':
      if (!args._[1]) {
        console.error('Error: Product ID required');
        process.exit(1);
      }
      await createPrice(args._[1], locationConfig);
      break;
    case 'delete-price':
      if (!args._[1]) {
        console.error('Error: Price ID required');
        process.exit(1);
      }
      await deletePrice(args._[1], locationConfig);
      break;
    default:
      console.error(`Unknown command: ${command}`);
      console.error('Run "node products.js help" for usage');
      process.exit(1);
  }
}

main();
