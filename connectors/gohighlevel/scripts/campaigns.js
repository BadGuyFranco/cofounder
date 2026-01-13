#!/usr/bin/env node

/**
 * Go High Level Campaigns & Workflows Script
 * Manage marketing campaigns and automation workflows.
 * 
 * Usage:
 *   node campaigns.js list --location "Name"
 *   node campaigns.js workflows --location "Name"
 *   node campaigns.js workflow <workflow-id> --location "Name"
 *   node campaigns.js add-to-workflow --contact-id <id> --workflow-id <id> --location "Name"
 *   node campaigns.js remove-from-workflow --contact-id <id> --workflow-id <id> --location "Name"
 *   node campaigns.js locations
 */

import path from 'path';
import { fileURLToPath } from 'url';
import {
  loadEnv,
  loadLocations,
  resolveLocation,
  parseArgs,
  confirmDestructiveAction,
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

// List campaigns
async function listCampaigns(location, verbose) {
  const data = await apiRequest('GET', `/campaigns/?locationId=${location.id}`, location.key);
  
  const campaigns = data.campaigns || [];
  console.log(`Found ${campaigns.length} campaigns:\n`);
  
  for (const campaign of campaigns) {
    console.log(`- ${campaign.name}`);
    console.log(`  ID: ${campaign.id}`);
    console.log(`  Status: ${campaign.status || 'N/A'}`);
    if (campaign.createdAt) console.log(`  Created: ${formatDate(campaign.createdAt)}`);
    console.log('');
  }
  
  if (verbose) {
    console.log('\nFull response:');
    console.log(JSON.stringify(data, null, 2));
  }
  
  return campaigns;
}

// List workflows
async function listWorkflows(location, verbose) {
  const data = await apiRequest('GET', `/workflows/?locationId=${location.id}`, location.key);
  
  const workflows = data.workflows || [];
  console.log(`Found ${workflows.length} workflows:\n`);
  
  for (const workflow of workflows) {
    console.log(`- ${workflow.name}`);
    console.log(`  ID: ${workflow.id}`);
    console.log(`  Status: ${workflow.status || 'N/A'}`);
    console.log(`  Version: ${workflow.version || 'N/A'}`);
    if (workflow.createdAt) console.log(`  Created: ${formatDate(workflow.createdAt)}`);
    console.log('');
  }
  
  if (verbose) {
    console.log('\nFull response:');
    console.log(JSON.stringify(data, null, 2));
  }
  
  return workflows;
}

// Get workflow details
async function getWorkflow(workflowId, location, verbose) {
  const data = await apiRequest('GET', `/workflows/${workflowId}`, location.key);
  
  const workflow = data.workflow || data;
  console.log(`Workflow: ${workflow.name}`);
  console.log(`ID: ${workflow.id}`);
  console.log(`Status: ${workflow.status || 'N/A'}`);
  console.log(`Version: ${workflow.version || 'N/A'}`);
  console.log(`Created: ${formatDate(workflow.createdAt)}`);
  console.log(`Updated: ${formatDate(workflow.updatedAt)}`);
  
  if (verbose) {
    console.log('\nFull response:');
    console.log(JSON.stringify(data, null, 2));
  }
  
  return workflow;
}

// Add contact to workflow
async function addToWorkflow(contactId, workflowId, location, verbose, force = false) {
  // Get workflow name for confirmation
  let workflowName = workflowId;
  try {
    const wfData = await apiRequest('GET', `/workflows/${workflowId}`, location.key);
    workflowName = wfData.workflow?.name || wfData.name || workflowId;
  } catch (e) {
    // Continue with ID only
  }
  
  const confirmed = await confirmDestructiveAction(
    'You are about to ADD a contact to a workflow.',
    [
      `Contact ID: ${contactId}`,
      `Workflow: ${workflowName}`,
      `Workflow ID: ${workflowId}`,
      '',
      'This will trigger automation actions.',
      'SMS, emails, and other actions may be sent.'
    ],
    force
  );
  
  if (!confirmed) {
    process.exit(0);
  }
  
  const data = await apiRequest('POST', `/contacts/${contactId}/workflow/${workflowId}`, location.key, {
    eventStartTime: new Date().toISOString()
  });
  
  console.log('Contact added to workflow successfully!');
  console.log(`Contact ID: ${contactId}`);
  console.log(`Workflow: ${workflowName}`);
  
  if (verbose) {
    console.log('\nFull response:');
    console.log(JSON.stringify(data, null, 2));
  }
  
  return data;
}

// Remove contact from workflow
async function removeFromWorkflow(contactId, workflowId, location, verbose, force = false) {
  // Get workflow name for confirmation
  let workflowName = workflowId;
  try {
    const wfData = await apiRequest('GET', `/workflows/${workflowId}`, location.key);
    workflowName = wfData.workflow?.name || wfData.name || workflowId;
  } catch (e) {
    // Continue with ID only
  }
  
  const confirmed = await confirmDestructiveAction(
    'You are about to REMOVE a contact from a workflow.',
    [
      `Contact ID: ${contactId}`,
      `Workflow: ${workflowName}`,
      `Workflow ID: ${workflowId}`,
      '',
      'This will stop all pending actions for this contact.',
      'Already executed actions cannot be undone.'
    ],
    force
  );
  
  if (!confirmed) {
    process.exit(0);
  }
  
  const data = await apiRequest('DELETE', `/contacts/${contactId}/workflow/${workflowId}`, location.key);
  
  console.log('Contact removed from workflow!');
  console.log(`Contact ID: ${contactId}`);
  console.log(`Workflow: ${workflowName}`);
  
  if (verbose) {
    console.log('\nFull response:');
    console.log(JSON.stringify(data, null, 2));
  }
  
  return data;
}

// Get campaign details
async function getCampaign(campaignId, location, verbose) {
  const data = await apiRequest('GET', `/campaigns/${campaignId}`, location.key);
  
  const campaign = data.campaign || data;
  console.log(`Campaign: ${campaign.name}`);
  console.log(`ID: ${campaign.id}`);
  console.log(`Status: ${campaign.status || 'N/A'}`);
  console.log(`Created: ${formatDate(campaign.createdAt)}`);
  
  if (verbose) {
    console.log('\nFull response:');
    console.log(JSON.stringify(data, null, 2));
  }
  
  return campaign;
}

// Add contact to campaign
async function addToCampaign(contactId, campaignId, location, verbose, force = false) {
  // Get campaign name for confirmation
  let campaignName = campaignId;
  try {
    const campData = await apiRequest('GET', `/campaigns/${campaignId}`, location.key);
    campaignName = campData.campaign?.name || campData.name || campaignId;
  } catch (e) {
    // Continue with ID only
  }
  
  const confirmed = await confirmDestructiveAction(
    'You are about to ADD a contact to a campaign.',
    [
      `Contact ID: ${contactId}`,
      `Campaign: ${campaignName}`,
      `Campaign ID: ${campaignId}`,
      '',
      'This will trigger campaign actions.',
      'SMS, emails, and other actions may be sent.'
    ],
    force
  );
  
  if (!confirmed) {
    process.exit(0);
  }
  
  const data = await apiRequest('POST', `/contacts/${contactId}/campaigns/${campaignId}`, location.key);
  
  console.log('Contact added to campaign successfully!');
  console.log(`Contact ID: ${contactId}`);
  console.log(`Campaign: ${campaignName}`);
  
  if (verbose) {
    console.log('\nFull response:');
    console.log(JSON.stringify(data, null, 2));
  }
  
  return data;
}

// Remove contact from campaign
async function removeFromCampaign(contactId, campaignId, location, verbose, force = false) {
  // Get campaign name for confirmation
  let campaignName = campaignId;
  try {
    const campData = await apiRequest('GET', `/campaigns/${campaignId}`, location.key);
    campaignName = campData.campaign?.name || campData.name || campaignId;
  } catch (e) {
    // Continue with ID only
  }
  
  const confirmed = await confirmDestructiveAction(
    'You are about to REMOVE a contact from a campaign.',
    [
      `Contact ID: ${contactId}`,
      `Campaign: ${campaignName}`,
      `Campaign ID: ${campaignId}`,
      '',
      'This will stop pending campaign actions for this contact.'
    ],
    force
  );
  
  if (!confirmed) {
    process.exit(0);
  }
  
  const data = await apiRequest('DELETE', `/contacts/${contactId}/campaigns/${campaignId}`, location.key);
  
  console.log('Contact removed from campaign!');
  console.log(`Contact ID: ${contactId}`);
  console.log(`Campaign: ${campaignName}`);
  
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
  
  if (command === 'locations') {
    listLocations(locationsConfig);
    return;
  }
  
  try {
    switch (command) {
      case 'list':
      case 'campaigns': {
        const location = resolveLocation(args.location, locationsConfig);
        await listCampaigns(location, verbose);
        break;
      }
      
      case 'campaign': {
        const location = resolveLocation(args.location, locationsConfig);
        const campaignId = args._[1];
        
        if (!campaignId) {
          console.error('Error: Campaign ID is required');
          console.error('Usage: node campaigns.js campaign <campaign-id> --location "Name"');
          process.exit(1);
        }
        
        await getCampaign(campaignId, location, verbose);
        break;
      }
      
      case 'workflows': {
        const location = resolveLocation(args.location, locationsConfig);
        await listWorkflows(location, verbose);
        break;
      }
      
      case 'workflow': {
        const location = resolveLocation(args.location, locationsConfig);
        const workflowId = args._[1];
        
        if (!workflowId) {
          console.error('Error: Workflow ID is required');
          console.error('Usage: node campaigns.js workflow <workflow-id> --location "Name"');
          process.exit(1);
        }
        
        await getWorkflow(workflowId, location, verbose);
        break;
      }
      
      case 'add-to-workflow': {
        const location = resolveLocation(args.location, locationsConfig);
        const contactId = args['contact-id'];
        const workflowId = args['workflow-id'];
        
        if (!contactId || !workflowId) {
          console.error('Error: --contact-id and --workflow-id are required');
          console.error('Usage: node campaigns.js add-to-workflow --contact-id <id> --workflow-id <id> --location "Name"');
          process.exit(1);
        }
        
        await addToWorkflow(contactId, workflowId, location, verbose, args.force);
        break;
      }
      
      case 'remove-from-workflow': {
        const location = resolveLocation(args.location, locationsConfig);
        const contactId = args['contact-id'];
        const workflowId = args['workflow-id'];
        
        if (!contactId || !workflowId) {
          console.error('Error: --contact-id and --workflow-id are required');
          console.error('Usage: node campaigns.js remove-from-workflow --contact-id <id> --workflow-id <id> --location "Name"');
          process.exit(1);
        }
        
        await removeFromWorkflow(contactId, workflowId, location, verbose, args.force);
        break;
      }
      
      case 'add-to-campaign': {
        const location = resolveLocation(args.location, locationsConfig);
        const contactId = args['contact-id'];
        const campaignId = args['campaign-id'];
        
        if (!contactId || !campaignId) {
          console.error('Error: --contact-id and --campaign-id are required');
          console.error('Usage: node campaigns.js add-to-campaign --contact-id <id> --campaign-id <id> --location "Name"');
          process.exit(1);
        }
        
        await addToCampaign(contactId, campaignId, location, verbose, args.force);
        break;
      }
      
      case 'remove-from-campaign': {
        const location = resolveLocation(args.location, locationsConfig);
        const contactId = args['contact-id'];
        const campaignId = args['campaign-id'];
        
        if (!contactId || !campaignId) {
          console.error('Error: --contact-id and --campaign-id are required');
          console.error('Usage: node campaigns.js remove-from-campaign --contact-id <id> --campaign-id <id> --location "Name"');
          process.exit(1);
        }
        
        await removeFromCampaign(contactId, campaignId, location, verbose, args.force);
        break;
      }
      
      default:
        console.log('Go High Level Campaigns & Workflows Script');
        console.log('');
        console.log('Commands:');
        console.log('  list --location "Name"                List all campaigns');
        console.log('  campaign <campaign-id>                Get campaign details');
        console.log('  workflows --location "Name"           List all workflows');
        console.log('  workflow <workflow-id>                Get workflow details');
        console.log('  add-to-workflow --contact-id --workflow-id     Add contact to workflow');
        console.log('  remove-from-workflow --contact-id --workflow-id  Remove from workflow');
        console.log('  add-to-campaign --contact-id --campaign-id       Add contact to campaign');
        console.log('  remove-from-campaign --contact-id --campaign-id  Remove from campaign');
        console.log('  locations                             List available locations');
        console.log('');
        console.log('Location Options:');
        console.log('  --location "Name"             Specify which GHL account to use');
        console.log('');
        console.log('Workflow/Campaign Options:');
        console.log('  --contact-id <id>             Contact ID (required)');
        console.log('  --workflow-id <id>            Workflow ID (for workflow commands)');
        console.log('  --campaign-id <id>            Campaign ID (for campaign commands)');
        console.log('');
        console.log('Global Options:');
        console.log('  --verbose                     Show full API responses');
        console.log('  --force                       Skip confirmation for destructive actions');
        console.log('');
        console.log('WARNING: Adding contacts to workflows/campaigns triggers automations.');
        console.log('SMS, emails, and other actions may be sent immediately.');
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
