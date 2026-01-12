#!/usr/bin/env node

/**
 * HubSpot Associations Management
 * Link contacts, companies, and deals together.
 */

import { fileURLToPath } from 'url';
import path from 'path';
import {
  loadEnv, getToken, parseArgs, apiRequest,
  confirmDestructiveAction, handleError, showHelp
} from './utils.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
loadEnv(path.join(__dirname, '..'));

// Help documentation
function printHelp() {
  showHelp('HubSpot Associations', {
    'Commands': [
      'list <from_type> <from_id> <to_type>   List associations',
      'create <from_type> <from_id> <to_type> <to_id>   Create association',
      'delete <from_type> <from_id> <to_type> <to_id>   Delete association',
      'types                                   List association types',
      'help                                    Show this help'
    ],
    'Object Types': [
      'contacts, companies, deals, tickets, notes, tasks, calls, emails, meetings'
    ],
    'Options': [
      '--type <association_type>   Association type ID (see types command)',
      '--verbose                   Show full API response',
      '--force                     Skip confirmation for delete'
    ],
    'Examples': [
      '# List all companies associated with a contact',
      'node associations.js list contacts 12345 companies',
      '',
      '# Associate a contact with a company',
      'node associations.js create contacts 12345 companies 67890',
      '',
      '# Associate a deal with a contact',
      'node associations.js create deals 11111 contacts 22222',
      '',
      '# Remove association',
      'node associations.js delete contacts 12345 companies 67890',
      '',
      '# List available association types',
      'node associations.js types'
    ],
    'Common Association Types': [
      'contact_to_company: 1',
      'company_to_contact: 2',
      'deal_to_contact: 3',
      'contact_to_deal: 4',
      'deal_to_company: 5',
      'company_to_deal: 6'
    ]
  });
}

// List associations
async function listAssociations(fromType, fromId, toType, args) {
  const token = getToken();
  
  console.log(`Fetching ${toType} associated with ${fromType}/${fromId}...\n`);
  
  const endpoint = `/crm/v4/objects/${fromType}/${fromId}/associations/${toType}`;
  const data = await apiRequest('GET', endpoint, token);
  
  if (args.verbose) {
    console.log(JSON.stringify(data, null, 2));
    return;
  }
  
  const results = data.results || [];
  
  if (results.length === 0) {
    console.log('No associations found.');
    return;
  }
  
  console.log(`Found ${results.length} associations:\n`);
  
  for (const assoc of results) {
    console.log(`- ${toType} ID: ${assoc.toObjectId}`);
    if (assoc.associationTypes) {
      for (const type of assoc.associationTypes) {
        console.log(`  Type: ${type.label || type.typeId} (${type.typeId})`);
      }
    }
    console.log('');
  }
}

// Create association
async function createAssociation(fromType, fromId, toType, toId, args) {
  const token = getToken();
  
  // Default association type based on from/to types
  const associationType = args.type || getDefaultAssociationType(fromType, toType);
  
  console.log(`Creating association: ${fromType}/${fromId} -> ${toType}/${toId}...\n`);
  
  const endpoint = `/crm/v4/objects/${fromType}/${fromId}/associations/${toType}/${toId}`;
  const body = [{
    associationCategory: 'HUBSPOT_DEFINED',
    associationTypeId: parseInt(associationType)
  }];
  
  const data = await apiRequest('PUT', endpoint, token, body);
  
  if (args.verbose) {
    console.log(JSON.stringify(data, null, 2));
    return;
  }
  
  console.log('Association created successfully!');
  console.log(`${fromType}/${fromId} is now associated with ${toType}/${toId}`);
}

// Delete association
async function deleteAssociation(fromType, fromId, toType, toId, args) {
  const token = getToken();
  
  const confirmed = await confirmDestructiveAction(
    `Delete association`,
    [
      `From: ${fromType}/${fromId}`,
      `To: ${toType}/${toId}`,
      'The link between these records will be removed.'
    ],
    args.force
  );
  
  if (!confirmed) return;
  
  const endpoint = `/crm/v4/objects/${fromType}/${fromId}/associations/${toType}/${toId}`;
  await apiRequest('DELETE', endpoint, token);
  
  console.log('Association deleted successfully.');
}

// List association types
async function listAssociationTypes(args) {
  const token = getToken();
  
  // HubSpot doesn't have a single endpoint for all types, so we list common ones
  console.log('Common HubSpot Association Types:\n');
  
  const types = [
    { from: 'contact', to: 'company', typeId: 1, label: 'Contact to Company' },
    { from: 'company', to: 'contact', typeId: 2, label: 'Company to Contact' },
    { from: 'deal', to: 'contact', typeId: 3, label: 'Deal to Contact' },
    { from: 'contact', to: 'deal', typeId: 4, label: 'Contact to Deal' },
    { from: 'deal', to: 'company', typeId: 5, label: 'Deal to Company' },
    { from: 'company', to: 'deal', typeId: 6, label: 'Company to Deal' },
    { from: 'ticket', to: 'contact', typeId: 15, label: 'Ticket to Contact' },
    { from: 'contact', to: 'ticket', typeId: 16, label: 'Contact to Ticket' },
    { from: 'ticket', to: 'company', typeId: 26, label: 'Ticket to Company' },
    { from: 'company', to: 'ticket', typeId: 27, label: 'Company to Ticket' },
    { from: 'deal', to: 'ticket', typeId: 27, label: 'Deal to Ticket' },
    { from: 'note', to: 'contact', typeId: 202, label: 'Note to Contact' },
    { from: 'note', to: 'company', typeId: 190, label: 'Note to Company' },
    { from: 'note', to: 'deal', typeId: 214, label: 'Note to Deal' },
    { from: 'task', to: 'contact', typeId: 204, label: 'Task to Contact' },
    { from: 'task', to: 'company', typeId: 192, label: 'Task to Company' },
    { from: 'task', to: 'deal', typeId: 216, label: 'Task to Deal' }
  ];
  
  for (const type of types) {
    console.log(`${type.label}`);
    console.log(`  ${type.from} -> ${type.to}: ${type.typeId}`);
    console.log('');
  }
  
  console.log('For custom association types, use:');
  console.log('  GET /crm/v4/associations/{fromObjectType}/{toObjectType}/labels');
}

// Get default association type ID
function getDefaultAssociationType(fromType, toType) {
  const key = `${fromType.replace('s', '')}_${toType.replace('s', '')}`;
  const defaults = {
    'contact_company': 1,
    'company_contact': 2,
    'deal_contact': 3,
    'contact_deal': 4,
    'deal_company': 5,
    'company_deal': 6,
    'ticket_contact': 15,
    'contact_ticket': 16
  };
  
  return defaults[key] || 1;
}

// Main
async function main() {
  const args = parseArgs(process.argv.slice(2));
  const command = args._[0];
  
  try {
    switch (command) {
      case 'list':
        if (args._.length < 4) {
          console.error('Error: Required: <from_type> <from_id> <to_type>');
          console.error('Usage: node associations.js list contacts 12345 companies');
          process.exit(1);
        }
        await listAssociations(args._[1], args._[2], args._[3], args);
        break;
      case 'create':
        if (args._.length < 5) {
          console.error('Error: Required: <from_type> <from_id> <to_type> <to_id>');
          console.error('Usage: node associations.js create contacts 12345 companies 67890');
          process.exit(1);
        }
        await createAssociation(args._[1], args._[2], args._[3], args._[4], args);
        break;
      case 'delete':
        if (args._.length < 5) {
          console.error('Error: Required: <from_type> <from_id> <to_type> <to_id>');
          console.error('Usage: node associations.js delete contacts 12345 companies 67890');
          process.exit(1);
        }
        await deleteAssociation(args._[1], args._[2], args._[3], args._[4], args);
        break;
      case 'types':
        await listAssociationTypes(args);
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
