#!/usr/bin/env node

/**
 * Zoho CRM Blueprint Management
 * Manage process automation blueprints and transitions.
 */

import { fileURLToPath } from 'url';
import path from 'path';
import {
  initScript, parseArgs, apiRequest, handleError, showHelp
} from './utils.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Help documentation
function printHelp() {
  showHelp('Zoho CRM Blueprints', {
    'Commands': [
      'get <record_id>             Get blueprint for a record',
      'transitions <record_id>     List available transitions',
      'update <record_id>          Update blueprint transition',
      'help                        Show this help'
    ],
    'Options': [
      '--org <name>                Organization to use',
      '--module <name>             Module name (default: Leads)',
      '--transition <id>           Transition ID for update',
      '--data <json>               JSON data for transition fields',
      '--verbose                   Show full API response'
    ],
    'Examples': [
      'node blueprints.js get 1234567890 --module Leads',
      'node blueprints.js transitions 1234567890 --module Deals',
      'node blueprints.js update 1234567890 --module Deals --transition 555 --data \'{"Stage":"Qualification"}\''
    ],
    'Blueprint Concepts': [
      'Blueprints define the process a record must follow.',
      'Transitions move records from one state to another.',
      'Each transition may require specific fields to be filled.',
      'Use "get" to see available transitions for a record.',
      'Use "update" to execute a transition.'
    ]
  });
}

// Get blueprint for a record
async function getBlueprint(recordId, args) {
  const { config, token } = await initScript(args);
  const moduleName = args.module || 'Leads';
  
  console.log(`Fetching blueprint for ${moduleName} record ${recordId}...\n`);
  
  const endpoint = `/${moduleName}/${recordId}/actions/blueprint`;
  const data = await apiRequest('GET', endpoint, token, null, { region: config.region });
  
  if (args.verbose) {
    console.log(JSON.stringify(data, null, 2));
    return;
  }
  
  const blueprint = data.blueprint;
  
  if (!blueprint) {
    console.log('No blueprint configured for this record.');
    return;
  }
  
  console.log('Blueprint Information:\n');
  
  // Current state
  if (blueprint.process_info) {
    const info = blueprint.process_info;
    console.log(`Process: ${info.name || 'N/A'}`);
    console.log(`Current State: ${info.field_value || 'N/A'}`);
    console.log(`Escalation: ${info.escalation ? 'Yes' : 'No'}`);
    if (info.is_continuous) {
      console.log(`Continuous: Yes`);
    }
    console.log('');
  }
  
  // Available transitions
  const transitions = blueprint.transitions || [];
  
  if (transitions.length === 0) {
    console.log('No transitions available for this record.');
    return;
  }
  
  console.log(`Available Transitions (${transitions.length}):\n`);
  
  for (const transition of transitions) {
    console.log(`- ${transition.name}`);
    console.log(`  ID: ${transition.id}`);
    console.log(`  Next State: ${transition.next_field_value || 'N/A'}`);
    
    if (transition.criteria_matched !== undefined) {
      console.log(`  Criteria Matched: ${transition.criteria_matched}`);
    }
    
    // Required fields for this transition
    const fields = transition.fields || [];
    if (fields.length > 0) {
      console.log('  Required Fields:');
      for (const field of fields) {
        const required = field._required ? ' (required)' : '';
        console.log(`    - ${field.display_label || field.api_name}${required}`);
      }
    }
    
    console.log('');
  }
}

// List available transitions
async function listTransitions(recordId, args) {
  const { config, token } = await initScript(args);
  const moduleName = args.module || 'Leads';
  
  const endpoint = `/${moduleName}/${recordId}/actions/blueprint`;
  const data = await apiRequest('GET', endpoint, token, null, { region: config.region });
  
  if (args.verbose) {
    console.log(JSON.stringify(data, null, 2));
    return;
  }
  
  const blueprint = data.blueprint;
  
  if (!blueprint) {
    console.log('No blueprint configured for this record.');
    return;
  }
  
  const transitions = blueprint.transitions || [];
  
  console.log(`Available Transitions for ${moduleName} ${recordId}:\n`);
  
  if (transitions.length === 0) {
    console.log('No transitions available.');
    return;
  }
  
  // Simple table format
  console.log('ID'.padEnd(15) + 'Name'.padEnd(30) + 'Next State');
  console.log('-'.repeat(60));
  
  for (const transition of transitions) {
    console.log(
      String(transition.id).padEnd(15) +
      (transition.name || 'N/A').substring(0, 28).padEnd(30) +
      (transition.next_field_value || 'N/A')
    );
  }
}

// Update blueprint (execute transition)
async function updateBlueprint(recordId, args) {
  const { config, token } = await initScript(args);
  const moduleName = args.module || 'Leads';
  
  if (!args.transition) {
    console.error('Error: --transition <id> is required');
    console.error('Use "blueprints.js transitions <record_id>" to see available transitions.');
    process.exit(1);
  }
  
  const body = {
    blueprint: [{
      transition_id: args.transition
    }]
  };
  
  // Add field data if provided
  if (args.data) {
    try {
      const fieldData = JSON.parse(args.data);
      body.blueprint[0].data = fieldData;
    } catch (e) {
      console.error('Error: Invalid JSON in --data');
      process.exit(1);
    }
  }
  
  console.log(`Executing transition ${args.transition} for ${moduleName} ${recordId}...\n`);
  
  const endpoint = `/${moduleName}/${recordId}/actions/blueprint`;
  const data = await apiRequest('PUT', endpoint, token, body, { region: config.region });
  
  if (args.verbose) {
    console.log(JSON.stringify(data, null, 2));
    return;
  }
  
  if (data.data && data.data[0]) {
    const result = data.data[0];
    if (result.status === 'success') {
      console.log('Blueprint transition executed successfully!');
      console.log(`Record ${recordId} has been updated.`);
    } else {
      console.error(`Error: ${result.message}`);
      if (result.details) {
        console.error('Details:', JSON.stringify(result.details, null, 2));
      }
      process.exit(1);
    }
  } else {
    console.log('Transition executed.');
  }
}

// Main
async function main() {
  const args = parseArgs(process.argv.slice(2));
  const command = args._[0];
  
  try {
    switch (command) {
      case 'get':
        if (!args._[1]) {
          console.error('Error: Record ID required');
          console.error('Usage: node blueprints.js get <record_id> --module <module>');
          process.exit(1);
        }
        await getBlueprint(args._[1], args);
        break;
      case 'transitions':
        if (!args._[1]) {
          console.error('Error: Record ID required');
          console.error('Usage: node blueprints.js transitions <record_id> --module <module>');
          process.exit(1);
        }
        await listTransitions(args._[1], args);
        break;
      case 'update':
        if (!args._[1]) {
          console.error('Error: Record ID required');
          console.error('Usage: node blueprints.js update <record_id> --module <module> --transition <id>');
          process.exit(1);
        }
        await updateBlueprint(args._[1], args);
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
