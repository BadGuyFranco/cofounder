#!/usr/bin/env node

/**
 * Go High Level Businesses Management
 * 
 * Commands:
 *   list                  List all businesses
 *   get <id>             Get business details
 *   create               Create new business
 *   update <id>          Update business
 *   delete <id>          Delete business (DESTRUCTIVE)
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

async function listBusinesses(locationConfig) {
  try {
    const params = new URLSearchParams();
    params.append('locationId', locationConfig.id);
    
    if (args.limit) params.append('limit', args.limit);
    if (args.skip) params.append('skip', args.skip);
    
    const endpoint = `/businesses/?${params.toString()}`;
    
    if (args.all) {
      const { results, meta } = await apiRequestPaginated(endpoint, locationConfig.key, { 
        all: true, 
        limit: args.limit || 100 
      });
      console.log(`Found ${meta.total} businesses (${meta.pages} pages):\n`);
      displayBusinesses(results);
    } else {
      const data = await apiRequest('GET', endpoint, locationConfig.key);
      const businesses = data.businesses || data.data || [];
      console.log(`Found ${businesses.length} businesses:\n`);
      displayBusinesses(businesses);
    }
  } catch (error) {
    handleError(error, verbose);
  }
}

function displayBusinesses(businesses) {
  if (businesses.length === 0) {
    console.log('No businesses found.');
    return;
  }
  
  for (const biz of businesses) {
    console.log(`- ${biz.name}`);
    console.log(`  ID: ${biz._id || biz.id}`);
    if (biz.email) console.log(`  Email: ${biz.email}`);
    if (biz.phone) console.log(`  Phone: ${biz.phone}`);
    if (biz.website) console.log(`  Website: ${biz.website}`);
    if (biz.address) {
      const addr = biz.address;
      const parts = [addr.addressLine1, addr.city, addr.state, addr.postalCode].filter(Boolean);
      if (parts.length > 0) console.log(`  Address: ${parts.join(', ')}`);
    }
    console.log('');
  }
}

async function getBusiness(businessId, locationConfig) {
  try {
    const data = await apiRequest(
      'GET',
      `/businesses/${businessId}?locationId=${locationConfig.id}`,
      locationConfig.key
    );
    
    console.log('Business Details:\n');
    const biz = data.business || data;
    console.log(`Name: ${biz.name}`);
    console.log(`ID: ${biz._id || biz.id}`);
    
    if (biz.email) console.log(`Email: ${biz.email}`);
    if (biz.phone) console.log(`Phone: ${biz.phone}`);
    if (biz.website) console.log(`Website: ${biz.website}`);
    
    if (biz.address) {
      console.log('\nAddress:');
      const addr = biz.address;
      if (addr.addressLine1) console.log(`  ${addr.addressLine1}`);
      if (addr.addressLine2) console.log(`  ${addr.addressLine2}`);
      if (addr.city || addr.state || addr.postalCode) {
        console.log(`  ${[addr.city, addr.state, addr.postalCode].filter(Boolean).join(', ')}`);
      }
      if (addr.country) console.log(`  ${addr.country}`);
    }
    
    if (biz.description) console.log(`\nDescription: ${biz.description}`);
    
    if (verbose) {
      console.log('\nFull Response:');
      console.log(JSON.stringify(data, null, 2));
    }
  } catch (error) {
    handleError(error, verbose);
  }
}

async function createBusiness(locationConfig) {
  try {
    const name = args.name;
    
    if (!name) {
      console.error('Error: --name is required');
      process.exit(1);
    }
    
    const body = {
      locationId: locationConfig.id,
      name
    };
    
    if (args.email) body.email = args.email;
    if (args.phone) body.phone = args.phone;
    if (args.website) body.website = args.website;
    if (args.description) body.description = args.description;
    
    // Build address object
    if (args.address || args.city || args.state || args.zip || args.country) {
      body.address = {};
      if (args.address) body.address.addressLine1 = args.address;
      if (args['address-2']) body.address.addressLine2 = args['address-2'];
      if (args.city) body.address.city = args.city;
      if (args.state) body.address.state = args.state;
      if (args.zip) body.address.postalCode = args.zip;
      if (args.country) body.address.country = args.country;
    }
    
    const data = await apiRequest('POST', '/businesses/', locationConfig.key, body);
    
    console.log('Business created successfully!\n');
    const biz = data.business || data;
    console.log(`ID: ${biz._id || biz.id}`);
    console.log(`Name: ${biz.name}`);
    
  } catch (error) {
    handleError(error, verbose);
  }
}

async function updateBusiness(businessId, locationConfig) {
  try {
    const body = {
      locationId: locationConfig.id
    };
    
    if (args.name) body.name = args.name;
    if (args.email) body.email = args.email;
    if (args.phone) body.phone = args.phone;
    if (args.website) body.website = args.website;
    if (args.description) body.description = args.description;
    
    // Build address object
    if (args.address || args.city || args.state || args.zip || args.country) {
      body.address = {};
      if (args.address) body.address.addressLine1 = args.address;
      if (args['address-2']) body.address.addressLine2 = args['address-2'];
      if (args.city) body.address.city = args.city;
      if (args.state) body.address.state = args.state;
      if (args.zip) body.address.postalCode = args.zip;
      if (args.country) body.address.country = args.country;
    }
    
    if (Object.keys(body).length <= 1) {
      console.error('Error: No fields to update');
      console.error('Use --name, --email, --phone, --website, --description, or address fields');
      process.exit(1);
    }
    
    const data = await apiRequest('PUT', `/businesses/${businessId}`, locationConfig.key, body);
    
    console.log('Business updated successfully!\n');
    const biz = data.business || data;
    console.log(`ID: ${biz._id || biz.id}`);
    console.log(`Name: ${biz.name}`);
    
  } catch (error) {
    handleError(error, verbose);
  }
}

async function deleteBusiness(businessId, locationConfig) {
  try {
    // Get business details first
    const bizData = await apiRequest(
      'GET',
      `/businesses/${businessId}?locationId=${locationConfig.id}`,
      locationConfig.key
    );
    const biz = bizData.business || bizData;
    
    const confirmed = await confirmDestructiveAction(
      'You are about to DELETE a business',
      [
        `Name: ${biz.name}`,
        '',
        'This will permanently remove the business record.'
      ],
      force
    );
    
    if (!confirmed) return;
    
    await apiRequest(
      'DELETE',
      `/businesses/${businessId}?locationId=${locationConfig.id}`,
      locationConfig.key
    );
    
    console.log('Business deleted successfully.');
    
  } catch (error) {
    handleError(error, verbose);
  }
}

function showHelp() {
  console.log(`
Go High Level Business Management

Usage:
  node businesses.js <command> [options]

Commands:
  list                   List all businesses
  get <id>              Get business details
  create                Create new business
  update <id>           Update business
  delete <id>           Delete business (DESTRUCTIVE)
  locations             List configured locations

Options:
  --location "Name"     Specify GHL sub-account
  --name "Name"         Business name
  --email "email"       Business email
  --phone "+1234567890" Business phone
  --website "url"       Business website
  --description "Desc"  Business description
  --address "Address"   Street address
  --address-2 "Suite"   Address line 2
  --city "City"         City
  --state "State"       State/Province
  --zip "12345"         Postal code
  --country "US"        Country code
  --all                 Fetch all pages
  --limit <n>           Results per page
  --skip <n>            Skip first n results
  --verbose             Show full API response
  --force               Skip confirmation prompts

Examples:
  node businesses.js list --location "My Account"
  node businesses.js create --name "Acme Corp" --email "info@acme.com" --city "Austin" --state "TX" --location "My Account"
  node businesses.js update biz123 --phone "+15551234567" --location "My Account"
  node businesses.js delete biz123 --location "My Account"
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
      await listBusinesses(locationConfig);
      break;
    case 'get':
      if (!args._[1]) {
        console.error('Error: Business ID required');
        process.exit(1);
      }
      await getBusiness(args._[1], locationConfig);
      break;
    case 'create':
      await createBusiness(locationConfig);
      break;
    case 'update':
      if (!args._[1]) {
        console.error('Error: Business ID required');
        process.exit(1);
      }
      await updateBusiness(args._[1], locationConfig);
      break;
    case 'delete':
      if (!args._[1]) {
        console.error('Error: Business ID required');
        process.exit(1);
      }
      await deleteBusiness(args._[1], locationConfig);
      break;
    default:
      console.error(`Unknown command: ${command}`);
      console.error('Run "node businesses.js help" for usage');
      process.exit(1);
  }
}

main();
