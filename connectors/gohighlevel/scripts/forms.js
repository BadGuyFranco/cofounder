#!/usr/bin/env node

/**
 * Go High Level Forms Script
 * Manage forms and form submissions.
 * 
 * Usage:
 *   node forms.js list --location "Name"
 *   node forms.js submissions --form-id <id> --location "Name"
 *   node forms.js submission <submission-id> --location "Name"
 *   node forms.js all-submissions --location "Name"
 *   node forms.js locations
 */

import path from 'path';
import { fileURLToPath } from 'url';
import {
  loadEnv,
  loadLocations,
  resolveLocation,
  parseArgs,
  listLocations,
  formatDate,
  handleError
} from './utils.js';

const LOCAL_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const BASE_URL = 'https://services.leadconnectorhq.com';

// Load environment
loadEnv(LOCAL_DIR);

// API request wrapper
async function apiRequest(method, endpoint, apiKey, body = null) {
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

// List forms
async function listForms(location, verbose) {
  const data = await apiRequest('GET', `/forms/?locationId=${location.id}`, location.key);
  
  const forms = data.forms || [];
  console.log(`Found ${forms.length} forms:\n`);
  
  for (const form of forms) {
    console.log(`- ${form.name}`);
    console.log(`  ID: ${form.id}`);
    if (form.locationId) console.log(`  Location: ${form.locationId}`);
    console.log('');
  }
  
  if (verbose) {
    console.log('\nFull response:');
    console.log(JSON.stringify(data, null, 2));
  }
  
  return forms;
}

// List submissions for a form
async function listSubmissions(formId, location, options, verbose) {
  const params = new URLSearchParams({
    locationId: location.id
  });
  
  if (options.limit) params.append('limit', options.limit);
  if (options.page) params.append('page', options.page);
  if (options.startAt) params.append('startAt', options.startAt);
  if (options.endAt) params.append('endAt', options.endAt);
  
  const data = await apiRequest('GET', `/forms/${formId}/submissions?${params}`, location.key);
  
  const submissions = data.submissions || [];
  const meta = data.meta || {};
  
  console.log(`Found ${meta.total || submissions.length} submissions:\n`);
  
  for (const sub of submissions) {
    console.log(`- Submission ${sub.id}`);
    console.log(`  Contact ID: ${sub.contactId || 'N/A'}`);
    console.log(`  Submitted: ${formatDate(sub.createdAt)}`);
    
    // Show a few field values
    if (sub.others && Object.keys(sub.others).length > 0) {
      console.log('  Fields:');
      let count = 0;
      for (const [key, value] of Object.entries(sub.others)) {
        if (count >= 3) {
          console.log(`    ... and ${Object.keys(sub.others).length - 3} more fields`);
          break;
        }
        console.log(`    ${key}: ${value}`);
        count++;
      }
    }
    console.log('');
  }
  
  if (verbose) {
    console.log('\nFull response:');
    console.log(JSON.stringify(data, null, 2));
  }
  
  return submissions;
}

// Get single submission
async function getSubmission(submissionId, location, verbose) {
  // Note: GHL doesn't have a direct "get submission by ID" endpoint
  // We'll need to use the submissions list and filter
  const data = await apiRequest('GET', `/forms/submissions/${submissionId}`, location.key);
  
  const sub = data.submission || data;
  console.log(`Submission ID: ${sub.id}`);
  console.log(`Form ID: ${sub.formId || 'N/A'}`);
  console.log(`Contact ID: ${sub.contactId || 'N/A'}`);
  console.log(`Submitted: ${formatDate(sub.createdAt)}`);
  
  if (sub.name) console.log(`Name: ${sub.name}`);
  if (sub.email) console.log(`Email: ${sub.email}`);
  if (sub.phone) console.log(`Phone: ${sub.phone}`);
  
  if (sub.others && Object.keys(sub.others).length > 0) {
    console.log('\nCustom Fields:');
    for (const [key, value] of Object.entries(sub.others)) {
      console.log(`  ${key}: ${value}`);
    }
  }
  
  if (verbose) {
    console.log('\nFull response:');
    console.log(JSON.stringify(data, null, 2));
  }
  
  return sub;
}

// List all submissions across all forms
async function listAllSubmissions(location, options, verbose) {
  const params = new URLSearchParams({
    locationId: location.id
  });
  
  if (options.limit) params.append('limit', options.limit);
  if (options.page) params.append('page', options.page);
  if (options.startAt) params.append('startAt', options.startAt);
  if (options.endAt) params.append('endAt', options.endAt);
  
  const data = await apiRequest('GET', `/forms/submissions?${params}`, location.key);
  
  const submissions = data.submissions || [];
  const meta = data.meta || {};
  
  console.log(`Found ${meta.total || submissions.length} total submissions:\n`);
  
  for (const sub of submissions) {
    console.log(`- Submission ${sub.id}`);
    console.log(`  Form ID: ${sub.formId || 'N/A'}`);
    console.log(`  Contact ID: ${sub.contactId || 'N/A'}`);
    console.log(`  Submitted: ${formatDate(sub.createdAt)}`);
    console.log('');
  }
  
  if (verbose) {
    console.log('\nFull response:');
    console.log(JSON.stringify(data, null, 2));
  }
  
  return submissions;
}

// Main
async function main() {
  const args = parseArgs(process.argv.slice(2));
  const command = args._[0];
  const verbose = args.verbose || false;
  const locationsConfig = loadLocations();
  
  if (command === 'locations') {
    listLocations(locationsConfig);
    return;
  }
  
  try {
    switch (command) {
      case 'list': {
        const location = resolveLocation(args.location, locationsConfig);
        await listForms(location, verbose);
        break;
      }
      
      case 'submissions': {
        const location = resolveLocation(args.location, locationsConfig);
        const formId = args['form-id'];
        
        if (!formId) {
          console.error('Error: --form-id is required');
          console.error('Usage: node forms.js submissions --form-id <id> --location "Name"');
          process.exit(1);
        }
        
        await listSubmissions(formId, location, {
          limit: args.limit,
          page: args.page,
          startAt: args.startAt || args['start-at'],
          endAt: args.endAt || args['end-at']
        }, verbose);
        break;
      }
      
      case 'submission': {
        const location = resolveLocation(args.location, locationsConfig);
        const submissionId = args._[1];
        
        if (!submissionId) {
          console.error('Error: Submission ID is required');
          console.error('Usage: node forms.js submission <submission-id> --location "Name"');
          process.exit(1);
        }
        
        await getSubmission(submissionId, location, verbose);
        break;
      }
      
      case 'all-submissions': {
        const location = resolveLocation(args.location, locationsConfig);
        
        await listAllSubmissions(location, {
          limit: args.limit,
          page: args.page,
          startAt: args.startAt || args['start-at'],
          endAt: args.endAt || args['end-at']
        }, verbose);
        break;
      }
      
      default:
        console.log('Go High Level Forms Script');
        console.log('');
        console.log('Commands:');
        console.log('  list --location "Name"                List all forms');
        console.log('  submissions --form-id <id>            List submissions for a form');
        console.log('  submission <submission-id>            Get submission details');
        console.log('  all-submissions --location            List all submissions');
        console.log('  locations                             List available locations');
        console.log('');
        console.log('Location Options:');
        console.log('  --location "Name"             Specify which GHL account to use');
        console.log('');
        console.log('Submissions Options:');
        console.log('  --form-id <id>                Form ID (required for form submissions)');
        console.log('  --limit 20                    Results per page');
        console.log('  --page 1                      Page number');
        console.log('  --startAt "2024-01-01"        Start date filter');
        console.log('  --endAt "2024-12-31"          End date filter');
        console.log('');
        console.log('Global Options:');
        console.log('  --verbose                     Show full API responses');
        console.log('');
        console.log('Note: Forms are read-only via API. Create/edit forms in GHL.');
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
