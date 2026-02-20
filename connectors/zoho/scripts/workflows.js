#!/usr/bin/env node

/**
 * Zoho CRM Workflow Rules Management
 * Create, read, update, delete, and manage workflow automation rules.
 */

import { fileURLToPath } from 'url';
import path from 'path';
import {
  initScript, parseArgs, apiRequest, apiRequestPaginated,
  confirmDestructiveAction, handleError, showHelp
} from './utils.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Trigger types
const TRIGGER_TYPES = {
  'record_action': ['create', 'edit', 'create_or_edit', 'delete', 'field_update'],
  'date_time': ['date_time'],
  'scoring': ['score_increase', 'score_decrease', 'score_update'],
  'email': ['email_received', 'mail_sent', 'mail_sent_clicked', 'mail_sent_replied', 'mail_sent_opened', 'mail_sent_bounced'],
  'signal': ['signal'],
  'approve_reject': ['approve', 'reject'],
  'review': ['review_submitted']
};

// Help documentation
function printHelp() {
  showHelp('Zoho CRM Workflow Rules', {
    'Commands': [
      'list                        List all workflow rules',
      'get <id>                    Get workflow rule details',
      'create                      Create a new workflow rule',
      'update <id>                 Update a workflow rule',
      'delete <id>                 Delete a workflow rule',
      'enable <id>                 Enable a workflow rule',
      'disable <id>                Disable a workflow rule',
      'actions <id>                List actions for a workflow',
      'help                        Show this help'
    ],
    'Options': [
      '--org <name>                Organization to use',
      '--module <name>             Module for the workflow',
      '--name <name>               Workflow rule name',
      '--trigger <type>            Trigger type (see below)',
      '--criteria <json>           Criteria JSON',
      '--actions <json>            Actions JSON',
      '--verbose                   Show full API response',
      '--force                     Skip confirmation for destructive actions'
    ],
    'Trigger Types': [
      'Record: create, edit, create_or_edit, delete, field_update',
      'Date/Time: date_time',
      'Scoring: score_increase, score_decrease, score_update',
      'Email: email_received, mail_sent, mail_sent_clicked, mail_sent_replied'
    ],
    'Examples': [
      'node workflows.js list',
      'node workflows.js list --module Leads',
      'node workflows.js get 1234567890',
      'node workflows.js enable 1234567890',
      'node workflows.js disable 1234567890',
      'node workflows.js actions 1234567890'
    ],
    'Create Example': [
      'node workflows.js create --module Leads --name "New Lead Notification" \\',
      '  --trigger create --criteria \'{"group_operator":"and","group":[...]}\''
    ]
  });
}

// List workflow rules
async function listWorkflows(args) {
  const { config, token } = await initScript(args);
  
  console.log('Fetching workflow rules...\n');
  
  let endpoint = '/settings/automation/workflow_rules';
  
  if (args.module) {
    endpoint += `?module=${args.module}`;
  }
  
  const data = await apiRequest('GET', endpoint, token, null, { region: config.region });
  
  if (args.verbose) {
    console.log(JSON.stringify(data, null, 2));
    return;
  }
  
  const workflows = data.workflow_rules || [];
  
  console.log(`Found ${workflows.length} workflow rules:\n`);
  
  for (const workflow of workflows) {
    // Zoho v8 returns status as an object: { active: boolean }.
    // Keep backward compatibility with older string status responses.
    const isActive = typeof workflow.status === 'object'
      ? Boolean(workflow.status?.active)
      : workflow.status === 'active';
    const status = isActive ? '[ACTIVE]' : '[INACTIVE]';
    console.log(`- ${workflow.name} ${status}`);
    console.log(`  ID: ${workflow.id}`);
    console.log(`  Module: ${workflow.module?.api_name || 'N/A'}`);
    console.log(`  Trigger: ${workflow.trigger?.type || 'N/A'}`);
    if (workflow.description) {
      console.log(`  Description: ${workflow.description}`);
    }
    console.log('');
  }
}

// Get workflow details
async function getWorkflow(id, args) {
  const { config, token } = await initScript(args);
  
  const endpoint = `/settings/automation/workflow_rules/${id}`;
  const data = await apiRequest('GET', endpoint, token, null, { region: config.region });
  
  if (args.verbose) {
    console.log(JSON.stringify(data, null, 2));
    return;
  }
  
  const workflows = data.workflow_rules || [];
  
  if (workflows.length === 0) {
    console.error(`Error: Workflow rule not found: ${id}`);
    process.exit(1);
  }
  
  const workflow = workflows[0];
  
  console.log(`Workflow Rule: ${workflow.name}\n`);
  console.log(`ID: ${workflow.id}`);
  console.log(`Status: ${workflow.status}`);
  console.log(`Module: ${workflow.module?.api_name || 'N/A'}`);
  console.log(`Trigger: ${workflow.trigger?.type || 'N/A'}`);
  
  if (workflow.description) {
    console.log(`Description: ${workflow.description}`);
  }
  
  if (workflow.criteria) {
    console.log('\nCriteria:');
    console.log(JSON.stringify(workflow.criteria, null, 2));
  }
  
  if (workflow.actions) {
    console.log('\nActions:');
    for (const action of workflow.actions) {
      console.log(`  - ${action.type}: ${action.name || action.id}`);
    }
  }
}

// Create workflow rule
async function createWorkflow(args) {
  const { config, token } = await initScript(args);
  
  if (!args.module) {
    console.error('Error: --module is required');
    process.exit(1);
  }
  
  if (!args.name) {
    console.error('Error: --name is required');
    process.exit(1);
  }
  
  if (!args.trigger) {
    console.error('Error: --trigger is required');
    console.error('Valid triggers: create, edit, create_or_edit, delete, field_update, date_time, etc.');
    process.exit(1);
  }
  
  const workflow = {
    name: args.name,
    module: { api_name: args.module },
    trigger: { type: args.trigger }
  };
  
  if (args.description) {
    workflow.description = args.description;
  }
  
  if (args.criteria) {
    try {
      workflow.criteria = JSON.parse(args.criteria);
    } catch (e) {
      console.error('Error: Invalid JSON in --criteria');
      process.exit(1);
    }
  }
  
  if (args.actions) {
    try {
      workflow.actions = JSON.parse(args.actions);
    } catch (e) {
      console.error('Error: Invalid JSON in --actions');
      process.exit(1);
    }
  }
  
  const body = { workflow_rules: [workflow] };
  
  const data = await apiRequest('POST', '/settings/automation/workflow_rules', token, body, { region: config.region });
  
  if (args.verbose) {
    console.log(JSON.stringify(data, null, 2));
    return;
  }
  
  if (data.workflow_rules && data.workflow_rules[0]) {
    const result = data.workflow_rules[0];
    if (result.status === 'success') {
      console.log('Workflow rule created successfully!\n');
      console.log(`ID: ${result.details.id}`);
    } else {
      console.error(`Error: ${result.message}`);
      process.exit(1);
    }
  }
}

// Update workflow rule
async function updateWorkflow(id, args) {
  const { config, token } = await initScript(args);
  
  const workflow = { id };
  
  if (args.name) workflow.name = args.name;
  if (args.description) workflow.description = args.description;
  
  if (args.criteria) {
    try {
      workflow.criteria = JSON.parse(args.criteria);
    } catch (e) {
      console.error('Error: Invalid JSON in --criteria');
      process.exit(1);
    }
  }
  
  if (args.actions) {
    try {
      workflow.actions = JSON.parse(args.actions);
    } catch (e) {
      console.error('Error: Invalid JSON in --actions');
      process.exit(1);
    }
  }
  
  const body = { workflow_rules: [workflow] };
  
  const data = await apiRequest('PUT', `/settings/automation/workflow_rules/${id}`, token, body, { region: config.region });
  
  if (args.verbose) {
    console.log(JSON.stringify(data, null, 2));
    return;
  }
  
  if (data.workflow_rules && data.workflow_rules[0]) {
    const result = data.workflow_rules[0];
    if (result.status === 'success') {
      console.log('Workflow rule updated successfully!');
    } else {
      console.error(`Error: ${result.message}`);
      process.exit(1);
    }
  }
}

// Delete workflow rule
async function deleteWorkflow(id, args) {
  const { config, token } = await initScript(args);
  
  // Get workflow info first
  let workflowName = id;
  try {
    const existing = await apiRequest('GET', `/settings/automation/workflow_rules/${id}`, token, null, { region: config.region });
    if (existing.workflow_rules && existing.workflow_rules[0]) {
      workflowName = existing.workflow_rules[0].name;
    }
  } catch (e) {
    // Proceed with ID
  }
  
  const confirmed = await confirmDestructiveAction(
    `Delete workflow rule: ${workflowName}`,
    [`ID: ${id}`, 'This will remove all associated actions.'],
    args.force
  );
  
  if (!confirmed) return;
  
  const data = await apiRequest('DELETE', `/settings/automation/workflow_rules/${id}`, token, null, { region: config.region });
  
  if (args.verbose) {
    console.log(JSON.stringify(data, null, 2));
    return;
  }
  
  console.log('Workflow rule deleted successfully.');
}

// Enable workflow rule
async function enableWorkflow(id, args) {
  const { config, token } = await initScript(args);
  
  const body = { workflow_rules: [{ id, status: { active: true } }] };
  
  const data = await apiRequest('PUT', `/settings/automation/workflow_rules/${id}`, token, body, { region: config.region });
  
  if (args.verbose) {
    console.log(JSON.stringify(data, null, 2));
    return;
  }
  
  console.log('Workflow rule enabled successfully.');
}

// Disable workflow rule
async function disableWorkflow(id, args) {
  const { config, token } = await initScript(args);
  
  const body = { workflow_rules: [{ id, status: { active: false, delete_schedule_action: false } }] };
  
  const data = await apiRequest('PUT', `/settings/automation/workflow_rules/${id}`, token, body, { region: config.region });
  
  if (args.verbose) {
    console.log(JSON.stringify(data, null, 2));
    return;
  }
  
  console.log('Workflow rule disabled successfully.');
}

// List workflow actions
async function listWorkflowActions(id, args) {
  const { config, token } = await initScript(args);
  
  console.log('Fetching workflow actions...\n');
  
  // Get the workflow to see its actions
  const data = await apiRequest('GET', `/settings/automation/workflow_rules/${id}`, token, null, { region: config.region });
  
  if (args.verbose) {
    console.log(JSON.stringify(data, null, 2));
    return;
  }
  
  const workflows = data.workflow_rules || [];
  
  if (workflows.length === 0) {
    console.error(`Error: Workflow rule not found: ${id}`);
    process.exit(1);
  }
  
  const workflow = workflows[0];
  const actions = workflow.actions || [];
  
  console.log(`Actions for workflow "${workflow.name}":\n`);
  
  if (actions.length === 0) {
    console.log('No actions configured.');
    return;
  }
  
  for (const action of actions) {
    console.log(`- Type: ${action.type}`);
    console.log(`  ID: ${action.id}`);
    if (action.name) console.log(`  Name: ${action.name}`);
    if (action.details) {
      console.log(`  Details: ${JSON.stringify(action.details)}`);
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
      case 'list':
        await listWorkflows(args);
        break;
      case 'get':
        if (!args._[1]) {
          console.error('Error: Workflow rule ID required');
          process.exit(1);
        }
        await getWorkflow(args._[1], args);
        break;
      case 'create':
        await createWorkflow(args);
        break;
      case 'update':
        if (!args._[1]) {
          console.error('Error: Workflow rule ID required');
          process.exit(1);
        }
        await updateWorkflow(args._[1], args);
        break;
      case 'delete':
        if (!args._[1]) {
          console.error('Error: Workflow rule ID required');
          process.exit(1);
        }
        await deleteWorkflow(args._[1], args);
        break;
      case 'enable':
        if (!args._[1]) {
          console.error('Error: Workflow rule ID required');
          process.exit(1);
        }
        await enableWorkflow(args._[1], args);
        break;
      case 'disable':
        if (!args._[1]) {
          console.error('Error: Workflow rule ID required');
          process.exit(1);
        }
        await disableWorkflow(args._[1], args);
        break;
      case 'actions':
        if (!args._[1]) {
          console.error('Error: Workflow rule ID required');
          process.exit(1);
        }
        await listWorkflowActions(args._[1], args);
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
