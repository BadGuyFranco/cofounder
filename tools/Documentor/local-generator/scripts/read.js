#!/usr/bin/env node
/**
 * Extract text content from Word (.docx) or PDF documents.
 * 
 * Usage:
 *   node read.js document.docx
 *   node read.js document.pdf
 *   node read.js document.docx --json
 *   node read.js document.pdf --output extracted.txt
 */

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { extname } from 'path';
import { ensureDeps } from '../../../../system/shared/ensure-deps.js';

ensureDeps(import.meta.url);

const mammoth = (await import('mammoth')).default;

// pdf-parse is CommonJS, need dynamic import
const pdfParse = await import('pdf-parse').then(m => m.default || m);

/**
 * Extract text from Word document
 */
async function extractFromWord(filePath, options = {}) {
  const buffer = readFileSync(filePath);
  
  if (options.json) {
    // Get structured output
    const result = await mammoth.convertToHtml({ buffer });
    return {
      format: 'docx',
      text: (await mammoth.extractRawText({ buffer })).value,
      html: result.value,
      messages: result.messages
    };
  } else {
    // Plain text
    const result = await mammoth.extractRawText({ buffer });
    return result.value;
  }
}

/**
 * Extract text from PDF document
 */
async function extractFromPdf(filePath, options = {}) {
  const buffer = readFileSync(filePath);
  const data = await pdfParse(buffer);
  
  if (options.json) {
    return {
      format: 'pdf',
      text: data.text,
      pages: data.numpages,
      info: data.info,
      metadata: data.metadata
    };
  } else {
    return data.text;
  }
}

/**
 * Main extraction function
 */
async function readDocument(filePath, options = {}) {
  if (!existsSync(filePath)) {
    throw new Error(`File not found: ${filePath}`);
  }
  
  const ext = extname(filePath).toLowerCase();
  
  if (ext === '.docx') {
    return await extractFromWord(filePath, options);
  } else if (ext === '.pdf') {
    return await extractFromPdf(filePath, options);
  } else {
    throw new Error(`Unsupported file format: ${ext}. Use .docx or .pdf`);
  }
}

// CLI
function showHelp() {
  console.log(`
Extract text content from Word or PDF documents.

Usage:
  node read.js <input> [options]

Arguments:
  input               Input file path (.docx or .pdf)

Options:
  --json              Output structured JSON instead of plain text
  --output FILE       Write output to file instead of stdout
  --help, -h          Show this help message

Examples:
  node read.js report.docx
  node read.js document.pdf --json
  node read.js contract.docx --output extracted.txt
`);
  process.exit(0);
}

// Parse CLI arguments
const args = process.argv.slice(2);

if (args.length === 0 || args.includes('--help') || args.includes('-h')) {
  showHelp();
}

const inputPath = args[0];
let jsonOutput = args.includes('--json');
let outputPath = null;

for (let i = 1; i < args.length; i++) {
  if (args[i] === '--output' && args[i + 1]) {
    outputPath = args[++i];
  }
}

// Validate input extension
const ext = extname(inputPath).toLowerCase();
if (ext !== '.docx' && ext !== '.pdf') {
  console.error('Error: Input file must be .docx or .pdf');
  process.exit(1);
}

try {
  const result = await readDocument(inputPath, { json: jsonOutput });
  
  const output = jsonOutput ? JSON.stringify(result, null, 2) : result;
  
  if (outputPath) {
    writeFileSync(outputPath, output);
    console.log(`\nSuccess! Text extracted to: ${outputPath}`);
  } else {
    console.log(output);
  }
} catch (e) {
  console.error(`Error: ${e.message}`);
  process.exit(1);
}

