#!/usr/bin/env node

/**
 * HubSpot Tickets Management
 * Create, read, update, delete, and search support tickets.
 */

import { fileURLToPath } from 'url';
import path from 'path';
import {
  loadEnv, getToken, parseArgs, apiRequest, apiRequestPaginated,
  searchRequest, confirmDestructiveAction, formatDate, handleError, showHelp
} from './utils.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
loadEnv(path.join(__dirname, '..'));

const OBJECT_TYPE = 'tickets';
const DEFAULT_PROPERTIES = ['subject', 'content', 'hs_ticket_priority', 'hs_pipeline_stage', 'hs_pipeline', 'createdate'];

// Help documentation
function printHelp() {
  showHelp('HubSpot Tickets', {
    'Commands': [
      'list                        List all tickets',
      'get <id>                    Get ticket by ID',
      'search <query>              Search tickets by subject',
      'create                      Create a new ticket',
      'update <id>                 Update a ticket',
      'delete <id>                 Delete a ticket (destructive)',
      'pipelines                   List ticket pipelines and stages',
      'help                        Show this help'
    ],
    'Options': [
      '--subject <text>            Ticket subject (required for create)',
      '--content <text>            Ticket description/content',
      '--priority <level>          Priority: LOW, MEDIUM, HIGH',
      '--stage <stage_id>          Pipeline stage ID',
      '--pipeline <pipeline_id>    Pipeline ID',
      '--contact <id>              Associate with contact',
      '--company <id>              Associate with company',
      '--properties <list>         Comma-separated properties to return',
      '--limit <n>                 Results per page (default: 100)',
      '--all                       Fetch all pages',
      '--verbose                   Show full API response',
      '--force                     Skip confirmation for delete'
    ],
    'Examples': [
      'node tickets.js list',
      'node tickets.js pipelines',
      'node tickets.js get 12345',
      'node tickets.js search "login issue"',
      'node tickets.js create --subject "Cannot login" --content "User reports..." --priority HIGH',
      'node tickets.js update 12345 --stage 2',
      'node tickets.js delete 12345'
    ]
  });
}

// List all tickets
async function listTickets(args) {
  const token = getToken();
  const limit = parseInt(args.limit) || 100;
  const all = args.all || false;
  const properties = args.properties ? args.properties.split(',') : DEFAULT_PROPERTIES;
  
  console.log('Fetching tickets...\n');
  
  const endpoint = `/crm/v3/objects/${OBJECT_TYPE}?properties=${properties.join(',')}`;
  const { results, meta } = await apiRequestPaginated(endpoint, token, { all, limit });
  
  if (args.verbose) {
    console.log(JSON.stringify(results, null, 2));
    return;
  }
  
  console.log(`Found ${meta.total} tickets${all ? '' : ' (page 1)'}:\n`);
  
  for (const ticket of results) {
    const props = ticket.properties;
    console.log(`- ${props.subject || 'No subject'}`);
    console.log(`  ID: ${ticket.id}`);
    console.log(`  Priority: ${props.hs_ticket_priority || 'N/A'}`);
    console.log(`  Stage: ${props.hs_pipeline_stage || 'N/A'}`);
    console.log(`  Created: ${formatDate(ticket.createdAt)}`);
    console.log('');
  }
}

// Get single ticket
async function getTicket(id, args) {
  const token = getToken();
  const properties = args.properties ? args.properties.split(',') : DEFAULT_PROPERTIES;
  
  const endpoint = `/crm/v3/objects/${OBJECT_TYPE}/${id}?properties=${properties.join(',')}`;
  const ticket = await apiRequest('GET', endpoint, token);
  
  if (args.verbose) {
    console.log(JSON.stringify(ticket, null, 2));
    return;
  }
  
  const props = ticket.properties;
  
  console.log(`Ticket: ${props.subject || 'No subject'}\n`);
  console.log(`ID: ${ticket.id}`);
  console.log(`Priority: ${props.hs_ticket_priority || 'N/A'}`);
  console.log(`Pipeline: ${props.hs_pipeline || 'N/A'}`);
  console.log(`Stage: ${props.hs_pipeline_stage || 'N/A'}`);
  if (props.content) console.log(`\nContent:\n${props.content}`);
  console.log(`\nCreated: ${formatDate(ticket.createdAt)}`);
  console.log(`Updated: ${formatDate(ticket.updatedAt)}`);
}

// Search tickets
async function searchTickets(query, args) {
  const token = getToken();
  const limit = parseInt(args.limit) || 100;
  const all = args.all || false;
  const properties = args.properties ? args.properties.split(',') : DEFAULT_PROPERTIES;
  
  console.log(`Searching for "${query}"...\n`);
  
  const filters = [{
    propertyName: 'subject',
    operator: 'CONTAINS_TOKEN',
    value: query
  }];
  
  const { results } = await searchRequest(OBJECT_TYPE, token, filters, { limit, properties, all });
  
  if (args.verbose) {
    console.log(JSON.stringify(results, null, 2));
    return;
  }
  
  console.log(`Found ${results.length} tickets:\n`);
  
  for (const ticket of results) {
    const props = ticket.properties;
    console.log(`- ${props.subject || 'No subject'}`);
    console.log(`  ID: ${ticket.id}`);
    console.log(`  Priority: ${props.hs_ticket_priority || 'N/A'}`);
    console.log('');
  }
}

// List pipelines
async function listPipelines(args) {
  const token = getToken();
  
  const data = await apiRequest('GET', '/crm/v3/pipelines/tickets', token);
  
  if (args.verbose) {
    console.log(JSON.stringify(data, null, 2));
    return;
  }
  
  console.log('Ticket Pipelines:\n');
  
  for (const pipeline of data.results) {
    console.log(`Pipeline: ${pipeline.label}`);
    console.log(`  ID: ${pipeline.id}`);
    console.log('  Stages:');
    for (const stage of pipeline.stages) {
      console.log(`    - ${stage.label} (${stage.id})`);
    }
    console.log('');
  }
}

// Create ticket
async function createTicket(args) {
  const token = getToken();
  
  if (!args.subject) {
    console.error('Error: --subject is required');
    process.exit(1);
  }
  
  const properties = {
    subject: args.subject
  };
  
  if (args.content) properties.content = args.content;
  if (args.priority) properties.hs_ticket_priority = args.priority.toUpperCase();
  if (args.stage) properties.hs_pipeline_stage = args.stage;
  if (args.pipeline) properties.hs_pipeline = args.pipeline;
  
  const ticket = await apiRequest('POST', `/crm/v3/objects/${OBJECT_TYPE}`, token, { properties });
  
  console.log('Ticket created successfully!');
  console.log(`ID: ${ticket.id}`);
  console.log(`Subject: ${ticket.properties.subject}\n`);
  
  // Associate with objects if specified
  const associations = [];
  if (args.contact) associations.push({ type: 'contacts', id: args.contact, typeId: 16 });
  if (args.company) associations.push({ type: 'companies', id: args.company, typeId: 26 });
  
  for (const assoc of associations) {
    try {
      const assocBody = [{
        associationCategory: 'HUBSPOT_DEFINED',
        associationTypeId: assoc.typeId
      }];
      await apiRequest('PUT', `/crm/v4/objects/tickets/${ticket.id}/associations/${assoc.type}/${assoc.id}`, token, assocBody);
      console.log(`Associated with ${assoc.type}/${assoc.id}`);
    } catch (error) {
      console.error(`Warning: Failed to associate with ${assoc.type}/${assoc.id}: ${error.message}`);
    }
  }
}

// Update ticket
async function updateTicket(id, args) {
  const token = getToken();
  
  const properties = {};
  
  if (args.subject) properties.subject = args.subject;
  if (args.content) properties.content = args.content;
  if (args.priority) properties.hs_ticket_priority = args.priority.toUpperCase();
  if (args.stage) properties.hs_pipeline_stage = args.stage;
  if (args.pipeline) properties.hs_pipeline = args.pipeline;
  
  if (Object.keys(properties).length === 0) {
    console.error('Error: No properties to update.');
    process.exit(1);
  }
  
  const ticket = await apiRequest('PATCH', `/crm/v3/objects/${OBJECT_TYPE}/${id}`, token, { properties });
  
  console.log('Ticket updated successfully!');
  console.log(`ID: ${ticket.id}`);
  console.log(`Updated properties: ${Object.keys(properties).join(', ')}`);
}

// Delete ticket
async function deleteTicket(id, args) {
  const token = getToken();
  
  const ticket = await apiRequest('GET', `/crm/v3/objects/${OBJECT_TYPE}/${id}?properties=subject`, token);
  const subject = ticket.properties.subject || id;
  
  const confirmed = await confirmDestructiveAction(
    `Delete ticket: ${subject}`,
    [`ID: ${id}`, 'This ticket will be permanently removed.'],
    args.force
  );
  
  if (!confirmed) return;
  
  await apiRequest('DELETE', `/crm/v3/objects/${OBJECT_TYPE}/${id}`, token);
  console.log('Ticket deleted successfully.');
}

// Main
async function main() {
  const args = parseArgs(process.argv.slice(2));
  const command = args._[0];
  
  try {
    switch (command) {
      case 'list': await listTickets(args); break;
      case 'get':
        if (!args._[1]) { console.error('Error: Ticket ID required'); process.exit(1); }
        await getTicket(args._[1], args); break;
      case 'search':
        if (!args._[1]) { console.error('Error: Search query required'); process.exit(1); }
        await searchTickets(args._[1], args); break;
      case 'pipelines': await listPipelines(args); break;
      case 'create': await createTicket(args); break;
      case 'update':
        if (!args._[1]) { console.error('Error: Ticket ID required'); process.exit(1); }
        await updateTicket(args._[1], args); break;
      case 'delete':
        if (!args._[1]) { console.error('Error: Ticket ID required'); process.exit(1); }
        await deleteTicket(args._[1], args); break;
      case 'help':
      default: printHelp();
    }
  } catch (error) {
    handleError(error, args.verbose);
  }
}

main();
