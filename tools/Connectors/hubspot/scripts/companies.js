#!/usr/bin/env node

/**
 * HubSpot Companies Management
 * Create, read, update, delete, and search companies.
 */

import { fileURLToPath } from 'url';
import path from 'path';
import {
  loadEnv, getToken, parseArgs, apiRequest, apiRequestPaginated,
  searchRequest, confirmDestructiveAction, formatDate, handleError, showHelp
} from './utils.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
loadEnv(path.join(__dirname, '..'));

const OBJECT_TYPE = 'companies';
const DEFAULT_PROPERTIES = ['name', 'domain', 'industry', 'phone', 'city', 'state', 'country', 'numberofemployees', 'annualrevenue'];

// Help documentation
function printHelp() {
  showHelp('HubSpot Companies', {
    'Commands': [
      'list                        List all companies',
      'get <id>                    Get company by ID',
      'search <query>              Search companies by name/domain',
      'create                      Create a new company',
      'update <id>                 Update a company',
      'delete <id>                 Delete a company (destructive)',
      'help                        Show this help'
    ],
    'Options': [
      '--name <name>               Company name (required for create)',
      '--domain <domain>           Company domain/website',
      '--industry <industry>       Industry',
      '--phone <phone>             Company phone',
      '--city <city>               City',
      '--state <state>             State/Region',
      '--country <country>         Country',
      '--employees <count>         Number of employees',
      '--revenue <amount>          Annual revenue',
      '--properties <list>         Comma-separated properties to return',
      '--limit <n>                 Results per page (default: 100)',
      '--all                       Fetch all pages',
      '--verbose                   Show full API response',
      '--force                     Skip confirmation for destructive actions'
    ],
    'Examples': [
      'node companies.js list',
      'node companies.js list --all',
      'node companies.js get 12345',
      'node companies.js search "acme"',
      'node companies.js search "acme.com"',
      'node companies.js create --name "Acme Corp" --domain acme.com',
      'node companies.js update 12345 --industry "Technology"',
      'node companies.js delete 12345'
    ]
  });
}

// List all companies
async function listCompanies(args) {
  const token = getToken();
  const limit = parseInt(args.limit) || 100;
  const all = args.all || false;
  const properties = args.properties ? args.properties.split(',') : DEFAULT_PROPERTIES;
  
  console.log('Fetching companies...\n');
  
  const endpoint = `/crm/v3/objects/${OBJECT_TYPE}?properties=${properties.join(',')}`;
  const { results, meta } = await apiRequestPaginated(endpoint, token, { all, limit });
  
  if (args.verbose) {
    console.log(JSON.stringify(results, null, 2));
    return;
  }
  
  console.log(`Found ${meta.total} companies${all ? '' : ' (page 1)'}:\n`);
  
  for (const company of results) {
    const props = company.properties;
    console.log(`- ${props.name || 'No name'}`);
    console.log(`  ID: ${company.id}`);
    if (props.domain) console.log(`  Domain: ${props.domain}`);
    if (props.industry) console.log(`  Industry: ${props.industry}`);
    if (props.city || props.state || props.country) {
      console.log(`  Location: ${[props.city, props.state, props.country].filter(Boolean).join(', ')}`);
    }
    console.log(`  Created: ${formatDate(company.createdAt)}`);
    console.log('');
  }
}

// Get single company
async function getCompany(id, args) {
  const token = getToken();
  const properties = args.properties ? args.properties.split(',') : DEFAULT_PROPERTIES;
  
  const endpoint = `/crm/v3/objects/${OBJECT_TYPE}/${id}?properties=${properties.join(',')}`;
  const company = await apiRequest('GET', endpoint, token);
  
  if (args.verbose) {
    console.log(JSON.stringify(company, null, 2));
    return;
  }
  
  const props = company.properties;
  
  console.log(`Company: ${props.name || 'No name'}\n`);
  console.log(`ID: ${company.id}`);
  console.log(`Domain: ${props.domain || 'N/A'}`);
  console.log(`Industry: ${props.industry || 'N/A'}`);
  console.log(`Phone: ${props.phone || 'N/A'}`);
  console.log(`Location: ${[props.city, props.state, props.country].filter(Boolean).join(', ') || 'N/A'}`);
  console.log(`Employees: ${props.numberofemployees || 'N/A'}`);
  console.log(`Annual Revenue: ${props.annualrevenue ? '$' + props.annualrevenue : 'N/A'}`);
  console.log(`Created: ${formatDate(company.createdAt)}`);
  console.log(`Updated: ${formatDate(company.updatedAt)}`);
}

// Search companies
async function searchCompanies(query, args) {
  const token = getToken();
  const limit = parseInt(args.limit) || 100;
  const all = args.all || false;
  const properties = args.properties ? args.properties.split(',') : DEFAULT_PROPERTIES;
  
  console.log(`Searching for "${query}"...\n`);
  
  // Search by domain or name
  const filters = [];
  
  if (query.includes('.')) {
    // Looks like a domain
    filters.push({
      propertyName: 'domain',
      operator: 'CONTAINS_TOKEN',
      value: query
    });
  } else {
    filters.push({
      propertyName: 'name',
      operator: 'CONTAINS_TOKEN',
      value: query
    });
  }
  
  const { results } = await searchRequest(OBJECT_TYPE, token, filters, { limit, properties, all });
  
  if (args.verbose) {
    console.log(JSON.stringify(results, null, 2));
    return;
  }
  
  console.log(`Found ${results.length} companies:\n`);
  
  for (const company of results) {
    const props = company.properties;
    console.log(`- ${props.name || 'No name'}`);
    console.log(`  ID: ${company.id}`);
    if (props.domain) console.log(`  Domain: ${props.domain}`);
    if (props.industry) console.log(`  Industry: ${props.industry}`);
    console.log('');
  }
}

// Create company
async function createCompany(args) {
  const token = getToken();
  
  if (!args.name) {
    console.error('Error: --name is required');
    process.exit(1);
  }
  
  const properties = {
    name: args.name
  };
  
  if (args.domain) properties.domain = args.domain;
  if (args.industry) properties.industry = args.industry;
  if (args.phone) properties.phone = args.phone;
  if (args.city) properties.city = args.city;
  if (args.state) properties.state = args.state;
  if (args.country) properties.country = args.country;
  if (args.employees) properties.numberofemployees = args.employees;
  if (args.revenue) properties.annualrevenue = args.revenue;
  
  const company = await apiRequest('POST', `/crm/v3/objects/${OBJECT_TYPE}`, token, { properties });
  
  if (args.verbose) {
    console.log(JSON.stringify(company, null, 2));
    return;
  }
  
  console.log('Company created successfully!\n');
  console.log(`ID: ${company.id}`);
  console.log(`Name: ${company.properties.name}`);
  if (company.properties.domain) console.log(`Domain: ${company.properties.domain}`);
}

// Update company
async function updateCompany(id, args) {
  const token = getToken();
  
  const properties = {};
  
  if (args.name) properties.name = args.name;
  if (args.domain) properties.domain = args.domain;
  if (args.industry) properties.industry = args.industry;
  if (args.phone) properties.phone = args.phone;
  if (args.city) properties.city = args.city;
  if (args.state) properties.state = args.state;
  if (args.country) properties.country = args.country;
  if (args.employees) properties.numberofemployees = args.employees;
  if (args.revenue) properties.annualrevenue = args.revenue;
  
  if (Object.keys(properties).length === 0) {
    console.error('Error: No properties to update. Use --name, --domain, --industry, etc.');
    process.exit(1);
  }
  
  const company = await apiRequest('PATCH', `/crm/v3/objects/${OBJECT_TYPE}/${id}`, token, { properties });
  
  if (args.verbose) {
    console.log(JSON.stringify(company, null, 2));
    return;
  }
  
  console.log('Company updated successfully!\n');
  console.log(`ID: ${company.id}`);
  console.log(`Updated properties: ${Object.keys(properties).join(', ')}`);
}

// Delete company
async function deleteCompany(id, args) {
  const token = getToken();
  
  // Get company info first
  const company = await apiRequest('GET', `/crm/v3/objects/${OBJECT_TYPE}/${id}?properties=name,domain`, token);
  const name = company.properties.name || company.properties.domain || id;
  
  const confirmed = await confirmDestructiveAction(
    `Delete company: ${name}`,
    [
      `ID: ${id}`,
      `Domain: ${company.properties.domain || 'N/A'}`,
      'All associated data will be removed.'
    ],
    args.force
  );
  
  if (!confirmed) return;
  
  await apiRequest('DELETE', `/crm/v3/objects/${OBJECT_TYPE}/${id}`, token);
  
  console.log('Company deleted successfully.');
}

// Main
async function main() {
  const args = parseArgs(process.argv.slice(2));
  const command = args._[0];
  
  try {
    switch (command) {
      case 'list':
        await listCompanies(args);
        break;
      case 'get':
        if (!args._[1]) {
          console.error('Error: Company ID required');
          console.error('Usage: node companies.js get <id>');
          process.exit(1);
        }
        await getCompany(args._[1], args);
        break;
      case 'search':
        if (!args._[1]) {
          console.error('Error: Search query required');
          console.error('Usage: node companies.js search <query>');
          process.exit(1);
        }
        await searchCompanies(args._[1], args);
        break;
      case 'create':
        await createCompany(args);
        break;
      case 'update':
        if (!args._[1]) {
          console.error('Error: Company ID required');
          console.error('Usage: node companies.js update <id> --property value');
          process.exit(1);
        }
        await updateCompany(args._[1], args);
        break;
      case 'delete':
        if (!args._[1]) {
          console.error('Error: Company ID required');
          console.error('Usage: node companies.js delete <id>');
          process.exit(1);
        }
        await deleteCompany(args._[1], args);
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
