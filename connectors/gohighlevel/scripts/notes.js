#!/usr/bin/env node

/**
 * Go High Level Notes Script
 * Manage notes for contacts.
 * 
 * Usage:
 *   node notes.js list --contact-id <id> --location "Name"
 *   node notes.js get <note-id> --contact-id <id> --location "Name"
 *   node notes.js create --contact-id <id> --body "Note content" --location "Name"
 *   node notes.js update <note-id> --contact-id <id> --body "Updated content" --location "Name"
 *   node notes.js delete <note-id> --contact-id <id> --location "Name"
 *   node notes.js locations
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

// List notes for a contact
async function listNotes(contactId, location, verbose) {
  const data = await apiRequest('GET', `/contacts/${contactId}/notes`, location.key);
  
  const notes = data.notes || [];
  console.log(`Found ${notes.length} notes:\n`);
  
  for (const note of notes) {
    console.log(`- [${formatDate(note.dateAdded)}]`);
    console.log(`  ID: ${note.id}`);
    console.log(`  ${note.body?.substring(0, 100) || '(empty)'}${note.body?.length > 100 ? '...' : ''}`);
    console.log('');
  }
  
  if (verbose) {
    console.log('\nFull response:');
    console.log(JSON.stringify(data, null, 2));
  }
  
  return notes;
}

// Get note details
async function getNote(noteId, contactId, location, verbose) {
  const data = await apiRequest('GET', `/contacts/${contactId}/notes/${noteId}`, location.key);
  
  const note = data.note || data;
  console.log(`Note ID: ${note.id}`);
  console.log(`Created: ${formatDate(note.dateAdded)}`);
  console.log(`Updated: ${formatDate(note.dateUpdated)}`);
  console.log('');
  console.log('Content:');
  console.log(note.body || '(empty)');
  
  if (verbose) {
    console.log('\nFull response:');
    console.log(JSON.stringify(data, null, 2));
  }
  
  return note;
}

// Create note
async function createNote(contactId, body, location, verbose) {
  const data = await apiRequest('POST', `/contacts/${contactId}/notes`, location.key, {
    body: body
  });
  
  console.log('Note created successfully!');
  console.log(`Note ID: ${data.note?.id || data.id}`);
  
  if (verbose) {
    console.log('\nFull response:');
    console.log(JSON.stringify(data, null, 2));
  }
  
  return data;
}

// Update note
async function updateNote(noteId, contactId, body, location, verbose) {
  const data = await apiRequest('PUT', `/contacts/${contactId}/notes/${noteId}`, location.key, {
    body: body
  });
  
  console.log(`Updated note: ${noteId}`);
  
  if (verbose) {
    console.log('\nFull response:');
    console.log(JSON.stringify(data, null, 2));
  }
  
  return data;
}

// Delete note
async function deleteNote(noteId, contactId, location, verbose, force = false) {
  // Get note preview for confirmation
  let notePreview = noteId;
  try {
    const noteData = await apiRequest('GET', `/contacts/${contactId}/notes/${noteId}`, location.key);
    const n = noteData.note || noteData;
    notePreview = n.body?.substring(0, 50) || '(empty)';
    if (n.body?.length > 50) notePreview += '...';
  } catch (e) {
    // Continue with ID only
  }
  
  const confirmed = await confirmDestructiveAction(
    'You are about to DELETE a note.',
    [
      `Note ID: ${noteId}`,
      `Contact ID: ${contactId}`,
      `Preview: "${notePreview}"`,
      '',
      'This action cannot be undone.'
    ],
    force
  );
  
  if (!confirmed) {
    process.exit(0);
  }
  
  const data = await apiRequest('DELETE', `/contacts/${contactId}/notes/${noteId}`, location.key);
  
  console.log(`Deleted note: ${noteId}`);
  
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
      case 'list': {
        const location = resolveLocation(args.location, locationsConfig);
        const contactId = args['contact-id'];
        
        if (!contactId) {
          console.error('Error: --contact-id is required');
          console.error('Usage: node notes.js list --contact-id <id> --location "Name"');
          process.exit(1);
        }
        
        await listNotes(contactId, location, verbose);
        break;
      }
      
      case 'get': {
        const location = resolveLocation(args.location, locationsConfig);
        const noteId = args._[1];
        const contactId = args['contact-id'];
        
        if (!noteId || !contactId) {
          console.error('Error: Note ID and --contact-id are required');
          console.error('Usage: node notes.js get <note-id> --contact-id <id> --location "Name"');
          process.exit(1);
        }
        
        await getNote(noteId, contactId, location, verbose);
        break;
      }
      
      case 'create': {
        const location = resolveLocation(args.location, locationsConfig);
        const contactId = args['contact-id'];
        const body = args.body || args.content || args.text;
        
        if (!contactId || !body) {
          console.error('Error: --contact-id and --body are required');
          console.error('Usage: node notes.js create --contact-id <id> --body "Note content" --location "Name"');
          process.exit(1);
        }
        
        await createNote(contactId, body, location, verbose);
        break;
      }
      
      case 'update': {
        const location = resolveLocation(args.location, locationsConfig);
        const noteId = args._[1];
        const contactId = args['contact-id'];
        const body = args.body || args.content || args.text;
        
        if (!noteId || !contactId || !body) {
          console.error('Error: Note ID, --contact-id, and --body are required');
          console.error('Usage: node notes.js update <note-id> --contact-id <id> --body "Updated content" --location "Name"');
          process.exit(1);
        }
        
        await updateNote(noteId, contactId, body, location, verbose);
        break;
      }
      
      case 'delete': {
        const location = resolveLocation(args.location, locationsConfig);
        const noteId = args._[1];
        const contactId = args['contact-id'];
        
        if (!noteId || !contactId) {
          console.error('Error: Note ID and --contact-id are required');
          console.error('Usage: node notes.js delete <note-id> --contact-id <id> --location "Name"');
          process.exit(1);
        }
        
        await deleteNote(noteId, contactId, location, verbose, args.force);
        break;
      }
      
      default:
        console.log('Go High Level Notes Script');
        console.log('');
        console.log('Commands:');
        console.log('  list --contact-id <id> --location     List notes for a contact');
        console.log('  get <note-id> --contact-id <id>       Get note details');
        console.log('  create --contact-id <id> --body       Create a new note');
        console.log('  update <note-id> --contact-id <id>    Update a note');
        console.log('  delete <note-id> --contact-id <id>    Delete a note');
        console.log('  locations                             List available locations');
        console.log('');
        console.log('Location Options:');
        console.log('  --location "Name"             Specify which GHL account to use');
        console.log('');
        console.log('Create/Update Options:');
        console.log('  --contact-id <id>             Contact ID (required)');
        console.log('  --body "Note content"         Note content (required)');
        console.log('');
        console.log('Global Options:');
        console.log('  --verbose                     Show full API responses');
        console.log('  --force                       Skip confirmation for destructive actions');
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
