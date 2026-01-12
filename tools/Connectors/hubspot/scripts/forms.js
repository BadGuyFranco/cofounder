#!/usr/bin/env node

/**
 * HubSpot Forms Management
 * View forms and their submissions (read-only).
 */

import { fileURLToPath } from 'url';
import path from 'path';
import {
  loadEnv, getToken, parseArgs, apiRequest, apiRequestPaginated,
  formatDate, handleError, showHelp
} from './utils.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
loadEnv(path.join(__dirname, '..'));

// Help documentation
function printHelp() {
  showHelp('HubSpot Forms', {
    'Commands': [
      'list                        List all forms',
      'get <id>                    Get form details',
      'submissions <id>            Get form submissions',
      'help                        Show this help'
    ],
    'Options': [
      '--limit <n>                 Results per page',
      '--all                       Fetch all pages',
      '--after <date>              Submissions after date (ISO 8601)',
      '--verbose                   Show full API response'
    ],
    'Examples': [
      'node forms.js list',
      'node forms.js get 12345',
      'node forms.js submissions 12345',
      'node forms.js submissions 12345 --after "2024-01-01"'
    ],
    'Note': [
      'Forms are read-only via API. Create/edit forms in HubSpot UI.',
      'Submissions contain the data users submitted through forms.'
    ]
  });
}

// List all forms
async function listForms(args) {
  const token = getToken();
  const limit = parseInt(args.limit) || 100;
  
  console.log('Fetching forms...\n');
  
  // Forms API uses direct GET, not paginated helper
  const data = await apiRequest('GET', `/marketing/v3/forms?limit=${limit}`, token);
  const results = data.results || [];
  const meta = { total: results.length };
  
  if (args.verbose) {
    console.log(JSON.stringify(results, null, 2));
    return;
  }
  
  console.log(`Found ${meta.total} forms:\n`);
  
  for (const form of results) {
    console.log(`- ${form.name}`);
    console.log(`  ID: ${form.id}`);
    console.log(`  Type: ${form.formType}`);
    console.log(`  Fields: ${form.fieldGroups?.reduce((acc, g) => acc + g.fields.length, 0) || 0}`);
    console.log(`  Created: ${formatDate(form.createdAt)}`);
    console.log('');
  }
}

// Get single form
async function getForm(id, args) {
  const token = getToken();
  
  const form = await apiRequest('GET', `/marketing/v3/forms/${id}`, token);
  
  if (args.verbose) {
    console.log(JSON.stringify(form, null, 2));
    return;
  }
  
  console.log(`Form: ${form.name}\n`);
  console.log(`ID: ${form.id}`);
  console.log(`Type: ${form.formType}`);
  console.log(`Submit Text: ${form.configuration?.submitButtonText || 'Submit'}`);
  console.log(`Created: ${formatDate(form.createdAt)}`);
  console.log(`Updated: ${formatDate(form.updatedAt)}`);
  
  console.log('\nFields:');
  for (const group of form.fieldGroups || []) {
    for (const field of group.fields || []) {
      const required = field.required ? ' *' : '';
      console.log(`  - ${field.label || field.name}${required}`);
      console.log(`    Name: ${field.name}`);
      console.log(`    Type: ${field.fieldType}`);
    }
  }
}

// Get form submissions
async function getSubmissions(formId, args) {
  const token = getToken();
  const limit = parseInt(args.limit) || 50;
  
  console.log(`Fetching submissions for form ${formId}...\n`);
  
  let endpoint = `/form-integrations/v1/submissions/forms/${formId}?limit=${limit}`;
  if (args.after) {
    const afterTs = new Date(args.after).getTime();
    endpoint += `&after=${afterTs}`;
  }
  
  const data = await apiRequest('GET', endpoint, token);
  
  if (args.verbose) {
    console.log(JSON.stringify(data, null, 2));
    return;
  }
  
  const results = data.results || [];
  console.log(`Found ${results.length} submissions:\n`);
  
  for (const sub of results) {
    console.log(`Submission ${sub.submittedAt ? formatDate(new Date(sub.submittedAt)) : 'N/A'}`);
    console.log(`  Page: ${sub.pageUrl || 'N/A'}`);
    
    for (const value of sub.values || []) {
      console.log(`  ${value.name}: ${value.value}`);
    }
    console.log('');
  }
}

// Main
async function main() {
  const args = parseArgs(process.argv.slice(2));
  const command = args._[0];
  
  try {
    switch (command) {
      case 'list': await listForms(args); break;
      case 'get':
        if (!args._[1]) { console.error('Error: Form ID required'); process.exit(1); }
        await getForm(args._[1], args); break;
      case 'submissions':
        if (!args._[1]) { console.error('Error: Form ID required'); process.exit(1); }
        await getSubmissions(args._[1], args); break;
      case 'help':
      default: printHelp();
    }
  } catch (error) {
    handleError(error, args.verbose);
  }
}

main();
