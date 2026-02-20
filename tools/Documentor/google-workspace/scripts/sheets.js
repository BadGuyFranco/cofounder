#!/usr/bin/env node
/**
 * Google Sheets operations: create, read, write, export.
 * 
 * Usage:
 *   node sheets.js create --title "My Sheet" --account user@example.com
 *   node sheets.js read --id SHEET_ID --range "A1:C10" --account user@example.com
 *   node sheets.js write --id SHEET_ID --range "A1" --data data.json --account user@example.com
 *   node sheets.js export --id SHEET_ID --format xlsx --output ./sheet.xlsx --account user@example.com
 */

// Dependency check (must be first, before any npm imports)
import { ensureDeps } from '../../../../system/shared/ensure-deps.js';
ensureDeps(import.meta.url);

// npm packages (dynamic import after dependency check)
const { google } = await import('googleapis');

// Built-in Node.js modules
import { readFileSync, existsSync } from 'fs';

// Local modules
import { getAuthClient } from './auth.js';
import { getFolderId, moveFile, exportFile, EXPORT_TYPES } from './drive.js';
import {
  parseCliArgs,
  hasHelpFlag,
  output,
  outputError,
  requireFlag
} from '../../../../system/shared/cli-utils.js';

/**
 * Get Sheets API instance
 */
async function getSheetsApi(email) {
  const auth = await getAuthClient(email);
  return google.sheets({ version: 'v4', auth });
}

/**
 * Get Drive API instance
 */
async function getDriveApi(email) {
  const auth = await getAuthClient(email);
  return google.drive({ version: 'v3', auth });
}

/**
 * Create a new Google Sheet
 */
export async function createSheet(email, title, options = {}) {
  const sheets = await getSheetsApi(email);
  
  // Create the spreadsheet
  const spreadsheet = await sheets.spreadsheets.create({
    requestBody: {
      properties: { title }
    }
  });
  
  const sheetId = spreadsheet.data.spreadsheetId;
  
  // Move to folder if specified
  if (options.folder) {
    const folderId = await getFolderId(email, options.folder);
    await moveFile(email, sheetId, folderId);
  }
  
  // Add initial data if specified
  if (options.data) {
    let values;
    if (existsSync(options.data)) {
      const content = readFileSync(options.data, 'utf-8');
      values = JSON.parse(content);
    } else if (Array.isArray(options.data)) {
      values = options.data;
    } else {
      values = JSON.parse(options.data);
    }
    
    await sheets.spreadsheets.values.update({
      spreadsheetId: sheetId,
      range: 'A1',
      valueInputOption: 'USER_ENTERED',
      requestBody: { values }
    });
  }
  
  return {
    id: sheetId,
    title: spreadsheet.data.properties.title,
    url: `https://docs.google.com/spreadsheets/d/${sheetId}/edit`
  };
}

/**
 * Read data from a Google Sheet
 */
export async function readSheet(email, sheetId, range = 'A1:Z1000') {
  const sheets = await getSheetsApi(email);
  
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: sheetId,
    range
  });
  
  // Get sheet info
  const info = await sheets.spreadsheets.get({
    spreadsheetId: sheetId,
    fields: 'properties.title'
  });
  
  return {
    id: sheetId,
    title: info.data.properties.title,
    range: response.data.range,
    values: response.data.values || [],
    url: `https://docs.google.com/spreadsheets/d/${sheetId}/edit`
  };
}

/**
 * Write data to a Google Sheet
 */
export async function writeSheet(email, sheetId, range, data) {
  const sheets = await getSheetsApi(email);
  
  let values;
  if (existsSync(data)) {
    const content = readFileSync(data, 'utf-8');
    values = JSON.parse(content);
  } else if (Array.isArray(data)) {
    values = data;
  } else {
    values = JSON.parse(data);
  }
  
  const response = await sheets.spreadsheets.values.update({
    spreadsheetId: sheetId,
    range,
    valueInputOption: 'USER_ENTERED',
    requestBody: { values }
  });
  
  return {
    id: sheetId,
    updatedRange: response.data.updatedRange,
    updatedRows: response.data.updatedRows,
    updatedColumns: response.data.updatedColumns,
    updatedCells: response.data.updatedCells
  };
}

/**
 * Append data to a Google Sheet
 */
export async function appendSheet(email, sheetId, range, data) {
  const sheets = await getSheetsApi(email);
  
  let values;
  if (existsSync(data)) {
    const content = readFileSync(data, 'utf-8');
    values = JSON.parse(content);
  } else if (Array.isArray(data)) {
    values = data;
  } else {
    values = JSON.parse(data);
  }
  
  const response = await sheets.spreadsheets.values.append({
    spreadsheetId: sheetId,
    range,
    valueInputOption: 'USER_ENTERED',
    insertDataOption: 'INSERT_ROWS',
    requestBody: { values }
  });
  
  return {
    id: sheetId,
    updatedRange: response.data.updates?.updatedRange,
    updatedRows: response.data.updates?.updatedRows
  };
}

/**
 * Export Google Sheet to local file
 */
export async function exportSheet(email, sheetId, format, outputPath) {
  const mimeType = EXPORT_TYPES[format.toLowerCase()];
  if (!mimeType) {
    throw new Error(`Unknown format: ${format}. Available: xlsx, csv, ods, pdf`);
  }
  
  return exportFile(email, sheetId, mimeType, outputPath);
}

// CLI
function showHelp() {
  console.log(`
Google Sheets operations: create, read, write, export.

Usage:
  node sheets.js <command> [options]

Commands:
  create    Create a new Google Sheet
  read      Read data from a Google Sheet
  write     Write data to a Google Sheet (overwrites range)
  append    Append data to a Google Sheet
  export    Export a Google Sheet to local file

Options:
  --account EMAIL    Google account email (required)
  --id SHEET_ID      Spreadsheet ID (required for read/write/append/export)
  --title TITLE      Spreadsheet title (required for create)
  --folder PATH      Folder path like "Shared drives/Work" (optional for create)
  --range RANGE      Cell range like "A1:C10" or "Sheet1!A1:C10"
  --data DATA        JSON array of arrays, or path to JSON file
  --format FORMAT    Export format: xlsx, csv, ods, pdf
  --output PATH      Output file path (required for export)
  --json             Output result as JSON
  --help, -h         Show this help message

Data Format:
  JSON array of arrays: [["Name", "Age"], ["Alice", 30], ["Bob", 25]]

Examples:
  node sheets.js create --title "Sales Data" --account user@example.com
  node sheets.js create --title "Report" --folder "Shared drives/Work" --data data.json --account user@example.com
  node sheets.js read --id abc123 --range "A1:D10" --account user@example.com
  node sheets.js write --id abc123 --range "A1" --data '[["Name","Value"],["Test",123]]' --account user@example.com
  node sheets.js append --id abc123 --range "A1" --data new_rows.json --account user@example.com
  node sheets.js export --id abc123 --format xlsx --output ./data.xlsx --account user@example.com
`);
  process.exit(0);
}

const { positional, flags } = parseCliArgs(process.argv.slice(2));
if (positional.length === 0 || hasHelpFlag(flags)) {
  showHelp();
}

const command = positional[0];
const account = flags.account;
const id = flags.id;
const title = flags.title;
const folder = flags.folder;
const range = flags.range;
const data = flags.data;
const format = flags.format;
const outputPath = flags.output;
const jsonOutput = Boolean(flags.json);

try {
  requireFlag(flags, 'account');

  let result;
  
  switch (command) {
    case 'create':
      requireFlag(flags, 'title', 'create');
      result = await createSheet(account, title, { folder, data });
      break;
      
    case 'read':
      requireFlag(flags, 'id', 'read');
      result = await readSheet(account, id, range || 'A1:Z1000');
      break;
      
    case 'write':
      requireFlag(flags, 'id', 'write');
      requireFlag(flags, 'data', 'write');
      result = await writeSheet(account, id, range || 'A1', data);
      break;
      
    case 'append':
      requireFlag(flags, 'id', 'append');
      requireFlag(flags, 'data', 'append');
      result = await appendSheet(account, id, range || 'A1', data);
      break;
      
    case 'export':
      requireFlag(flags, 'id', 'export');
      requireFlag(flags, 'format', 'export');
      requireFlag(flags, 'output', 'export');
      result = await exportSheet(account, id, format, outputPath);
      result = { exported: result };
      break;
      
    default:
      outputError(`Unknown command: ${command}`);
      showHelp();
  }
  
  output(result, {
    json: jsonOutput,
    formatter: (dataResult) => {
      if (dataResult.url) {
        console.log(`\nSpreadsheet: ${dataResult.title || dataResult.id}`);
        console.log(`URL: ${dataResult.url}`);
        return;
      }
      if (dataResult.values) {
        dataResult.values.forEach((row) => console.log(row.join('\t')));
        return;
      }
      if (dataResult.exported) {
        console.log(`\nExported to: ${dataResult.exported}`);
        return;
      }
      if (dataResult.updatedCells || dataResult.updatedRows) {
        console.log(`\nUpdated: ${dataResult.updatedCells || dataResult.updatedRows} cells/rows`);
      }
    }
  });
} catch (error) {
  outputError(error);
}

