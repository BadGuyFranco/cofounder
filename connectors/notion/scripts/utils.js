#!/usr/bin/env node

/**
 * Shared utilities for Notion connector scripts.
 */

// Dependency check (must be first, before any npm imports)
import { ensureDeps } from '../../../system/shared/ensure-deps.js';
ensureDeps(import.meta.url);

// npm packages (dynamic import after dependency check)
const { Client } = await import('@notionhq/client');
const dotenv = (await import('dotenv')).default;

// Built-in Node.js modules
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Detect memory directory dynamically from script location
// Script is at: .../GPT/cofounder/connectors/notion/scripts/utils.js
// Memory is at: .../GPT/memory/connectors/notion/
const memoryEnvPath = path.join(__dirname, '..', '..', '..', '..', 'memory', 'connectors', 'notion', '.env');
const localEnvPath = path.join(__dirname, '..', '.env');

export function loadConfig() {
  if (fs.existsSync(memoryEnvPath)) {
    dotenv.config({ path: memoryEnvPath });
  } else if (fs.existsSync(localEnvPath)) {
    dotenv.config({ path: localEnvPath });
  } else {
    console.error('Error: No .env file found.');
    console.error('Create /memory/connectors/notion/.env with your NOTION_API_KEY');
    console.error('See SETUP.md for instructions.');
    process.exit(1);
  }

  if (!process.env.NOTION_API_KEY) {
    console.error('Error: NOTION_API_KEY not found in environment.');
    console.error('Add NOTION_API_KEY=secret_xxx to your .env file.');
    process.exit(1);
  }
}

loadConfig();

export const notion = new Client({ auth: process.env.NOTION_API_KEY });

/**
 * Canonical credentials mapper.
 */
export function getCredentials(env = process.env) {
  const apiKey = env.NOTION_API_KEY;
  if (!apiKey) {
    console.error('Error: NOTION_API_KEY not found in environment.');
    console.error('Add NOTION_API_KEY=secret_xxx to your .env file.');
    process.exit(1);
  }
  return { apiKey };
}

/**
 * Parse command line arguments into { _: [], flags... }
 */
export function parseArgs(args = process.argv.slice(2)) {
  const result = { _: [] };
  let i = 0;

  while (i < args.length) {
    const arg = args[i];

    if (arg.startsWith('--')) {
      const key = arg.slice(2);
      const nextArg = args[i + 1];

      if (nextArg && !nextArg.startsWith('--')) {
        result[key] = nextArg;
        i += 2;
      } else {
        result[key] = true;
        i += 1;
      }
    } else {
      result._.push(arg);
      i += 1;
    }
  }

  return result;
}

/**
 * Canonical script initializer.
 */
export function initScript(showHelp) {
  const args = parseArgs();
  const command = args._[0] || 'help';

  if (command === 'help' || args.help || args._.length === 0) {
    showHelp();
    return null;
  }

  loadConfig();
  return { credentials: getCredentials(), args, command };
}

/**
 * Canonical REST helper for Notion API endpoints.
 */
export async function apiRequest(endpoint, options = {}) {
  const { method = 'GET', body, notionVersion = '2022-06-28' } = options;
  const { apiKey } = getCredentials();
  const url = endpoint.startsWith('http') ? endpoint : `https://api.notion.com/v1${endpoint}`;

  const response = await fetch(url, {
    method,
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Notion-Version': notionVersion,
      'Content-Type': 'application/json',
      ...(options.headers || {})
    },
    body: body ? JSON.stringify(body) : undefined
  });

  if (response.status === 204) {
    return { success: true };
  }

  const text = await response.text();
  const data = text ? JSON.parse(text) : null;

  if (!response.ok) {
    const error = new Error(data?.message || 'API request failed');
    error.status = response.status;
    error.data = data;
    throw error;
  }

  return data;
}

export function output(data) {
  console.log(JSON.stringify(data, null, 2));
}

export function outputError(error) {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`Error: ${message}`);
  process.exit(1);
}

/**
 * Standardized error output for Notion scripts.
 */
export function handleError(error, verbose) {
  console.error('Error:', error.message);
  if (error.code) {
    console.error('Code:', error.code);
  }
  if (verbose && error.body) {
    console.error('Details:', JSON.stringify(error.body, null, 2));
  }
  process.exit(1);
}
