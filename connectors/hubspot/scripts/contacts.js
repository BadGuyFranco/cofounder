#!/usr/bin/env node

/**
 * HubSpot Contacts Management
 * Create, read, update, delete, and search contacts.
 */

import { fileURLToPath } from 'url';
import path from 'path';
import {
  loadEnv, getToken, parseArgs, apiRequest, apiRequestPaginated,
  searchRequest, confirmDestructiveAction, formatDate, handleError, showHelp
} from './utils.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
loadEnv(path.join(__dirname, '..'));

const OBJECT_TYPE = 'contacts';
const DEFAULT_PROPERTIES = ['firstname', 'lastname', 'email', 'phone', 'company', 'jobtitle', 'lifecyclestage', 'hs_lead_status'];

// Help documentation
function printHelp() {
  showHelp('HubSpot Contacts', {
    'Commands': [
      'list                        List all contacts',
      'get <id>                    Get contact by ID',
      'search <query>              Search contacts by name/email',
      'create                      Create a new contact',
      'update <id>                 Update a contact',
      'delete <id>                 Delete a contact (destructive)',
      'help                        Show this help'
    ],
    'Options': [
      '--email <email>             Contact email address',
      '--firstname <name>          First name',
      '--lastname <name>           Last name',
      '--phone <phone>             Phone number',
      '--company <company>         Company name',
      '--jobtitle <title>          Job title',
      '--lifecycle <stage>         Lifecycle stage (subscriber, lead, etc.)',
      '--properties <list>         Comma-separated properties to return',
      '--limit <n>                 Results per page (default: 100)',
      '--all                       Fetch all pages',
      '--verbose                   Show full API response',
      '--force                     Skip confirmation for destructive actions'
    ],
    'Examples': [
      'node contacts.js list',
      'node contacts.js list --all --limit 50',
      'node contacts.js get 12345',
      'node contacts.js search "john"',
      'node contacts.js search "john@example.com"',
      'node contacts.js create --email john@example.com --firstname John --lastname Doe',
      'node contacts.js update 12345 --phone "+1234567890"',
      'node contacts.js delete 12345'
    ],
    'Lifecycle Stages': [
      'subscriber, lead, marketingqualifiedlead, salesqualifiedlead,',
      'opportunity, customer, evangelist, other'
    ]
  });
}

// List all contacts
async function listContacts(args) {
  const token = getToken();
  const limit = parseInt(args.limit) || 100;
  const all = args.all || false;
  const properties = args.properties ? args.properties.split(',') : DEFAULT_PROPERTIES;
  
  console.log('Fetching contacts...\n');
  
  const endpoint = `/crm/v3/objects/${OBJECT_TYPE}?properties=${properties.join(',')}`;
  const { results, meta } = await apiRequestPaginated(endpoint, token, { all, limit });
  
  if (args.verbose) {
    console.log(JSON.stringify(results, null, 2));
    return;
  }
  
  console.log(`Found ${meta.total} contacts${all ? '' : ' (page 1)'}:\n`);
  
  for (const contact of results) {
    const props = contact.properties;
    const name = [props.firstname, props.lastname].filter(Boolean).join(' ') || 'No name';
    console.log(`- ${name}`);
    console.log(`  ID: ${contact.id}`);
    if (props.email) console.log(`  Email: ${props.email}`);
    if (props.phone) console.log(`  Phone: ${props.phone}`);
    if (props.company) console.log(`  Company: ${props.company}`);
    if (props.jobtitle) console.log(`  Title: ${props.jobtitle}`);
    console.log(`  Created: ${formatDate(contact.createdAt)}`);
    console.log('');
  }
}

// Get single contact
async function getContact(id, args) {
  const token = getToken();
  const properties = args.properties ? args.properties.split(',') : DEFAULT_PROPERTIES;
  
  const endpoint = `/crm/v3/objects/${OBJECT_TYPE}/${id}?properties=${properties.join(',')}`;
  const contact = await apiRequest('GET', endpoint, token);
  
  if (args.verbose) {
    console.log(JSON.stringify(contact, null, 2));
    return;
  }
  
  const props = contact.properties;
  const name = [props.firstname, props.lastname].filter(Boolean).join(' ') || 'No name';
  
  console.log(`Contact: ${name}\n`);
  console.log(`ID: ${contact.id}`);
  console.log(`Email: ${props.email || 'N/A'}`);
  console.log(`Phone: ${props.phone || 'N/A'}`);
  console.log(`Company: ${props.company || 'N/A'}`);
  console.log(`Job Title: ${props.jobtitle || 'N/A'}`);
  console.log(`Lifecycle: ${props.lifecyclestage || 'N/A'}`);
  console.log(`Lead Status: ${props.hs_lead_status || 'N/A'}`);
  console.log(`Created: ${formatDate(contact.createdAt)}`);
  console.log(`Updated: ${formatDate(contact.updatedAt)}`);
}

// Search contacts
async function searchContacts(query, args) {
  const token = getToken();
  const limit = parseInt(args.limit) || 100;
  const all = args.all || false;
  const properties = args.properties ? args.properties.split(',') : DEFAULT_PROPERTIES;
  
  console.log(`Searching for "${query}"...\n`);
  
  // Search by email or name
  const filters = [];
  
  // If looks like email, search email field
  if (query.includes('@')) {
    filters.push({
      propertyName: 'email',
      operator: 'CONTAINS_TOKEN',
      value: query
    });
  } else {
    // Search firstname or lastname
    filters.push({
      propertyName: 'firstname',
      operator: 'CONTAINS_TOKEN',
      value: query
    });
  }
  
  const { results, meta } = await searchRequest(OBJECT_TYPE, token, filters, { limit, properties, all });
  
  // If no results from firstname, try lastname
  if (results.length === 0 && !query.includes('@')) {
    const lastnameFilters = [{
      propertyName: 'lastname',
      operator: 'CONTAINS_TOKEN',
      value: query
    }];
    const lastnameResults = await searchRequest(OBJECT_TYPE, token, lastnameFilters, { limit, properties, all });
    results.push(...lastnameResults.results);
  }
  
  if (args.verbose) {
    console.log(JSON.stringify(results, null, 2));
    return;
  }
  
  console.log(`Found ${results.length} contacts:\n`);
  
  for (const contact of results) {
    const props = contact.properties;
    const name = [props.firstname, props.lastname].filter(Boolean).join(' ') || 'No name';
    console.log(`- ${name}`);
    console.log(`  ID: ${contact.id}`);
    if (props.email) console.log(`  Email: ${props.email}`);
    if (props.phone) console.log(`  Phone: ${props.phone}`);
    if (props.company) console.log(`  Company: ${props.company}`);
    console.log('');
  }
}

// Create contact
async function createContact(args) {
  const token = getToken();
  
  if (!args.email) {
    console.error('Error: --email is required');
    process.exit(1);
  }
  
  const properties = {
    email: args.email
  };
  
  if (args.firstname) properties.firstname = args.firstname;
  if (args.lastname) properties.lastname = args.lastname;
  if (args.phone) properties.phone = args.phone;
  if (args.company) properties.company = args.company;
  if (args.jobtitle) properties.jobtitle = args.jobtitle;
  if (args.lifecycle) properties.lifecyclestage = args.lifecycle;
  
  const contact = await apiRequest('POST', `/crm/v3/objects/${OBJECT_TYPE}`, token, { properties });
  
  if (args.verbose) {
    console.log(JSON.stringify(contact, null, 2));
    return;
  }
  
  console.log('Contact created successfully!\n');
  console.log(`ID: ${contact.id}`);
  console.log(`Email: ${contact.properties.email}`);
  if (contact.properties.firstname) console.log(`First Name: ${contact.properties.firstname}`);
  if (contact.properties.lastname) console.log(`Last Name: ${contact.properties.lastname}`);
}

// Update contact
async function updateContact(id, args) {
  const token = getToken();
  
  const properties = {};
  
  if (args.email) properties.email = args.email;
  if (args.firstname) properties.firstname = args.firstname;
  if (args.lastname) properties.lastname = args.lastname;
  if (args.phone) properties.phone = args.phone;
  if (args.company) properties.company = args.company;
  if (args.jobtitle) properties.jobtitle = args.jobtitle;
  if (args.lifecycle) properties.lifecyclestage = args.lifecycle;
  
  if (Object.keys(properties).length === 0) {
    console.error('Error: No properties to update. Use --email, --firstname, --lastname, etc.');
    process.exit(1);
  }
  
  const contact = await apiRequest('PATCH', `/crm/v3/objects/${OBJECT_TYPE}/${id}`, token, { properties });
  
  if (args.verbose) {
    console.log(JSON.stringify(contact, null, 2));
    return;
  }
  
  console.log('Contact updated successfully!\n');
  console.log(`ID: ${contact.id}`);
  console.log(`Updated properties: ${Object.keys(properties).join(', ')}`);
}

// Delete contact
async function deleteContact(id, args) {
  const token = getToken();
  
  // Get contact info first
  const contact = await apiRequest('GET', `/crm/v3/objects/${OBJECT_TYPE}/${id}?properties=email,firstname,lastname`, token);
  const name = [contact.properties.firstname, contact.properties.lastname].filter(Boolean).join(' ') || contact.properties.email || id;
  
  const confirmed = await confirmDestructiveAction(
    `Delete contact: ${name}`,
    [
      `ID: ${id}`,
      `Email: ${contact.properties.email || 'N/A'}`,
      'All associated data will be removed.'
    ],
    args.force
  );
  
  if (!confirmed) return;
  
  await apiRequest('DELETE', `/crm/v3/objects/${OBJECT_TYPE}/${id}`, token);
  
  console.log('Contact deleted successfully.');
}

// Main
async function main() {
  const args = parseArgs(process.argv.slice(2));
  const command = args._[0];
  
  try {
    switch (command) {
      case 'list':
        await listContacts(args);
        break;
      case 'get':
        if (!args._[1]) {
          console.error('Error: Contact ID required');
          console.error('Usage: node contacts.js get <id>');
          process.exit(1);
        }
        await getContact(args._[1], args);
        break;
      case 'search':
        if (!args._[1]) {
          console.error('Error: Search query required');
          console.error('Usage: node contacts.js search <query>');
          process.exit(1);
        }
        await searchContacts(args._[1], args);
        break;
      case 'create':
        await createContact(args);
        break;
      case 'update':
        if (!args._[1]) {
          console.error('Error: Contact ID required');
          console.error('Usage: node contacts.js update <id> --property value');
          process.exit(1);
        }
        await updateContact(args._[1], args);
        break;
      case 'delete':
        if (!args._[1]) {
          console.error('Error: Contact ID required');
          console.error('Usage: node contacts.js delete <id>');
          process.exit(1);
        }
        await deleteContact(args._[1], args);
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
