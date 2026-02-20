#!/usr/bin/env node
/**
 * Google Cloud Document AI Operations
 * Extract structured data from PDFs, invoices, forms, receipts, and contracts.
 *
 * Usage:
 *   node document-ai.js processors --account user@example.com
 *   node document-ai.js process ./invoice.pdf --processor PROCESSOR_ID --account user@example.com
 *   node document-ai.js extract-text ./document.pdf --account user@example.com
 *   node document-ai.js extract-entities ./invoice.pdf --processor PROCESSOR_ID --account user@example.com
 */

// Dependency check (must be first, before any npm imports)
import { ensureDeps } from '../../../system/shared/ensure-deps.js';
ensureDeps(import.meta.url);

// npm packages (dynamic import after dependency check)
const { google } = await import('googleapis');

// Built-in Node.js modules
import { readFileSync, existsSync } from 'fs';
import { extname } from 'path';

// Local modules
import { getAuthClient } from './auth.js';
import {
  parseArgs,
  output,
  outputError,
  showHelp,
  requireApi,
  loadEnvFile
} from './utils.js';

/**
 * Get Document AI API client
 */
async function getDocAiClient(email) {
  const auth = await getAuthClient(email);
  return google.documentai({ version: 'v1', auth });
}

/**
 * Get GCP project ID from env or credentials
 */
function getProjectId(flags) {
  if (flags.project) return flags.project;
  const env = loadEnvFile();
  if (env.GOOGLE_CLOUD_PROJECT) return env.GOOGLE_CLOUD_PROJECT;
  throw new Error(
    'Google Cloud project ID required.\n' +
    'Set GOOGLE_CLOUD_PROJECT in /memory/connectors/google/.env or use --project PROJECT_ID'
  );
}

/**
 * List available processors in the project
 */
async function listProcessors(email, projectId, location = 'us') {
  const client = await getDocAiClient(email);
  const parent = `projects/${projectId}/locations/${location}`;

  const response = await client.projects.locations.processors.list({ parent });
  return (response.data.processors || []).map(p => ({
    name: p.name,
    id: p.name.split('/').pop(),
    displayName: p.displayName,
    type: p.type,
    state: p.state,
    defaultProcessorVersion: p.defaultProcessorVersion
  }));
}

/**
 * Process a document and return the full result
 */
async function processDocument(email, filePath, processorId, projectId, location = 'us') {
  if (!existsSync(filePath)) {
    throw new Error(`File not found: ${filePath}`);
  }

  const client = await getDocAiClient(email);
  const fileContent = readFileSync(filePath);
  const base64Content = fileContent.toString('base64');
  const mimeType = detectMimeType(filePath);

  const processorName = `projects/${projectId}/locations/${location}/processors/${processorId}`;

  const response = await client.projects.locations.processors.process({
    name: processorName,
    requestBody: {
      rawDocument: {
        content: base64Content,
        mimeType
      }
    }
  });

  return response.data.document;
}

/**
 * Extract plain text from a document (no processor needed, uses OCR)
 */
async function extractText(email, filePath, projectId, location = 'us') {
  // Use the OCR processor type - list processors and find one, or use general purpose
  const processors = await listProcessors(email, projectId, location);
  const ocrProcessor = processors.find(p =>
    p.type === 'OCR_PROCESSOR' || p.type === 'FORM_PARSER_PROCESSOR' || p.state === 'ENABLED'
  );

  if (!ocrProcessor) {
    throw new Error(
      'No enabled processors found. Create an OCR processor in Google Cloud Console:\n' +
      `https://console.cloud.google.com/ai/document-ai/processors?project=${projectId}`
    );
  }

  const doc = await processDocument(email, filePath, ocrProcessor.id, projectId, location);
  return doc.text || '';
}

/**
 * Extract entities from a document using a specialized processor
 */
async function extractEntities(email, filePath, processorId, projectId, location = 'us') {
  const doc = await processDocument(email, filePath, processorId, projectId, location);

  const entities = (doc.entities || []).map(e => ({
    type: e.type,
    mentionText: e.mentionText,
    confidence: e.confidence ? (e.confidence * 100).toFixed(1) + '%' : null,
    normalizedValue: e.normalizedValue?.text || null,
    pageAnchor: e.pageAnchor?.pageRefs?.[0]?.page || null
  }));

  const pages = (doc.pages || []).map((p, i) => ({
    pageNumber: i + 1,
    width: p.dimension?.width,
    height: p.dimension?.height,
    detectedLanguages: (p.detectedLanguages || []).map(l => ({
      code: l.languageCode,
      confidence: l.confidence ? (l.confidence * 100).toFixed(1) + '%' : null
    }))
  }));

  return {
    text: doc.text,
    entities,
    pages,
    mimeType: doc.mimeType
  };
}

/**
 * Detect MIME type from file extension
 */
function detectMimeType(filePath) {
  const ext = extname(filePath).toLowerCase();
  const mimeTypes = {
    '.pdf': 'application/pdf',
    '.gif': 'image/gif',
    '.tiff': 'image/tiff',
    '.tif': 'image/tiff',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.bmp': 'image/bmp',
    '.webp': 'image/webp'
  };
  return mimeTypes[ext] || 'application/pdf';
}

// CLI
function printHelp() {
  showHelp('Google Cloud Document AI Operations', {
    'Setup Required': [
      '1. Enable Document AI API in Google Cloud Console',
      '2. Create a processor: https://console.cloud.google.com/ai/document-ai/processors',
      '3. Set GOOGLE_CLOUD_PROJECT in /memory/connectors/google/.env',
      '   GOOGLE_CLOUD_PROJECT=your-project-id'
    ],
    'Commands': [
      'processors                  List available Document AI processors',
      'process FILE                Process a document and return full structured data',
      'extract-text FILE           Extract plain text from a document (auto-selects processor)',
      'extract-entities FILE       Extract typed entities using a specialized processor',
      'help                        Show this help'
    ],
    'Options': [
      '--account EMAIL             Google account (required)',
      '--project ID                Google Cloud project ID (or set GOOGLE_CLOUD_PROJECT in .env)',
      '--processor ID              Processor ID (from processors command)',
      '--location REGION           Processor location: us or eu (default: us)',
      '--json                      Output as JSON'
    ],
    'Processor Types': [
      'OCR_PROCESSOR               Extract text from scanned documents',
      'FORM_PARSER_PROCESSOR       Extract form fields and tables',
      'INVOICE_PROCESSOR           Extract invoice fields (vendor, amounts, dates)',
      'EXPENSE_PROCESSOR           Extract receipt/expense data',
      'CONTRACT_PROCESSOR          Extract contract terms and parties',
      'ID_PROOFING_PROCESSOR       Extract identity document fields'
    ],
    'Supported Formats': [
      'PDF (recommended), JPEG, PNG, TIFF, GIF, BMP, WEBP'
    ],
    'Examples': [
      'node document-ai.js processors --account user@example.com',
      'node document-ai.js extract-text ./scanned.pdf --account user@example.com',
      'node document-ai.js process ./invoice.pdf --processor abc123 --account user@example.com',
      'node document-ai.js extract-entities ./invoice.pdf --processor abc123 --account user@example.com --json'
    ]
  });
}

async function main() {
  const { command, args, flags } = parseArgs();

  const email = flags.account;

  if (command !== 'help' && !email) {
    console.error('Error: --account is required');
    process.exit(1);
  }

  if (command !== 'help') {
    requireApi(email, 'document_ai', 'document-ai.js');
  }

  try {
    switch (command) {
      case 'processors': {
        const projectId = getProjectId(flags);
        const processors = await listProcessors(email, projectId, flags.location || 'us');
        if (flags.json) {
          output(processors);
        } else {
          console.log(`\nDocument AI Processors (${processors.length}):\n`);
          if (!processors.length) {
            console.log('  No processors found.');
            console.log(`  Create one at: https://console.cloud.google.com/ai/document-ai/processors?project=${projectId}`);
          }
          for (const p of processors) {
            console.log(`  [${p.state}] ${p.displayName}`);
            console.log(`    ID: ${p.id}`);
            console.log(`    Type: ${p.type}`);
            console.log('');
          }
        }
        break;
      }

      case 'process': {
        if (!args[0]) throw new Error('File path required');
        if (!flags.processor) throw new Error('--processor ID required (run processors command to list)');
        const projectId = getProjectId(flags);
        const doc = await processDocument(email, args[0], flags.processor, projectId, flags.location || 'us');
        output(doc);
        break;
      }

      case 'extract-text': {
        if (!args[0]) throw new Error('File path required');
        const projectId = getProjectId(flags);
        const text = await extractText(email, args[0], projectId, flags.location || 'us');
        if (flags.json) {
          output({ text });
        } else {
          console.log(text);
        }
        break;
      }

      case 'extract-entities': {
        if (!args[0]) throw new Error('File path required');
        if (!flags.processor) throw new Error('--processor ID required (run processors command to list)');
        const projectId = getProjectId(flags);
        const result = await extractEntities(email, args[0], flags.processor, projectId, flags.location || 'us');
        if (flags.json) {
          output(result);
        } else {
          console.log(`\nExtracted Entities (${result.entities.length}):\n`);
          for (const e of result.entities) {
            const conf = e.confidence ? ` (${e.confidence})` : '';
            const norm = e.normalizedValue ? ` -> ${e.normalizedValue}` : '';
            console.log(`  [${e.type}] ${e.mentionText}${norm}${conf}`);
          }
          if (result.text) {
            console.log(`\nFull text preview: ${result.text.slice(0, 200)}...`);
          }
        }
        break;
      }

      case 'help':
      default:
        printHelp();
    }
  } catch (error) {
    outputError(error);
  }
}

main();
