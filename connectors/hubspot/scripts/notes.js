#!/usr/bin/env node

/**
 * HubSpot Notes Management
 * Create, read, and delete notes associated with contacts/companies/deals.
 */

import { fileURLToPath } from 'url';
import path from 'path';
import {
  loadEnv, getToken, parseArgs, apiRequest, apiRequestPaginated,
  confirmDestructiveAction, formatDate, handleError, showHelp
} from './utils.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
loadEnv(path.join(__dirname, '..'));

const OBJECT_TYPE = 'notes';

// Help documentation
function printHelp() {
  showHelp('HubSpot Notes', {
    'Commands': [
      'list                        List all notes',
      'get <id>                    Get note by ID',
      'create                      Create a new note',
      'delete <id>                 Delete a note (destructive)',
      'help                        Show this help'
    ],
    'Options': [
      '--body <text>               Note content (required for create)',
      '--contact <id>              Associate with contact ID',
      '--company <id>              Associate with company ID',
      '--deal <id>                 Associate with deal ID',
      '--limit <n>                 Results per page (default: 100)',
      '--all                       Fetch all pages',
      '--verbose                   Show full API response',
      '--force                     Skip confirmation for delete'
    ],
    'Examples': [
      'node notes.js list',
      'node notes.js get 12345',
      'node notes.js create --body "Called and left voicemail" --contact 67890',
      'node notes.js create --body "Meeting notes" --deal 11111 --company 22222',
      'node notes.js delete 12345'
    ]
  });
}

// List all notes
async function listNotes(args) {
  const token = getToken();
  const limit = parseInt(args.limit) || 100;
  const all = args.all || false;
  
  console.log('Fetching notes...\n');
  
  const endpoint = `/crm/v3/objects/${OBJECT_TYPE}?properties=hs_note_body,hs_timestamp`;
  const { results, meta } = await apiRequestPaginated(endpoint, token, { all, limit });
  
  if (args.verbose) {
    console.log(JSON.stringify(results, null, 2));
    return;
  }
  
  console.log(`Found ${meta.total} notes${all ? '' : ' (page 1)'}:\n`);
  
  for (const note of results) {
    const body = note.properties.hs_note_body || 'No content';
    const preview = body.length > 80 ? body.substring(0, 80) + '...' : body;
    console.log(`- ${preview}`);
    console.log(`  ID: ${note.id}`);
    console.log(`  Created: ${formatDate(note.createdAt)}`);
    console.log('');
  }
}

// Get single note
async function getNote(id, args) {
  const token = getToken();
  
  const endpoint = `/crm/v3/objects/${OBJECT_TYPE}/${id}?properties=hs_note_body,hs_timestamp`;
  const note = await apiRequest('GET', endpoint, token);
  
  if (args.verbose) {
    console.log(JSON.stringify(note, null, 2));
    return;
  }
  
  console.log(`Note ID: ${note.id}\n`);
  console.log(`Content:\n${note.properties.hs_note_body || 'No content'}`);
  console.log(`\nCreated: ${formatDate(note.createdAt)}`);
  console.log(`Updated: ${formatDate(note.updatedAt)}`);
}

// Create note
async function createNote(args) {
  const token = getToken();
  
  if (!args.body) {
    console.error('Error: --body is required');
    process.exit(1);
  }
  
  const properties = {
    hs_note_body: args.body,
    hs_timestamp: new Date().toISOString()
  };
  
  // Create the note
  const note = await apiRequest('POST', `/crm/v3/objects/${OBJECT_TYPE}`, token, { properties });
  
  console.log('Note created successfully!');
  console.log(`ID: ${note.id}\n`);
  
  // Associate with objects if specified
  const associations = [];
  if (args.contact) associations.push({ type: 'contacts', id: args.contact, typeId: 202 });
  if (args.company) associations.push({ type: 'companies', id: args.company, typeId: 190 });
  if (args.deal) associations.push({ type: 'deals', id: args.deal, typeId: 214 });
  
  for (const assoc of associations) {
    try {
      const assocBody = [{
        associationCategory: 'HUBSPOT_DEFINED',
        associationTypeId: assoc.typeId
      }];
      await apiRequest('PUT', `/crm/v4/objects/notes/${note.id}/associations/${assoc.type}/${assoc.id}`, token, assocBody);
      console.log(`Associated with ${assoc.type}/${assoc.id}`);
    } catch (error) {
      console.error(`Warning: Failed to associate with ${assoc.type}/${assoc.id}: ${error.message}`);
    }
  }
}

// Delete note
async function deleteNote(id, args) {
  const token = getToken();
  
  // Get note info first
  const note = await apiRequest('GET', `/crm/v3/objects/${OBJECT_TYPE}/${id}?properties=hs_note_body`, token);
  const preview = (note.properties.hs_note_body || '').substring(0, 50);
  
  const confirmed = await confirmDestructiveAction(
    `Delete note: ${preview}...`,
    [
      `ID: ${id}`,
      'This note will be permanently removed.'
    ],
    args.force
  );
  
  if (!confirmed) return;
  
  await apiRequest('DELETE', `/crm/v3/objects/${OBJECT_TYPE}/${id}`, token);
  
  console.log('Note deleted successfully.');
}

// Main
async function main() {
  const args = parseArgs(process.argv.slice(2));
  const command = args._[0];
  
  try {
    switch (command) {
      case 'list':
        await listNotes(args);
        break;
      case 'get':
        if (!args._[1]) {
          console.error('Error: Note ID required');
          console.error('Usage: node notes.js get <id>');
          process.exit(1);
        }
        await getNote(args._[1], args);
        break;
      case 'create':
        await createNote(args);
        break;
      case 'delete':
        if (!args._[1]) {
          console.error('Error: Note ID required');
          console.error('Usage: node notes.js delete <id>');
          process.exit(1);
        }
        await deleteNote(args._[1], args);
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
