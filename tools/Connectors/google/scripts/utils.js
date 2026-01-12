/**
 * Shared utilities for Google connector scripts.
 * Handles credential loading, argument parsing, and common operations.
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Memory directory for credentials
export const MEMORY_DIR = '/memory/Connectors/google';

// Fallback for development (relative to script location)
function getMemoryDir() {
  if (existsSync(MEMORY_DIR)) {
    return MEMORY_DIR;
  }
  // Fallback: look relative to cofounder root
  const fallback = join(__dirname, '..', '..', '..', '..', '..', 'memory', 'Connectors', 'google');
  return fallback;
}

/**
 * Load .env file for API keys
 * @returns {object} Parsed environment variables
 */
export function loadEnvFile() {
  const envPath = join(getMemoryDir(), '.env');
  
  if (!existsSync(envPath)) {
    return {};
  }
  
  const content = readFileSync(envPath, 'utf-8');
  const env = {};
  
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#')) {
      const eqIndex = trimmed.indexOf('=');
      if (eqIndex > 0) {
        const key = trimmed.slice(0, eqIndex).trim();
        const value = trimmed.slice(eqIndex + 1).trim();
        env[key] = value;
      }
    }
  }
  
  return env;
}

/**
 * Save .env file with API keys
 * @param {object} env - Environment variables to save
 */
export function saveEnvFile(env) {
  const memDir = getMemoryDir();
  if (!existsSync(memDir)) {
    mkdirSync(memDir, { recursive: true });
  }
  
  const envPath = join(memDir, '.env');
  const lines = Object.entries(env).map(([key, value]) => `${key}=${value}`);
  writeFileSync(envPath, lines.join('\n') + '\n');
}

/**
 * Get path to account credentials file
 * @param {string} email - Account email
 * @returns {string} Path to credentials file
 */
export function getAccountPath(email) {
  return join(getMemoryDir(), `${email}.json`);
}

/**
 * Load OAuth credentials for an account
 * @param {string} email - Account email
 * @returns {object|null} Credentials or null if not found
 */
export function loadCredentials(email) {
  const accountPath = getAccountPath(email);
  if (!existsSync(accountPath)) {
    return null;
  }
  return JSON.parse(readFileSync(accountPath, 'utf-8'));
}

/**
 * Save OAuth credentials for an account
 * @param {string} email - Account email
 * @param {object} credentials - Credentials to save
 */
export function saveCredentials(email, credentials) {
  const memDir = getMemoryDir();
  if (!existsSync(memDir)) {
    mkdirSync(memDir, { recursive: true });
  }
  
  const accountPath = getAccountPath(email);
  writeFileSync(accountPath, JSON.stringify(credentials, null, 2));
}

/**
 * List all configured OAuth accounts
 * @returns {string[]} Array of email addresses
 */
export function listAccounts() {
  const memDir = getMemoryDir();
  if (!existsSync(memDir)) {
    return [];
  }
  
  return readdirSync(memDir)
    .filter(f => f.endsWith('.json') && !f.startsWith('.'))
    .map(f => f.replace('.json', ''));
}

/**
 * Check if OAuth tokens are expired
 * @param {object} credentials - Credentials object
 * @returns {boolean} True if expired
 */
export function isExpired(credentials) {
  if (!credentials.expiry) return true;
  const expiry = new Date(credentials.expiry);
  // Consider expired if less than 5 minutes remaining
  return expiry.getTime() - Date.now() < 5 * 60 * 1000;
}

/**
 * Extract Google account email from a local file path
 * Parses paths like: /Users/.../GoogleDrive-user@example.com/Shared drives/...
 * @param {string} localPath - Local filesystem path
 * @returns {string|null} Email or null if not detected
 */
export function detectAccountFromPath(localPath) {
  const match = localPath.match(/GoogleDrive-([^\/\\]+)/);
  if (match) {
    return match[1];
  }
  return null;
}

/**
 * Determine if path is in a Shared Drive or My Drive
 * @param {string} localPath - Local filesystem path
 * @returns {object|null} { type: 'shared'|'mydrive', driveName?, relativePath }
 */
export function parseGoogleDrivePath(localPath) {
  const match = localPath.match(/GoogleDrive-[^\/\\]+[\/\\](.+)/);
  if (!match) {
    return null;
  }
  
  const pathAfterDrive = match[1];
  
  // Check for Shared drives
  const sharedMatch = pathAfterDrive.match(/^Shared drives[\/\\]([^\/\\]+)[\/\\]?(.*)/);
  if (sharedMatch) {
    return {
      type: 'shared',
      driveName: sharedMatch[1],
      relativePath: sharedMatch[2] || ''
    };
  }
  
  // Otherwise it's My Drive
  return {
    type: 'mydrive',
    relativePath: pathAfterDrive
  };
}

/**
 * Parse command line arguments
 * @param {string[]} args - Process arguments
 * @returns {object} { command, args, flags }
 */
export function parseArgs(args = process.argv.slice(2)) {
  const command = args[0] || 'help';
  const flags = {};
  const positional = [];
  
  for (let i = 1; i < args.length; i++) {
    if (args[i].startsWith('--')) {
      const key = args[i].slice(2);
      // Check if next arg is a value or another flag
      const nextArg = args[i + 1];
      if (nextArg && !nextArg.startsWith('--')) {
        flags[key] = nextArg;
        i++;
      } else {
        flags[key] = true;
      }
    } else if (args[i].startsWith('-') && args[i].length === 2) {
      // Short flag
      const key = args[i].slice(1);
      const nextArg = args[i + 1];
      if (nextArg && !nextArg.startsWith('-')) {
        flags[key] = nextArg;
        i++;
      } else {
        flags[key] = true;
      }
    } else {
      positional.push(args[i]);
    }
  }
  
  return { command, args: positional, flags };
}

/**
 * Format output consistently
 * @param {any} data - Data to output
 */
export function output(data) {
  if (typeof data === 'string') {
    console.log(data);
  } else {
    console.log(JSON.stringify(data, null, 2));
  }
}

/**
 * Format error consistently
 * @param {Error} error - Error to output
 */
export function outputError(error) {
  console.error(`Error: ${error.message}`);
  if (process.env.DEBUG) {
    console.error(error.stack);
  }
  process.exit(1);
}

/**
 * Show formatted help
 * @param {string} title - Script title
 * @param {object} sections - Help sections
 */
export function showHelp(title, sections) {
  console.log(`\n${title}\n`);
  
  for (const [sectionName, items] of Object.entries(sections)) {
    console.log(`${sectionName}:`);
    for (const item of items) {
      console.log(`  ${item}`);
    }
    console.log('');
  }
}

/**
 * Export MIME types for Google file exports
 */
export const EXPORT_TYPES = {
  // Google Docs
  pdf: 'application/pdf',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  txt: 'text/plain',
  html: 'text/html',
  rtf: 'application/rtf',
  odt: 'application/vnd.oasis.opendocument.text',
  
  // Google Sheets
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  csv: 'text/csv',
  ods: 'application/vnd.oasis.opendocument.spreadsheet',
  
  // Google Slides
  pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  odp: 'application/vnd.oasis.opendocument.presentation'
};

/**
 * Google file MIME types
 */
export const GOOGLE_MIME_TYPES = {
  doc: 'application/vnd.google-apps.document',
  sheet: 'application/vnd.google-apps.spreadsheet',
  slides: 'application/vnd.google-apps.presentation',
  folder: 'application/vnd.google-apps.folder',
  form: 'application/vnd.google-apps.form',
  drawing: 'application/vnd.google-apps.drawing'
};

/**
 * Get Gemini API key from env
 * @returns {string|null} API key or null
 */
export function getGeminiApiKey() {
  // Check process.env first (may be set externally)
  if (process.env.GOOGLE_AI_API_KEY) {
    return process.env.GOOGLE_AI_API_KEY;
  }
  
  // Load from .env file
  const env = loadEnvFile();
  return env.GOOGLE_AI_API_KEY || null;
}

/**
 * API groups organized by setup round
 */
export const API_ROUNDS = {
  round1: ['drive'],
  round2: ['docs', 'sheets', 'slides', 'gmail', 'youtube', 'youtube_analytics', 'youtube_reporting', 'calendar'],
  round3: ['ai', 'vertex', 'vision'],
  round4: ['cloud_run', 'cloud_functions', 'app_engine', 'cloud_build', 'api_keys', 'service_usage', 'resource_manager', 'iam']
};

/**
 * Mapping of API names to human-readable descriptions
 */
export const API_DESCRIPTIONS = {
  drive: 'Google Drive',
  docs: 'Google Docs',
  sheets: 'Google Sheets',
  slides: 'Google Slides',
  gmail: 'Gmail',
  youtube: 'YouTube Data',
  youtube_analytics: 'YouTube Analytics',
  youtube_reporting: 'YouTube Reporting',
  calendar: 'Google Calendar',
  ai: 'Gemini AI (Generative Language)',
  vertex: 'Vertex AI (Veo, Imagen)',
  vision: 'Cloud Vision',
  cloud_run: 'Cloud Run',
  cloud_functions: 'Cloud Functions',
  app_engine: 'App Engine',
  cloud_build: 'Cloud Build',
  api_keys: 'API Keys Management',
  service_usage: 'Service Usage',
  resource_manager: 'Cloud Resource Manager',
  iam: 'IAM'
};

/**
 * Default enabled APIs (all APIs)
 */
export const DEFAULT_ENABLED_APIS = {
  // Round 1
  drive: true,
  // Round 2
  docs: true,
  sheets: true,
  slides: true,
  gmail: true,
  youtube: true,
  youtube_analytics: true,
  youtube_reporting: true,
  calendar: true,
  // Round 3 (off by default - may require billing)
  ai: false,
  vertex: false,
  vision: false,
  // Round 4 (off by default - advanced)
  cloud_run: false,
  cloud_functions: false,
  app_engine: false,
  cloud_build: false,
  api_keys: false,
  service_usage: false,
  resource_manager: false,
  iam: false
};

/**
 * Check if a specific API is enabled for an account
 * @param {string} email - Account email
 * @param {string} apiName - API name to check (e.g., 'drive', 'gmail', 'ai')
 * @returns {boolean} True if enabled
 */
export function isApiEnabled(email, apiName) {
  const credentials = loadCredentials(email);
  if (!credentials) {
    return false;
  }
  
  // If no enabled_apis in credentials, assume defaults
  if (!credentials.enabled_apis) {
    return DEFAULT_ENABLED_APIS[apiName] ?? false;
  }
  
  return credentials.enabled_apis[apiName] ?? false;
}

/**
 * Get all enabled APIs for an account
 * @param {string} email - Account email
 * @returns {object} Object with API names as keys and boolean enabled status
 */
export function getEnabledApis(email) {
  const credentials = loadCredentials(email);
  if (!credentials || !credentials.enabled_apis) {
    return { ...DEFAULT_ENABLED_APIS };
  }
  return credentials.enabled_apis;
}

/**
 * Update enabled APIs for an account
 * @param {string} email - Account email
 * @param {object} enabledApis - Object with API names as keys and boolean enabled status
 */
export function updateEnabledApis(email, enabledApis) {
  const credentials = loadCredentials(email);
  if (!credentials) {
    throw new Error(`No credentials found for ${email}`);
  }
  
  credentials.enabled_apis = enabledApis;
  saveCredentials(email, credentials);
}

/**
 * Check API availability and exit with helpful message if not enabled
 * @param {string} email - Account email
 * @param {string} apiName - API name to check
 * @param {string} scriptName - Name of the script for error message
 */
export function requireApi(email, apiName, scriptName) {
  if (!isApiEnabled(email, apiName)) {
    const description = API_DESCRIPTIONS[apiName] || apiName;
    console.error(`\nError: ${description} API is not enabled for ${email}`);
    console.error(`\nTo enable it:`);
    console.error(`  1. Enable the API in Google Cloud Console`);
    console.error(`  2. Run: node auth.js configure-apis --account ${email}`);
    console.error(`\nOr run setup again: node auth.js setup --account ${email}`);
    process.exit(1);
  }
}

/**
 * Check multiple APIs and return which ones are missing
 * @param {string} email - Account email
 * @param {string[]} apiNames - Array of API names to check
 * @returns {string[]} Array of missing API names
 */
export function getMissingApis(email, apiNames) {
  return apiNames.filter(api => !isApiEnabled(email, api));
}

export default {
  MEMORY_DIR,
  loadEnvFile,
  saveEnvFile,
  getAccountPath,
  loadCredentials,
  saveCredentials,
  listAccounts,
  isExpired,
  detectAccountFromPath,
  parseGoogleDrivePath,
  parseArgs,
  output,
  outputError,
  showHelp,
  EXPORT_TYPES,
  GOOGLE_MIME_TYPES,
  getGeminiApiKey,
  API_ROUNDS,
  API_DESCRIPTIONS,
  DEFAULT_ENABLED_APIS,
  isApiEnabled,
  getEnabledApis,
  updateEnabledApis,
  requireApi,
  getMissingApis
};
