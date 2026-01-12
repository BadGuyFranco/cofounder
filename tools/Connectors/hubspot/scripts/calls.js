#!/usr/bin/env node

/**
 * HubSpot Calls Management
 * Log and manage phone call engagements.
 */

import { fileURLToPath } from 'url';
import path from 'path';
import {
  loadEnv, getToken, parseArgs, apiRequest, apiRequestPaginated,
  confirmDestructiveAction, formatDate, handleError, showHelp
} from './utils.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
loadEnv(path.join(__dirname, '..'));

const OBJECT_TYPE = 'calls';

// Help documentation
function printHelp() {
  showHelp('HubSpot Calls', {
    'Commands': [
      'list                        List all logged calls',
      'get <id>                    Get call by ID',
      'create                      Log a new call',
      'update <id>                 Update a call',
      'delete <id>                 Delete a call (destructive)',
      'help                        Show this help'
    ],
    'Options': [
      '--title <text>              Call title/subject',
      '--body <text>               Call notes/description',
      '--direction <dir>           INBOUND or OUTBOUND',
      '--status <status>           BUSY, CALLING_CRM_USER, CANCELED, COMPLETED,',
      '                            CONNECTING, FAILED, IN_PROGRESS, NO_ANSWER,',
      '                            QUEUED, RINGING',
      '--duration <ms>             Call duration in milliseconds',
      '--from <number>             From phone number',
      '--to <number>               To phone number',
      '--timestamp <datetime>      Call timestamp (ISO 8601)',
      '--contact <id>              Associate with contact',
      '--company <id>              Associate with company',
      '--deal <id>                 Associate with deal',
      '--limit <n>                 Results per page',
      '--all                       Fetch all pages',
      '--verbose                   Show full API response',
      '--force                     Skip confirmation for delete'
    ],
    'Examples': [
      'node calls.js list',
      'node calls.js get 12345',
      'node calls.js create --title "Sales call" --direction OUTBOUND --status COMPLETED --duration 300000 --contact 67890',
      'node calls.js create --body "Discussed pricing" --from "+15551234567" --to "+15559876543"',
      'node calls.js update 12345 --body "Updated notes"',
      'node calls.js delete 12345'
    ]
  });
}

// List all calls
async function listCalls(args) {
  const token = getToken();
  const limit = parseInt(args.limit) || 100;
  const all = args.all || false;
  
  console.log('Fetching calls...\n');
  
  const properties = 'hs_call_title,hs_call_body,hs_call_direction,hs_call_status,hs_call_duration,hs_timestamp';
  const endpoint = `/crm/v3/objects/${OBJECT_TYPE}?properties=${properties}`;
  const { results, meta } = await apiRequestPaginated(endpoint, token, { all, limit });
  
  if (args.verbose) {
    console.log(JSON.stringify(results, null, 2));
    return;
  }
  
  console.log(`Found ${meta.total} calls${all ? '' : ' (page 1)'}:\n`);
  
  for (const call of results) {
    const props = call.properties;
    const title = props.hs_call_title || props.hs_call_body?.substring(0, 50) || 'Untitled call';
    console.log(`- ${title}`);
    console.log(`  ID: ${call.id}`);
    console.log(`  Direction: ${props.hs_call_direction || 'N/A'}`);
    console.log(`  Status: ${props.hs_call_status || 'N/A'}`);
    if (props.hs_call_duration) {
      const mins = Math.round(parseInt(props.hs_call_duration) / 60000);
      console.log(`  Duration: ${mins} min`);
    }
    console.log(`  Time: ${formatDate(props.hs_timestamp || call.createdAt)}`);
    console.log('');
  }
}

// Get single call
async function getCall(id, args) {
  const token = getToken();
  
  const properties = 'hs_call_title,hs_call_body,hs_call_direction,hs_call_status,hs_call_duration,hs_call_from_number,hs_call_to_number,hs_timestamp';
  const endpoint = `/crm/v3/objects/${OBJECT_TYPE}/${id}?properties=${properties}`;
  const call = await apiRequest('GET', endpoint, token);
  
  if (args.verbose) {
    console.log(JSON.stringify(call, null, 2));
    return;
  }
  
  const props = call.properties;
  
  console.log(`Call: ${props.hs_call_title || 'Untitled'}\n`);
  console.log(`ID: ${call.id}`);
  console.log(`Direction: ${props.hs_call_direction || 'N/A'}`);
  console.log(`Status: ${props.hs_call_status || 'N/A'}`);
  if (props.hs_call_duration) {
    const mins = Math.round(parseInt(props.hs_call_duration) / 60000);
    console.log(`Duration: ${mins} minutes (${props.hs_call_duration}ms)`);
  }
  console.log(`From: ${props.hs_call_from_number || 'N/A'}`);
  console.log(`To: ${props.hs_call_to_number || 'N/A'}`);
  console.log(`Time: ${formatDate(props.hs_timestamp)}`);
  if (props.hs_call_body) console.log(`\nNotes:\n${props.hs_call_body}`);
  console.log(`\nCreated: ${formatDate(call.createdAt)}`);
}

// Create call
async function createCall(args) {
  const token = getToken();
  
  const properties = {
    hs_timestamp: args.timestamp || new Date().toISOString(),
    hs_call_status: args.status || 'COMPLETED'
  };
  
  if (args.title) properties.hs_call_title = args.title;
  if (args.body) properties.hs_call_body = args.body;
  if (args.direction) properties.hs_call_direction = args.direction.toUpperCase();
  if (args.duration) properties.hs_call_duration = args.duration;
  if (args.from) properties.hs_call_from_number = args.from;
  if (args.to) properties.hs_call_to_number = args.to;
  
  const call = await apiRequest('POST', `/crm/v3/objects/${OBJECT_TYPE}`, token, { properties });
  
  console.log('Call logged successfully!');
  console.log(`ID: ${call.id}\n`);
  
  // Associate with objects
  const associations = [];
  if (args.contact) associations.push({ type: 'contacts', id: args.contact, typeId: 194 });
  if (args.company) associations.push({ type: 'companies', id: args.company, typeId: 182 });
  if (args.deal) associations.push({ type: 'deals', id: args.deal, typeId: 206 });
  
  for (const assoc of associations) {
    try {
      const assocBody = [{ associationCategory: 'HUBSPOT_DEFINED', associationTypeId: assoc.typeId }];
      await apiRequest('PUT', `/crm/v4/objects/calls/${call.id}/associations/${assoc.type}/${assoc.id}`, token, assocBody);
      console.log(`Associated with ${assoc.type}/${assoc.id}`);
    } catch (error) {
      console.error(`Warning: Failed to associate: ${error.message}`);
    }
  }
}

// Update call
async function updateCall(id, args) {
  const token = getToken();
  
  const properties = {};
  if (args.title) properties.hs_call_title = args.title;
  if (args.body) properties.hs_call_body = args.body;
  if (args.direction) properties.hs_call_direction = args.direction.toUpperCase();
  if (args.status) properties.hs_call_status = args.status.toUpperCase();
  if (args.duration) properties.hs_call_duration = args.duration;
  
  if (Object.keys(properties).length === 0) {
    console.error('Error: No properties to update.');
    process.exit(1);
  }
  
  await apiRequest('PATCH', `/crm/v3/objects/${OBJECT_TYPE}/${id}`, token, { properties });
  console.log('Call updated successfully!');
}

// Delete call
async function deleteCall(id, args) {
  const token = getToken();
  
  const confirmed = await confirmDestructiveAction(
    `Delete call record`,
    [`ID: ${id}`, 'This call log will be permanently removed.'],
    args.force
  );
  
  if (!confirmed) return;
  
  await apiRequest('DELETE', `/crm/v3/objects/${OBJECT_TYPE}/${id}`, token);
  console.log('Call deleted successfully.');
}

// Main
async function main() {
  const args = parseArgs(process.argv.slice(2));
  const command = args._[0];
  
  try {
    switch (command) {
      case 'list': await listCalls(args); break;
      case 'get':
        if (!args._[1]) { console.error('Error: Call ID required'); process.exit(1); }
        await getCall(args._[1], args); break;
      case 'create': await createCall(args); break;
      case 'update':
        if (!args._[1]) { console.error('Error: Call ID required'); process.exit(1); }
        await updateCall(args._[1], args); break;
      case 'delete':
        if (!args._[1]) { console.error('Error: Call ID required'); process.exit(1); }
        await deleteCall(args._[1], args); break;
      case 'help':
      default: printHelp();
    }
  } catch (error) {
    handleError(error, args.verbose);
  }
}

main();
