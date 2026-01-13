#!/usr/bin/env node

/**
 * HubSpot Workflows Management
 * View and manage automation workflows (mostly read-only via API).
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
  showHelp('HubSpot Workflows', {
    'Commands': [
      'list                        List all workflows',
      'get <id>                    Get workflow details',
      'enroll <id>                 Enroll contact in workflow',
      'unenroll <id>               Remove contact from workflow',
      'help                        Show this help'
    ],
    'Options': [
      '--contact <email>           Contact email for enroll/unenroll',
      '--limit <n>                 Results per page',
      '--all                       Fetch all pages',
      '--verbose                   Show full API response'
    ],
    'Examples': [
      'node workflows.js list',
      'node workflows.js get 12345',
      'node workflows.js enroll 12345 --contact "john@example.com"',
      'node workflows.js unenroll 12345 --contact "john@example.com"'
    ],
    'Note': [
      'Creating/editing workflows via API is limited.',
      'Use HubSpot UI for building complex automation.',
      'API primarily supports listing, viewing, and enrolling contacts.'
    ]
  });
}

// List all workflows
async function listWorkflows(args) {
  const token = getToken();
  
  console.log('Fetching workflows...\n');
  
  const data = await apiRequest('GET', '/automation/v3/workflows', token);
  
  if (args.verbose) {
    console.log(JSON.stringify(data, null, 2));
    return;
  }
  
  const workflows = data.workflows || [];
  console.log(`Found ${workflows.length} workflows:\n`);
  
  for (const wf of workflows) {
    const status = wf.enabled ? 'Active' : 'Inactive';
    console.log(`- ${wf.name}`);
    console.log(`  ID: ${wf.id}`);
    console.log(`  Status: ${status}`);
    console.log(`  Type: ${wf.type}`);
    console.log(`  Enrolled: ${wf.contactListIds?.enrolled?.length || 0} contacts`);
    console.log(`  Created: ${formatDate(new Date(wf.insertedAt))}`);
    console.log('');
  }
}

// Get single workflow
async function getWorkflow(id, args) {
  const token = getToken();
  
  const workflow = await apiRequest('GET', `/automation/v3/workflows/${id}`, token);
  
  if (args.verbose) {
    console.log(JSON.stringify(workflow, null, 2));
    return;
  }
  
  console.log(`Workflow: ${workflow.name}\n`);
  console.log(`ID: ${workflow.id}`);
  console.log(`Enabled: ${workflow.enabled ? 'Yes' : 'No'}`);
  console.log(`Type: ${workflow.type}`);
  console.log(`Portal ID: ${workflow.portalId}`);
  
  if (workflow.enrollmentCriteria) {
    console.log('\nEnrollment Triggers:');
    console.log(`  Type: ${workflow.enrollmentCriteria.type}`);
  }
  
  if (workflow.actions && workflow.actions.length > 0) {
    console.log(`\nActions: ${workflow.actions.length} steps`);
    for (let i = 0; i < Math.min(workflow.actions.length, 5); i++) {
      const action = workflow.actions[i];
      console.log(`  ${i + 1}. ${action.type}`);
    }
    if (workflow.actions.length > 5) {
      console.log(`  ... and ${workflow.actions.length - 5} more`);
    }
  }
  
  console.log(`\nCreated: ${formatDate(new Date(workflow.insertedAt))}`);
  console.log(`Updated: ${formatDate(new Date(workflow.updatedAt))}`);
}

// Enroll contact in workflow
async function enrollContact(workflowId, args) {
  const token = getToken();
  
  if (!args.contact) {
    console.error('Error: --contact (email) is required');
    process.exit(1);
  }
  
  const body = {
    contactEmail: args.contact
  };
  
  await apiRequest('POST', `/automation/v2/workflows/${workflowId}/enrollments/contacts/${encodeURIComponent(args.contact)}`, token);
  
  console.log(`Successfully enrolled ${args.contact} in workflow ${workflowId}`);
}

// Unenroll contact from workflow
async function unenrollContact(workflowId, args) {
  const token = getToken();
  
  if (!args.contact) {
    console.error('Error: --contact (email) is required');
    process.exit(1);
  }
  
  await apiRequest('DELETE', `/automation/v2/workflows/${workflowId}/enrollments/contacts/${encodeURIComponent(args.contact)}`, token);
  
  console.log(`Successfully unenrolled ${args.contact} from workflow ${workflowId}`);
}

// Main
async function main() {
  const args = parseArgs(process.argv.slice(2));
  const command = args._[0];
  
  try {
    switch (command) {
      case 'list': await listWorkflows(args); break;
      case 'get':
        if (!args._[1]) { console.error('Error: Workflow ID required'); process.exit(1); }
        await getWorkflow(args._[1], args); break;
      case 'enroll':
        if (!args._[1]) { console.error('Error: Workflow ID required'); process.exit(1); }
        await enrollContact(args._[1], args); break;
      case 'unenroll':
        if (!args._[1]) { console.error('Error: Workflow ID required'); process.exit(1); }
        await unenrollContact(args._[1], args); break;
      case 'help':
      default: printHelp();
    }
  } catch (error) {
    handleError(error, args.verbose);
  }
}

main();
