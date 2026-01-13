#!/usr/bin/env node
/**
 * Google Workspace Operations
 * Create, read, and edit Google Docs, Sheets, and Slides.
 * 
 * Usage:
 *   node workspace.js doc create --title "Meeting Notes" --account user@example.com
 *   node workspace.js sheet read SHEET_ID --range "A1:D10" --account user@example.com
 *   node workspace.js slides create --title "Q4 Presentation" --account user@example.com
 */

import { google } from 'googleapis';
import { getAuthClient } from './auth.js';
import {
  parseArgs,
  output,
  outputError,
  showHelp,
  detectAccountFromPath,
  GOOGLE_MIME_TYPES,
  requireApi
} from './utils.js';

/**
 * Get API instances
 */
async function getDocsApi(email) {
  const auth = await getAuthClient(email);
  return google.docs({ version: 'v1', auth });
}

async function getSheetsApi(email) {
  const auth = await getAuthClient(email);
  return google.sheets({ version: 'v4', auth });
}

async function getSlidesApi(email) {
  const auth = await getAuthClient(email);
  return google.slides({ version: 'v1', auth });
}

async function getDriveApi(email) {
  const auth = await getAuthClient(email);
  return google.drive({ version: 'v3', auth });
}

// ==================== DOCS ====================

/**
 * Create a new Google Doc
 */
async function createDoc(email, title, parentId = null) {
  const docs = await getDocsApi(email);
  const drive = await getDriveApi(email);
  
  // Create the document
  const docResponse = await docs.documents.create({
    requestBody: { title }
  });
  
  const docId = docResponse.data.documentId;
  
  // Move to parent folder if specified
  if (parentId) {
    const file = await drive.files.get({
      fileId: docId,
      fields: 'parents'
    });
    
    const previousParents = file.data.parents ? file.data.parents.join(',') : '';
    
    await drive.files.update({
      fileId: docId,
      addParents: parentId,
      removeParents: previousParents,
      fields: 'id, parents'
    });
  }
  
  return {
    id: docId,
    title: docResponse.data.title,
    url: `https://docs.google.com/document/d/${docId}/edit`
  };
}

/**
 * Read a Google Doc
 */
async function readDoc(email, docId) {
  const docs = await getDocsApi(email);
  
  const response = await docs.documents.get({
    documentId: docId
  });
  
  const doc = response.data;
  
  // Extract text content
  let text = '';
  if (doc.body && doc.body.content) {
    for (const element of doc.body.content) {
      if (element.paragraph && element.paragraph.elements) {
        for (const el of element.paragraph.elements) {
          if (el.textRun && el.textRun.content) {
            text += el.textRun.content;
          }
        }
      }
    }
  }
  
  return {
    id: doc.documentId,
    title: doc.title,
    text,
    revisionId: doc.revisionId
  };
}

/**
 * Append text to a Google Doc
 */
async function appendToDoc(email, docId, text) {
  const docs = await getDocsApi(email);
  
  // First get the document to find the end index
  const doc = await docs.documents.get({ documentId: docId });
  const endIndex = doc.data.body.content[doc.data.body.content.length - 1].endIndex - 1;
  
  const requests = [{
    insertText: {
      location: { index: endIndex },
      text: text
    }
  }];
  
  await docs.documents.batchUpdate({
    documentId: docId,
    requestBody: { requests }
  });
  
  return { appended: true, docId };
}

/**
 * Find and replace in a Google Doc
 */
async function findReplaceInDoc(email, docId, find, replace) {
  const docs = await getDocsApi(email);
  
  const requests = [{
    replaceAllText: {
      containsText: {
        text: find,
        matchCase: true
      },
      replaceText: replace
    }
  }];
  
  const response = await docs.documents.batchUpdate({
    documentId: docId,
    requestBody: { requests }
  });
  
  const replacements = response.data.replies[0].replaceAllText?.occurrencesChanged || 0;
  return { replacements, docId };
}

// ==================== SHEETS ====================

/**
 * Create a new Google Sheet
 */
async function createSheet(email, title, parentId = null) {
  const sheets = await getSheetsApi(email);
  const drive = await getDriveApi(email);
  
  const response = await sheets.spreadsheets.create({
    requestBody: {
      properties: { title }
    }
  });
  
  const sheetId = response.data.spreadsheetId;
  
  // Move to parent folder if specified
  if (parentId) {
    const file = await drive.files.get({
      fileId: sheetId,
      fields: 'parents'
    });
    
    const previousParents = file.data.parents ? file.data.parents.join(',') : '';
    
    await drive.files.update({
      fileId: sheetId,
      addParents: parentId,
      removeParents: previousParents,
      fields: 'id, parents'
    });
  }
  
  return {
    id: sheetId,
    title: response.data.properties.title,
    url: response.data.spreadsheetUrl,
    sheets: response.data.sheets.map(s => ({
      id: s.properties.sheetId,
      title: s.properties.title
    }))
  };
}

/**
 * Read data from a Google Sheet
 */
async function readSheet(email, sheetId, range = 'Sheet1') {
  const sheets = await getSheetsApi(email);
  
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: sheetId,
    range
  });
  
  return {
    range: response.data.range,
    values: response.data.values || []
  };
}

/**
 * Write data to a Google Sheet
 */
async function writeSheet(email, sheetId, range, values) {
  const sheets = await getSheetsApi(email);
  
  const response = await sheets.spreadsheets.values.update({
    spreadsheetId: sheetId,
    range,
    valueInputOption: 'USER_ENTERED',
    requestBody: { values }
  });
  
  return {
    updatedRange: response.data.updatedRange,
    updatedRows: response.data.updatedRows,
    updatedColumns: response.data.updatedColumns,
    updatedCells: response.data.updatedCells
  };
}

/**
 * Append rows to a Google Sheet
 */
async function appendSheet(email, sheetId, range, values) {
  const sheets = await getSheetsApi(email);
  
  const response = await sheets.spreadsheets.values.append({
    spreadsheetId: sheetId,
    range,
    valueInputOption: 'USER_ENTERED',
    insertDataOption: 'INSERT_ROWS',
    requestBody: { values }
  });
  
  return {
    updatedRange: response.data.updates.updatedRange,
    updatedRows: response.data.updates.updatedRows
  };
}

/**
 * Get sheet info
 */
async function getSheetInfo(email, sheetId) {
  const sheets = await getSheetsApi(email);
  
  const response = await sheets.spreadsheets.get({
    spreadsheetId: sheetId
  });
  
  return {
    id: response.data.spreadsheetId,
    title: response.data.properties.title,
    url: response.data.spreadsheetUrl,
    sheets: response.data.sheets.map(s => ({
      id: s.properties.sheetId,
      title: s.properties.title,
      rowCount: s.properties.gridProperties.rowCount,
      columnCount: s.properties.gridProperties.columnCount
    }))
  };
}

// ==================== SLIDES ====================

/**
 * Create a new Google Slides presentation
 */
async function createSlides(email, title, parentId = null) {
  const slides = await getSlidesApi(email);
  const drive = await getDriveApi(email);
  
  const response = await slides.presentations.create({
    requestBody: { title }
  });
  
  const presentationId = response.data.presentationId;
  
  // Move to parent folder if specified
  if (parentId) {
    const file = await drive.files.get({
      fileId: presentationId,
      fields: 'parents'
    });
    
    const previousParents = file.data.parents ? file.data.parents.join(',') : '';
    
    await drive.files.update({
      fileId: presentationId,
      addParents: parentId,
      removeParents: previousParents,
      fields: 'id, parents'
    });
  }
  
  return {
    id: presentationId,
    title: response.data.title,
    url: `https://docs.google.com/presentation/d/${presentationId}/edit`,
    slides: response.data.slides?.length || 0
  };
}

/**
 * Read a Google Slides presentation
 */
async function readSlides(email, presentationId) {
  const slides = await getSlidesApi(email);
  
  const response = await slides.presentations.get({
    presentationId
  });
  
  return {
    id: response.data.presentationId,
    title: response.data.title,
    slideCount: response.data.slides?.length || 0,
    slides: response.data.slides?.map((slide, i) => ({
      index: i,
      id: slide.objectId,
      elements: slide.pageElements?.length || 0
    })) || []
  };
}

/**
 * Add a new slide
 */
async function addSlide(email, presentationId, layoutId = null) {
  const slides = await getSlidesApi(email);
  
  const requests = [{
    createSlide: {
      insertionIndex: -1, // Add at end
      slideLayoutReference: layoutId ? { layoutId } : undefined
    }
  }];
  
  const response = await slides.presentations.batchUpdate({
    presentationId,
    requestBody: { requests }
  });
  
  const newSlideId = response.data.replies[0].createSlide.objectId;
  return { slideId: newSlideId, presentationId };
}

/**
 * Delete a slide
 */
async function deleteSlide(email, presentationId, slideId) {
  const slides = await getSlidesApi(email);
  
  const requests = [{
    deleteObject: { objectId: slideId }
  }];
  
  await slides.presentations.batchUpdate({
    presentationId,
    requestBody: { requests }
  });
  
  return { deleted: true, slideId };
}

// ==================== CLI ====================

function printHelp() {
  showHelp('Google Workspace Operations', {
    'Document Commands': [
      'doc create                 Create a new Google Doc',
      'doc read DOC_ID            Read document content',
      'doc append DOC_ID TEXT     Append text to document',
      'doc replace DOC_ID         Find and replace text'
    ],
    'Sheet Commands': [
      'sheet create               Create a new Google Sheet',
      'sheet read SHEET_ID        Read sheet data',
      'sheet write SHEET_ID       Write data to sheet',
      'sheet append SHEET_ID      Append rows to sheet',
      'sheet info SHEET_ID        Get sheet information'
    ],
    'Slides Commands': [
      'slides create              Create new presentation',
      'slides read PRESENTATION_ID  Read presentation info',
      'slides add-slide ID        Add a new slide',
      'slides delete-slide ID SLIDE_ID  Delete a slide'
    ],
    'Options': [
      '--account EMAIL            Google account (required)',
      '--title TITLE              Document/sheet/slides title',
      '--parent FOLDER_ID         Parent folder ID',
      '--range RANGE              Sheet range (e.g., "A1:D10")',
      '--values JSON              Data as JSON array',
      '--find TEXT                Text to find (for replace)',
      '--replace TEXT             Replacement text'
    ],
    'Examples': [
      'node workspace.js doc create --title "Notes" --account user@example.com',
      'node workspace.js doc read DOC_ID --account user@example.com',
      'node workspace.js sheet create --title "Budget" --account user@example.com',
      'node workspace.js sheet read SHEET_ID --range "A1:D10" --account user@example.com',
      'node workspace.js sheet write SHEET_ID --range "A1" --values \'[["A","B"],["1","2"]]\' --account user@example.com',
      'node workspace.js slides create --title "Presentation" --account user@example.com'
    ]
  });
}

async function main() {
  const { command, args, flags } = parseArgs();
  
  let email = flags.account;
  if (!email && args[0]) {
    email = detectAccountFromPath(args[0]);
  }
  
  if (command !== 'help' && !email) {
    console.error('Error: --account is required');
    process.exit(1);
  }
  
  // Check API is enabled based on command type
  if (command !== 'help') {
    if (command === 'doc') {
      requireApi(email, 'docs', 'workspace.js');
    } else if (command === 'sheet') {
      requireApi(email, 'sheets', 'workspace.js');
    } else if (command === 'slides') {
      requireApi(email, 'slides', 'workspace.js');
    }
  }
  
  try {
    // Parse compound commands like "doc create" or "sheet read"
    const [service, action] = command.includes(' ') ? command.split(' ') : [command, args[0]];
    const serviceArgs = command.includes(' ') ? args : args.slice(1);
    
    switch (service) {
      case 'doc':
        await handleDocCommand(email, action, serviceArgs, flags);
        break;
        
      case 'sheet':
        await handleSheetCommand(email, action, serviceArgs, flags);
        break;
        
      case 'slides':
        await handleSlidesCommand(email, action, serviceArgs, flags);
        break;
        
      case 'help':
      default:
        printHelp();
    }
  } catch (error) {
    outputError(error);
  }
}

async function handleDocCommand(email, action, args, flags) {
  switch (action) {
    case 'create': {
      if (!flags.title) throw new Error('--title required');
      const doc = await createDoc(email, flags.title, flags.parent);
      console.log(`\n✓ Created: ${doc.title}`);
      console.log(`  ID: ${doc.id}`);
      console.log(`  URL: ${doc.url}`);
      break;
    }
    
    case 'read': {
      if (!args[0]) throw new Error('DOC_ID required');
      const doc = await readDoc(email, args[0]);
      if (flags.json) {
        output(doc);
      } else {
        console.log(`\nTitle: ${doc.title}`);
        console.log(`ID: ${doc.id}`);
        console.log(`\n--- Content ---\n`);
        console.log(doc.text);
      }
      break;
    }
    
    case 'append': {
      if (!args[0]) throw new Error('DOC_ID required');
      if (!args[1]) throw new Error('Text to append required');
      await appendToDoc(email, args[0], args[1]);
      console.log(`\n✓ Text appended to document`);
      break;
    }
    
    case 'replace': {
      if (!args[0]) throw new Error('DOC_ID required');
      if (!flags.find) throw new Error('--find required');
      if (!flags.replace) throw new Error('--replace required');
      const result = await findReplaceInDoc(email, args[0], flags.find, flags.replace);
      console.log(`\n✓ Replaced ${result.replacements} occurrence(s)`);
      break;
    }
    
    default:
      console.error(`Unknown doc command: ${action}`);
      printHelp();
  }
}

async function handleSheetCommand(email, action, args, flags) {
  switch (action) {
    case 'create': {
      if (!flags.title) throw new Error('--title required');
      const sheet = await createSheet(email, flags.title, flags.parent);
      console.log(`\n✓ Created: ${sheet.title}`);
      console.log(`  ID: ${sheet.id}`);
      console.log(`  URL: ${sheet.url}`);
      break;
    }
    
    case 'read': {
      if (!args[0]) throw new Error('SHEET_ID required');
      const data = await readSheet(email, args[0], flags.range || 'Sheet1');
      if (flags.json) {
        output(data);
      } else {
        console.log(`\nRange: ${data.range}`);
        console.log(`Rows: ${data.values.length}\n`);
        for (const row of data.values) {
          console.log(row.join('\t'));
        }
      }
      break;
    }
    
    case 'write': {
      if (!args[0]) throw new Error('SHEET_ID required');
      if (!flags.range) throw new Error('--range required');
      if (!flags.values) throw new Error('--values required (JSON array)');
      const values = JSON.parse(flags.values);
      const result = await writeSheet(email, args[0], flags.range, values);
      console.log(`\n✓ Updated ${result.updatedCells} cell(s)`);
      break;
    }
    
    case 'append': {
      if (!args[0]) throw new Error('SHEET_ID required');
      if (!flags.values) throw new Error('--values required (JSON array)');
      const values = JSON.parse(flags.values);
      const result = await appendSheet(email, args[0], flags.range || 'Sheet1', values);
      console.log(`\n✓ Appended ${result.updatedRows} row(s)`);
      break;
    }
    
    case 'info': {
      if (!args[0]) throw new Error('SHEET_ID required');
      const info = await getSheetInfo(email, args[0]);
      output(info);
      break;
    }
    
    default:
      console.error(`Unknown sheet command: ${action}`);
      printHelp();
  }
}

async function handleSlidesCommand(email, action, args, flags) {
  switch (action) {
    case 'create': {
      if (!flags.title) throw new Error('--title required');
      const pres = await createSlides(email, flags.title, flags.parent);
      console.log(`\n✓ Created: ${pres.title}`);
      console.log(`  ID: ${pres.id}`);
      console.log(`  URL: ${pres.url}`);
      break;
    }
    
    case 'read': {
      if (!args[0]) throw new Error('PRESENTATION_ID required');
      const pres = await readSlides(email, args[0]);
      output(pres);
      break;
    }
    
    case 'add-slide': {
      if (!args[0]) throw new Error('PRESENTATION_ID required');
      const result = await addSlide(email, args[0], flags.layout);
      console.log(`\n✓ Added slide: ${result.slideId}`);
      break;
    }
    
    case 'delete-slide': {
      if (!args[0]) throw new Error('PRESENTATION_ID required');
      if (!args[1]) throw new Error('SLIDE_ID required');
      await deleteSlide(email, args[0], args[1]);
      console.log(`\n✓ Slide deleted`);
      break;
    }
    
    default:
      console.error(`Unknown slides command: ${action}`);
      printHelp();
  }
}

main();
