#!/usr/bin/env node

/**
 * HubSpot Meetings Management
 * Log and manage meeting engagements.
 */

import { fileURLToPath } from 'url';
import path from 'path';
import {
  loadEnv, getToken, parseArgs, apiRequest, apiRequestPaginated,
  confirmDestructiveAction, formatDate, handleError, showHelp
} from './utils.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
loadEnv(path.join(__dirname, '..'));

const OBJECT_TYPE = 'meetings';

// Help documentation
function printHelp() {
  showHelp('HubSpot Meetings', {
    'Commands': [
      'list                        List all meetings',
      'get <id>                    Get meeting by ID',
      'create                      Log a new meeting',
      'update <id>                 Update a meeting',
      'delete <id>                 Delete a meeting (destructive)',
      'help                        Show this help'
    ],
    'Options': [
      '--title <text>              Meeting title',
      '--body <text>               Meeting notes/description',
      '--start <datetime>          Start time (ISO 8601)',
      '--end <datetime>            End time (ISO 8601)',
      '--outcome <outcome>         SCHEDULED, COMPLETED, RESCHEDULED,',
      '                            NO_SHOW, CANCELED',
      '--location <text>           Meeting location',
      '--contact <id>              Associate with contact',
      '--company <id>              Associate with company',
      '--deal <id>                 Associate with deal',
      '--limit <n>                 Results per page',
      '--all                       Fetch all pages',
      '--verbose                   Show full API response',
      '--force                     Skip confirmation for delete'
    ],
    'Examples': [
      'node meetings.js list',
      'node meetings.js get 12345',
      'node meetings.js create --title "Discovery call" --start "2024-01-20T10:00:00" --end "2024-01-20T11:00:00" --contact 67890',
      'node meetings.js update 12345 --outcome COMPLETED --body "Discussed requirements"',
      'node meetings.js delete 12345'
    ]
  });
}

// List all meetings
async function listMeetings(args) {
  const token = getToken();
  const limit = parseInt(args.limit) || 100;
  const all = args.all || false;
  
  console.log('Fetching meetings...\n');
  
  const properties = 'hs_meeting_title,hs_meeting_body,hs_meeting_outcome,hs_meeting_start_time,hs_meeting_end_time,hs_meeting_location';
  const endpoint = `/crm/v3/objects/${OBJECT_TYPE}?properties=${properties}`;
  const { results, meta } = await apiRequestPaginated(endpoint, token, { all, limit });
  
  if (args.verbose) {
    console.log(JSON.stringify(results, null, 2));
    return;
  }
  
  console.log(`Found ${meta.total} meetings${all ? '' : ' (page 1)'}:\n`);
  
  for (const meeting of results) {
    const props = meeting.properties;
    console.log(`- ${props.hs_meeting_title || 'Untitled meeting'}`);
    console.log(`  ID: ${meeting.id}`);
    console.log(`  Outcome: ${props.hs_meeting_outcome || 'N/A'}`);
    if (props.hs_meeting_start_time) {
      console.log(`  Time: ${formatDate(props.hs_meeting_start_time)} - ${formatDate(props.hs_meeting_end_time)}`);
    }
    if (props.hs_meeting_location) console.log(`  Location: ${props.hs_meeting_location}`);
    console.log('');
  }
}

// Get single meeting
async function getMeeting(id, args) {
  const token = getToken();
  
  const properties = 'hs_meeting_title,hs_meeting_body,hs_meeting_outcome,hs_meeting_start_time,hs_meeting_end_time,hs_meeting_location,hs_internal_meeting_notes';
  const endpoint = `/crm/v3/objects/${OBJECT_TYPE}/${id}?properties=${properties}`;
  const meeting = await apiRequest('GET', endpoint, token);
  
  if (args.verbose) {
    console.log(JSON.stringify(meeting, null, 2));
    return;
  }
  
  const props = meeting.properties;
  
  console.log(`Meeting: ${props.hs_meeting_title || 'Untitled'}\n`);
  console.log(`ID: ${meeting.id}`);
  console.log(`Outcome: ${props.hs_meeting_outcome || 'N/A'}`);
  console.log(`Start: ${formatDate(props.hs_meeting_start_time)}`);
  console.log(`End: ${formatDate(props.hs_meeting_end_time)}`);
  console.log(`Location: ${props.hs_meeting_location || 'N/A'}`);
  if (props.hs_meeting_body) console.log(`\nDescription:\n${props.hs_meeting_body}`);
  if (props.hs_internal_meeting_notes) console.log(`\nInternal Notes:\n${props.hs_internal_meeting_notes}`);
  console.log(`\nCreated: ${formatDate(meeting.createdAt)}`);
}

// Create meeting
async function createMeeting(args) {
  const token = getToken();
  
  const now = new Date();
  const oneHourLater = new Date(now.getTime() + 60 * 60 * 1000);
  
  const properties = {
    hs_timestamp: now.toISOString(),
    hs_meeting_start_time: args.start || now.toISOString(),
    hs_meeting_end_time: args.end || oneHourLater.toISOString(),
    hs_meeting_outcome: args.outcome || 'SCHEDULED'
  };
  
  if (args.title) properties.hs_meeting_title = args.title;
  if (args.body) properties.hs_meeting_body = args.body;
  if (args.location) properties.hs_meeting_location = args.location;
  
  const meeting = await apiRequest('POST', `/crm/v3/objects/${OBJECT_TYPE}`, token, { properties });
  
  console.log('Meeting created successfully!');
  console.log(`ID: ${meeting.id}\n`);
  
  // Associate with objects
  const associations = [];
  if (args.contact) associations.push({ type: 'contacts', id: args.contact, typeId: 200 });
  if (args.company) associations.push({ type: 'companies', id: args.company, typeId: 188 });
  if (args.deal) associations.push({ type: 'deals', id: args.deal, typeId: 212 });
  
  for (const assoc of associations) {
    try {
      const assocBody = [{ associationCategory: 'HUBSPOT_DEFINED', associationTypeId: assoc.typeId }];
      await apiRequest('PUT', `/crm/v4/objects/meetings/${meeting.id}/associations/${assoc.type}/${assoc.id}`, token, assocBody);
      console.log(`Associated with ${assoc.type}/${assoc.id}`);
    } catch (error) {
      console.error(`Warning: Failed to associate: ${error.message}`);
    }
  }
}

// Update meeting
async function updateMeeting(id, args) {
  const token = getToken();
  
  const properties = {};
  if (args.title) properties.hs_meeting_title = args.title;
  if (args.body) properties.hs_meeting_body = args.body;
  if (args.start) properties.hs_meeting_start_time = args.start;
  if (args.end) properties.hs_meeting_end_time = args.end;
  if (args.outcome) properties.hs_meeting_outcome = args.outcome.toUpperCase();
  if (args.location) properties.hs_meeting_location = args.location;
  
  if (Object.keys(properties).length === 0) {
    console.error('Error: No properties to update.');
    process.exit(1);
  }
  
  await apiRequest('PATCH', `/crm/v3/objects/${OBJECT_TYPE}/${id}`, token, { properties });
  console.log('Meeting updated successfully!');
}

// Delete meeting
async function deleteMeeting(id, args) {
  const token = getToken();
  
  const confirmed = await confirmDestructiveAction(
    `Delete meeting record`,
    [`ID: ${id}`, 'This meeting will be permanently removed.'],
    args.force
  );
  
  if (!confirmed) return;
  
  await apiRequest('DELETE', `/crm/v3/objects/${OBJECT_TYPE}/${id}`, token);
  console.log('Meeting deleted successfully.');
}

// Main
async function main() {
  const args = parseArgs(process.argv.slice(2));
  const command = args._[0];
  
  try {
    switch (command) {
      case 'list': await listMeetings(args); break;
      case 'get':
        if (!args._[1]) { console.error('Error: Meeting ID required'); process.exit(1); }
        await getMeeting(args._[1], args); break;
      case 'create': await createMeeting(args); break;
      case 'update':
        if (!args._[1]) { console.error('Error: Meeting ID required'); process.exit(1); }
        await updateMeeting(args._[1], args); break;
      case 'delete':
        if (!args._[1]) { console.error('Error: Meeting ID required'); process.exit(1); }
        await deleteMeeting(args._[1], args); break;
      case 'help':
      default: printHelp();
    }
  } catch (error) {
    handleError(error, args.verbose);
  }
}

main();
