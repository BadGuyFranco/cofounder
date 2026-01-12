#!/usr/bin/env node

/**
 * Go High Level Contacts Script
 * Create, read, update, delete, and search contacts.
 * 
 * Usage:
 *   node contacts.js search "query" --location "First Strategy"
 *   node contacts.js get <contact-id> --location "WISER"
 *   node contacts.js create --email "email" --firstName "name" --location "AI First Principles"
 *   node contacts.js update <contact-id> --firstName "name" --location "First Strategy"
 *   node contacts.js delete <contact-id> --location "WISER"
 *   node contacts.js locations                          # List available locations
 */

import path from 'path';
import { fileURLToPath } from 'url';
import {
  loadEnv,
  loadLocations,
  resolveLocation,
  parseArgs,
  apiRequest,
  confirmDestructiveAction,
  listLocations,
  handleError
} from './utils.js';

const LOCAL_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const BASE_URL = 'https://services.leadconnectorhq.com';

// Load environment
loadEnv(LOCAL_DIR);

// API request wrapper for this script
async function localApiRequest(method, endpoint, apiKey, body = null) {
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

// Search contacts
async function searchContacts(query, location, options = {}) {
  const { verbose, all, limit } = options;
  let allContacts = [];
  let nextPageUrl = null;
  let total = 0;
  let pageCount = 0;
  
  // Initial request
  const params = new URLSearchParams({
    locationId: location.id,
    query: query
  });
  if (limit) params.append('limit', limit);
  
  let url = `/contacts/?${params}`;
  
  do {
    const data = await localApiRequest('GET', url, location.key);
    
    allContacts = allContacts.concat(data.contacts || []);
    total = data.meta?.total || allContacts.length;
    nextPageUrl = data.meta?.nextPageUrl || null;
    pageCount++;
    
    // If not fetching all, break after first page
    if (!all) break;
    
    // Extract path from nextPageUrl for next iteration
    if (nextPageUrl) {
      url = nextPageUrl.replace('https://services.leadconnectorhq.com', '');
    }
    
    // Safety limit
    if (pageCount > 50) {
      console.log('Warning: Reached 50 page limit');
      break;
    }
  } while (nextPageUrl && all);
  
  // Display results
  const showing = allContacts.length;
  if (all || showing >= total) {
    console.log(`Found ${total} contacts:\n`);
  } else {
    console.log(`Showing ${showing} of ${total} contacts (use --all to fetch all):\n`);
  }
  
  for (const contact of allContacts) {
    console.log(`- ${contact.firstName || ''} ${contact.lastName || ''}`.trim() || 'Unnamed');
    console.log(`  ID: ${contact.id}`);
    if (contact.email) console.log(`  Email: ${contact.email}`);
    if (contact.phone) console.log(`  Phone: ${contact.phone}`);
    if (contact.tags?.length) console.log(`  Tags: ${contact.tags.join(', ')}`);
    console.log('');
  }
  
  if (verbose) {
    console.log(`\nPagination: ${pageCount} page(s), ${total} total`);
  }
  
  return allContacts;
}

// Get single contact
async function getContact(contactId, location, verbose) {
  const data = await localApiRequest('GET', `/contacts/${contactId}`, location.key);
  
  const contact = data.contact;
  console.log(`Contact: ${contact.firstName || ''} ${contact.lastName || ''}`.trim());
  console.log(`ID: ${contact.id}`);
  console.log(`Email: ${contact.email || 'N/A'}`);
  console.log(`Phone: ${contact.phone || 'N/A'}`);
  console.log(`Tags: ${contact.tags?.join(', ') || 'None'}`);
  console.log(`Source: ${contact.source || 'N/A'}`);
  console.log(`Created: ${contact.dateAdded || 'N/A'}`);
  
  if (verbose) {
    console.log('\nFull response:');
    console.log(JSON.stringify(data, null, 2));
  }
  
  return contact;
}

// Create contact
async function createContact(options, location, verbose) {
  const body = {
    locationId: location.id
  };
  
  if (options.email) body.email = options.email;
  if (options.firstName) body.firstName = options.firstName;
  if (options.lastName) body.lastName = options.lastName;
  if (options.phone) body.phone = options.phone;
  if (options.tags) body.tags = options.tags.split(',').map(t => t.trim());
  if (options.source) body.source = options.source;
  
  const data = await localApiRequest('POST', '/contacts/', location.key, body);
  
  console.log('Created contact:');
  console.log(`ID: ${data.contact.id}`);
  console.log(`Name: ${data.contact.firstName || ''} ${data.contact.lastName || ''}`.trim());
  
  if (verbose) {
    console.log('\nFull response:');
    console.log(JSON.stringify(data, null, 2));
  }
  
  return data.contact;
}

// Update contact
async function updateContact(contactId, options, location, verbose) {
  const body = {};
  
  if (options.email) body.email = options.email;
  if (options.firstName) body.firstName = options.firstName;
  if (options.lastName) body.lastName = options.lastName;
  if (options.phone) body.phone = options.phone;
  if (options.tags) body.tags = options.tags.split(',').map(t => t.trim());
  
  const data = await localApiRequest('PUT', `/contacts/${contactId}`, location.key, body);
  
  console.log(`Updated contact: ${contactId}`);
  
  if (verbose) {
    console.log('\nFull response:');
    console.log(JSON.stringify(data, null, 2));
  }
  
  return data.contact;
}

// Delete contact
async function deleteContact(contactId, location, verbose, force = false) {
  // Get contact details first for confirmation message
  let contactName = contactId;
  try {
    const contactData = await localApiRequest('GET', `/contacts/${contactId}`, location.key);
    const c = contactData.contact;
    contactName = `${c.firstName || ''} ${c.lastName || ''}`.trim() || c.email || contactId;
  } catch (e) {
    // If we can't get the contact, proceed with ID only
  }
  
  // Confirm destructive action
  const confirmed = await confirmDestructiveAction(
    'You are about to DELETE a contact.',
    [
      `Contact: ${contactName}`,
      `ID: ${contactId}`,
      '',
      'This will permanently remove the contact and all',
      'associated data (notes, tasks, conversations).'
    ],
    force
  );
  
  if (!confirmed) {
    process.exit(0);
  }
  
  const data = await localApiRequest('DELETE', `/contacts/${contactId}`, location.key);
  
  console.log(`Deleted contact: ${contactId}`);
  
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
      case 'search': {
        const location = resolveLocation(args.location, locationsConfig);
        const query = args._[1] || '';
        await searchContacts(query, location, { verbose, all: args.all, limit: args.limit });
        break;
      }
      
      case 'get': {
        const location = resolveLocation(args.location, locationsConfig);
        const contactId = args._[1];
        
        if (!contactId) {
          console.error('Error: Contact ID is required');
          console.error('Usage: node contacts.js get <contact-id> --location "Name"');
          process.exit(1);
        }
        
        await getContact(contactId, location, verbose);
        break;
      }
      
      case 'create': {
        const location = resolveLocation(args.location, locationsConfig);
        
        if (!args.email && !args.phone) {
          console.error('Error: At least --email or --phone is required');
          console.error('Usage: node contacts.js create --email "email" [--firstName "name"] --location "Name"');
          process.exit(1);
        }
        
        await createContact(args, location, verbose);
        break;
      }
      
      case 'update': {
        const location = resolveLocation(args.location, locationsConfig);
        const contactId = args._[1];
        
        if (!contactId) {
          console.error('Error: Contact ID is required');
          console.error('Usage: node contacts.js update <contact-id> [--firstName "name"] --location "Name"');
          process.exit(1);
        }
        
        await updateContact(contactId, args, location, verbose);
        break;
      }
      
      case 'delete': {
        const location = resolveLocation(args.location, locationsConfig);
        const contactId = args._[1];
        
        if (!contactId) {
          console.error('Error: Contact ID is required');
          console.error('Usage: node contacts.js delete <contact-id> --location "Name"');
          process.exit(1);
        }
        
        await deleteContact(contactId, location, verbose, args.force);
        break;
      }
      
      default:
        console.log('Go High Level Contacts Script');
        console.log('');
        console.log('Commands:');
        console.log('  search "query" --location "Name"    Search contacts');
        console.log('  get <contact-id> --location "Name"  Get contact details');
        console.log('  create --email "email" --location   Create a new contact');
        console.log('  update <contact-id> --location ...  Update a contact');
        console.log('  delete <contact-id> --location      Delete a contact');
        console.log('  locations                           List available locations');
        console.log('');
        console.log('Location Options:');
        console.log('  --location "Name"             Specify which GHL account to use');
        console.log('');
        console.log('Search Options:');
        console.log('  --all                         Fetch all pages (not just first 20)');
        console.log('  --limit 50                    Results per page (default 20)');
        console.log('');
        console.log('Create/Update Options:');
        console.log('  --email "email"               Contact email');
        console.log('  --firstName "name"            First name');
        console.log('  --lastName "name"             Last name');
        console.log('  --phone "+1234567890"         Phone with country code');
        console.log('  --tags "tag1,tag2"            Comma-separated tags');
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
