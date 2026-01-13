#!/usr/bin/env node

/**
 * Go High Level Companies Management (B2B)
 * 
 * Commands:
 *   list                  List all companies
 *   get <id>             Get company details
 *   create               Create new company
 *   update <id>          Update company
 *   delete <id>          Delete company (DESTRUCTIVE)
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
  formatDate,
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

async function listCompanies(locationConfig) {
  try {
    const params = new URLSearchParams();
    params.append('locationId', locationConfig.id);
    
    if (args.limit) params.append('limit', args.limit);
    if (args.skip) params.append('skip', args.skip);
    if (args.query) params.append('query', args.query);
    
    const endpoint = `/companies/?${params.toString()}`;
    
    if (args.all) {
      const { results, meta } = await apiRequestPaginated(endpoint, locationConfig.key, { 
        all: true, 
        limit: args.limit || 100 
      });
      console.log(`Found ${meta.total} companies (${meta.pages} pages):\n`);
      displayCompanies(results);
    } else {
      const data = await apiRequest('GET', endpoint, locationConfig.key);
      const companies = data.companies || data.data || [];
      console.log(`Found ${companies.length} companies:\n`);
      displayCompanies(companies);
      
      if (data.meta?.total > companies.length) {
        console.log(`\nShowing ${companies.length} of ${data.meta.total}. Use --all to fetch all.`);
      }
    }
  } catch (error) {
    handleError(error, verbose);
  }
}

function displayCompanies(companies) {
  if (companies.length === 0) {
    console.log('No companies found.');
    return;
  }
  
  for (const company of companies) {
    console.log(`- ${company.name}`);
    console.log(`  ID: ${company._id || company.id}`);
    if (company.email) console.log(`  Email: ${company.email}`);
    if (company.phone) console.log(`  Phone: ${company.phone}`);
    if (company.website) console.log(`  Website: ${company.website}`);
    if (company.industry) console.log(`  Industry: ${company.industry}`);
    if (company.employeeCount) console.log(`  Employees: ${company.employeeCount}`);
    console.log('');
  }
}

async function getCompany(companyId, locationConfig) {
  try {
    const data = await apiRequest(
      'GET',
      `/companies/${companyId}?locationId=${locationConfig.id}`,
      locationConfig.key
    );
    
    console.log('Company Details:\n');
    const company = data.company || data;
    console.log(`Name: ${company.name}`);
    console.log(`ID: ${company._id || company.id}`);
    
    if (company.email) console.log(`Email: ${company.email}`);
    if (company.phone) console.log(`Phone: ${company.phone}`);
    if (company.website) console.log(`Website: ${company.website}`);
    if (company.industry) console.log(`Industry: ${company.industry}`);
    if (company.employeeCount) console.log(`Employees: ${company.employeeCount}`);
    if (company.annualRevenue) console.log(`Annual Revenue: ${company.annualRevenue}`);
    
    if (company.address) {
      console.log('\nAddress:');
      const addr = company.address;
      if (addr.addressLine1) console.log(`  ${addr.addressLine1}`);
      if (addr.addressLine2) console.log(`  ${addr.addressLine2}`);
      if (addr.city || addr.state || addr.postalCode) {
        console.log(`  ${[addr.city, addr.state, addr.postalCode].filter(Boolean).join(', ')}`);
      }
      if (addr.country) console.log(`  ${addr.country}`);
    }
    
    if (company.description) console.log(`\nDescription: ${company.description}`);
    
    // Show linked contacts
    if (company.contacts && company.contacts.length > 0) {
      console.log(`\nLinked Contacts: ${company.contacts.length}`);
      for (const contact of company.contacts.slice(0, 5)) {
        console.log(`  - ${contact.name || contact.email || contact.id}`);
      }
      if (company.contacts.length > 5) {
        console.log(`  ... and ${company.contacts.length - 5} more`);
      }
    }
    
    console.log(`\nCreated: ${formatDate(company.createdAt)}`);
    
    if (verbose) {
      console.log('\nFull Response:');
      console.log(JSON.stringify(data, null, 2));
    }
  } catch (error) {
    handleError(error, verbose);
  }
}

async function createCompany(locationConfig) {
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
    if (args.industry) body.industry = args.industry;
    if (args.employees) body.employeeCount = args.employees;
    if (args.revenue) body.annualRevenue = args.revenue;
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
    
    const data = await apiRequest('POST', '/companies/', locationConfig.key, body);
    
    console.log('Company created successfully!\n');
    const company = data.company || data;
    console.log(`ID: ${company._id || company.id}`);
    console.log(`Name: ${company.name}`);
    
  } catch (error) {
    handleError(error, verbose);
  }
}

async function updateCompany(companyId, locationConfig) {
  try {
    const body = {
      locationId: locationConfig.id
    };
    
    if (args.name) body.name = args.name;
    if (args.email) body.email = args.email;
    if (args.phone) body.phone = args.phone;
    if (args.website) body.website = args.website;
    if (args.industry) body.industry = args.industry;
    if (args.employees) body.employeeCount = args.employees;
    if (args.revenue) body.annualRevenue = args.revenue;
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
      console.error('Use --name, --email, --phone, --website, --industry, --employees, --revenue, --description, or address fields');
      process.exit(1);
    }
    
    const data = await apiRequest('PUT', `/companies/${companyId}`, locationConfig.key, body);
    
    console.log('Company updated successfully!\n');
    const company = data.company || data;
    console.log(`ID: ${company._id || company.id}`);
    console.log(`Name: ${company.name}`);
    
  } catch (error) {
    handleError(error, verbose);
  }
}

async function deleteCompany(companyId, locationConfig) {
  try {
    // Get company details first
    const companyData = await apiRequest(
      'GET',
      `/companies/${companyId}?locationId=${locationConfig.id}`,
      locationConfig.key
    );
    const company = companyData.company || companyData;
    
    const linkedContacts = company.contacts?.length || 0;
    
    const confirmed = await confirmDestructiveAction(
      'You are about to DELETE a company',
      [
        `Name: ${company.name}`,
        linkedContacts > 0 ? `Linked Contacts: ${linkedContacts}` : '',
        '',
        'This will permanently remove the company record.',
        linkedContacts > 0 ? 'Linked contacts will NOT be deleted.' : ''
      ].filter(Boolean),
      force
    );
    
    if (!confirmed) return;
    
    await apiRequest(
      'DELETE',
      `/companies/${companyId}?locationId=${locationConfig.id}`,
      locationConfig.key
    );
    
    console.log('Company deleted successfully.');
    
  } catch (error) {
    handleError(error, verbose);
  }
}

function showHelp() {
  console.log(`
Go High Level Company Management (B2B)

Usage:
  node companies.js <command> [options]

Commands:
  list                   List all companies
  get <id>              Get company details
  create                Create new company
  update <id>           Update company
  delete <id>           Delete company (DESTRUCTIVE)
  locations             List configured locations

Options:
  --location "Name"     Specify GHL sub-account
  --name "Name"         Company name
  --email "email"       Company email
  --phone "+1234567890" Company phone
  --website "url"       Company website
  --industry "Tech"     Industry
  --employees "100"     Employee count
  --revenue "1M-5M"     Annual revenue
  --description "Desc"  Company description
  --address "Address"   Street address
  --address-2 "Suite"   Address line 2
  --city "City"         City
  --state "State"       State/Province
  --zip "12345"         Postal code
  --country "US"        Country code
  --query "search"      Search query (for list)
  --all                 Fetch all pages
  --limit <n>           Results per page
  --skip <n>            Skip first n results
  --verbose             Show full API response
  --force               Skip confirmation prompts

Examples:
  node companies.js list --location "WISER"
  node companies.js list --query "tech" --location "WISER"
  node companies.js create --name "Acme Corp" --industry "Technology" --employees "50" --location "WISER"
  node companies.js get comp123 --location "WISER"
  node companies.js update comp123 --website "https://acme.com" --location "WISER"
  node companies.js delete comp123 --location "WISER"

NOTE: Companies is a B2B feature for tracking company records separate from contacts.
Contacts can be linked to companies for organization-level relationships.
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
      await listCompanies(locationConfig);
      break;
    case 'get':
      if (!args._[1]) {
        console.error('Error: Company ID required');
        process.exit(1);
      }
      await getCompany(args._[1], locationConfig);
      break;
    case 'create':
      await createCompany(locationConfig);
      break;
    case 'update':
      if (!args._[1]) {
        console.error('Error: Company ID required');
        process.exit(1);
      }
      await updateCompany(args._[1], locationConfig);
      break;
    case 'delete':
      if (!args._[1]) {
        console.error('Error: Company ID required');
        process.exit(1);
      }
      await deleteCompany(args._[1], locationConfig);
      break;
    default:
      console.error(`Unknown command: ${command}`);
      console.error('Run "node companies.js help" for usage');
      process.exit(1);
  }
}

main();
