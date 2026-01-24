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
import { ensureDeps } from '../../../../connectors/shared/ensure-deps.js';
ensureDeps(import.meta.url);

// npm packages (dynamic import after dependency check)
const { google } = await import('googleapis');

// Built-in Node.js modules
import { readFileSync, existsSync } from 'fs';

// Local modules
import { getAuthClient } from './auth.js';
import { getFolderId, moveFile, exportFile, EXPORT_TYPES } from './drive.js';

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

// Parse CLI arguments
const args = process.argv.slice(2);

if (args.length === 0 || args.includes('--help') || args.includes('-h')) {
  showHelp();
}

const command = args[0];
let account = null;
let id = null;
let title = null;
let folder = null;
let range = null;
let data = null;
let format = null;
let output = null;
let jsonOutput = false;

for (let i = 1; i < args.length; i++) {
  switch (args[i]) {
    case '--account': account = args[++i]; break;
    case '--id': id = args[++i]; break;
    case '--title': title = args[++i]; break;
    case '--folder': folder = args[++i]; break;
    case '--range': range = args[++i]; break;
    case '--data': data = args[++i]; break;
    case '--format': format = args[++i]; break;
    case '--output': output = args[++i]; break;
    case '--json': jsonOutput = true; break;
  }
}

if (!account) {
  console.error('Error: --account is required');
  process.exit(1);
}

try {
  let result;
  
  switch (command) {
    case 'create':
      if (!title) {
        console.error('Error: --title is required for create');
        process.exit(1);
      }
      result = await createSheet(account, title, { folder, data });
      break;
      
    case 'read':
      if (!id) {
        console.error('Error: --id is required for read');
        process.exit(1);
      }
      result = await readSheet(account, id, range || 'A1:Z1000');
      break;
      
    case 'write':
      if (!id || !data) {
        console.error('Error: --id and --data are required for write');
        process.exit(1);
      }
      result = await writeSheet(account, id, range || 'A1', data);
      break;
      
    case 'append':
      if (!id || !data) {
        console.error('Error: --id and --data are required for append');
        process.exit(1);
      }
      result = await appendSheet(account, id, range || 'A1', data);
      break;
      
    case 'export':
      if (!id || !format || !output) {
        console.error('Error: --id, --format, and --output are required for export');
        process.exit(1);
      }
      result = await exportSheet(account, id, format, output);
      result = { exported: result };
      break;
      
    default:
      console.error(`Unknown command: ${command}`);
      showHelp();
  }
  
  if (jsonOutput) {
    console.log(JSON.stringify(result, null, 2));
  } else {
    if (result.url) {
      console.log(`\nSpreadsheet: ${result.title || result.id}`);
      console.log(`URL: ${result.url}`);
    } else if (result.values) {
      // Format as simple table
      result.values.forEach(row => {
        console.log(row.join('\t'));
      });
    } else if (result.exported) {
      console.log(`\nExported to: ${result.exported}`);
    } else if (result.updatedCells || result.updatedRows) {
      console.log(`\nUpdated: ${result.updatedCells || result.updatedRows} cells/rows`);
    }
  }
} catch (error) {
  console.error(`Error: ${error.message}`);
  process.exit(1);
}

