#!/usr/bin/env node

/**
 * LinkedIn Shared Utilities
 * Common functions used across all LinkedIn scripts.
 */

// Dependency check (must be first, before any npm imports)
import { ensureDeps } from '../../../system/shared/ensure-deps.js';
ensureDeps(import.meta.url);

// Shared utilities
import { parseArgs } from '../../../system/shared/utils.js';

// Built-in Node.js modules
import path from 'path';
import fs from 'fs';
import readline from 'readline';
import { fileURLToPath } from 'url';

// npm packages (dynamic import after dependency check)
const dotenv = (await import('dotenv')).default;

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Detect memory directory dynamically from script location
// Script is at: .../GPT/cofounder/connectors/linkedin/scripts/utils.js
// Memory is at: .../GPT/memory/connectors/linkedin/
const MEMORY_DIR = path.join(__dirname, '..', '..', '..', '..', 'memory', 'connectors', 'linkedin');
const BASE_URL = 'https://api.linkedin.com/v2';
const REST_API_URL = 'https://api.linkedin.com/rest';

/**
 * Load environment variables from memory or local directory
 */
export function loadEnv(localDir) {
  const memoryEnvPath = path.join(MEMORY_DIR, '.env');
  const localEnvPath = path.join(localDir, '.env');
  
  if (fs.existsSync(memoryEnvPath)) {
    dotenv.config({ path: memoryEnvPath });
    return memoryEnvPath;
  } else if (fs.existsSync(localEnvPath)) {
    dotenv.config({ path: localEnvPath });
    return localEnvPath;
  } else {
    console.error('Error: No .env file found.');
    console.error('Create /memory/connectors/linkedin/.env with:');
    console.error('  LINKEDIN_ACCESS_TOKEN=your_access_token');
    console.error('  LINKEDIN_CLIENT_ID=your_client_id');
    console.error('  LINKEDIN_CLIENT_SECRET=your_client_secret');
    console.error('See SETUP.md for instructions.');
    process.exit(1);
  }
}

/**
 * Get API token from environment
 */
export function getToken() {
  const token = process.env.LINKEDIN_ACCESS_TOKEN;
  if (!token) {
    console.error('Error: LINKEDIN_ACCESS_TOKEN not found in environment.');
    console.error('Add it to /memory/connectors/linkedin/.env');
    console.error('Run: node scripts/auth.js flow to get a token');
    process.exit(1);
  }
  return token;
}

/**
 * Get client credentials
 */
export function getClientCredentials() {
  const clientId = process.env.LINKEDIN_CLIENT_ID;
  const clientSecret = process.env.LINKEDIN_CLIENT_SECRET;
  
  if (!clientId || !clientSecret) {
    console.error('Error: LINKEDIN_CLIENT_ID and LINKEDIN_CLIENT_SECRET required.');
    console.error('Add them to /memory/connectors/linkedin/.env');
    process.exit(1);
  }
  
  return { clientId, clientSecret };
}

// Re-export parseArgs from shared utils
export { parseArgs };

/**
 * Make API request to LinkedIn v2 API
 */
export async function apiRequest(method, endpoint, token, body = null, options = {}) {
  const { useRestApi = false, version = '202401' } = options;
  const baseUrl = useRestApi ? REST_API_URL : BASE_URL;
  const url = endpoint.startsWith('http') ? endpoint : `${baseUrl}${endpoint}`;
  
  const headers = {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
    'X-Restli-Protocol-Version': '2.0.0',
    'LinkedIn-Version': version
  };
  
  const requestOptions = {
    method,
    headers
  };
  
  if (body) {
    requestOptions.body = JSON.stringify(body);
  }
  
  const response = await fetch(url, requestOptions);
  
  // Handle 204 No Content
  if (response.status === 204) {
    return { success: true };
  }
  
  // Handle empty responses
  const text = await response.text();
  if (!text) {
    return { success: response.ok };
  }
  
  let data;
  try {
    data = JSON.parse(text);
  } catch (e) {
    data = { raw: text };
  }
  
  if (!response.ok) {
    const error = new Error(data.message || data.error || data.error_description || 'API request failed');
    error.status = response.status;
    error.data = data;
    throw error;
  }
  
  return data;
}

/**
 * Upload media to LinkedIn
 * Returns the asset URN
 */
export async function uploadMedia(token, filePath, ownerUrn, mediaType = 'IMAGE') {
  // Step 1: Register upload
  const registerBody = {
    registerUploadRequest: {
      recipes: [mediaType === 'VIDEO' ? 'urn:li:digitalmediaRecipe:feedshare-video' : 'urn:li:digitalmediaRecipe:feedshare-image'],
      owner: ownerUrn,
      serviceRelationships: [{
        relationshipType: 'OWNER',
        identifier: 'urn:li:userGeneratedContent'
      }]
    }
  };
  
  const registerResponse = await apiRequest('POST', '/assets?action=registerUpload', token, registerBody);
  
  const uploadUrl = registerResponse.value.uploadMechanism['com.linkedin.digitalmedia.uploading.MediaUploadHttpRequest'].uploadUrl;
  const asset = registerResponse.value.asset;
  
  // Step 2: Upload the file
  const fileBuffer = fs.readFileSync(filePath);
  
  const uploadResponse = await fetch(uploadUrl, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': mediaType === 'VIDEO' ? 'video/mp4' : 'image/jpeg'
    },
    body: fileBuffer
  });
  
  if (!uploadResponse.ok) {
    throw new Error(`Upload failed: ${uploadResponse.status}`);
  }
  
  return asset;
}

/**
 * Confirm destructive action with user
 */
export async function confirmDestructiveAction(message, details = null, forceFlag = false) {
  if (forceFlag) {
    console.log('WARNING: Bypassing confirmation with --force flag');
    return true;
  }
  
  console.log('');
  console.log('╔════════════════════════════════════════════════════════════════╗');
  console.log('║  ⚠️  DESTRUCTIVE ACTION WARNING                                 ║');
  console.log('╠════════════════════════════════════════════════════════════════╣');
  console.log(`║  ${message.padEnd(62)}║`);
  
  if (details) {
    for (const line of details) {
      console.log(`║    ${line.padEnd(60)}║`);
    }
  }
  
  console.log('╠════════════════════════════════════════════════════════════════╣');
  console.log('║  This action cannot be undone.                                 ║');
  console.log('║                                                                ║');
  console.log('║  Use --force to skip this confirmation in scripts.             ║');
  console.log('╚════════════════════════════════════════════════════════════════╝');
  console.log('');
  
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
  
  return new Promise((resolve) => {
    rl.question('Type "confirm" to proceed, anything else to cancel: ', (answer) => {
      rl.close();
      if (answer.toLowerCase() === 'confirm') {
        resolve(true);
      } else {
        console.log('Action cancelled.');
        resolve(false);
      }
    });
  });
}

/**
 * Format date for display
 */
export function formatDate(timestamp) {
  if (!timestamp) return 'N/A';
  const date = new Date(typeof timestamp === 'number' ? timestamp : parseInt(timestamp));
  return date.toLocaleString();
}

/**
 * Extract ID from LinkedIn URN
 * e.g., "urn:li:person:abc123" -> "abc123"
 */
export function extractIdFromUrn(urn) {
  if (!urn) return null;
  const parts = urn.split(':');
  return parts[parts.length - 1];
}

/**
 * Build a person URN
 */
export function buildPersonUrn(id) {
  return `urn:li:person:${id}`;
}

/**
 * Build an organization URN
 */
export function buildOrgUrn(id) {
  return `urn:li:organization:${id}`;
}

/**
 * Handle errors consistently
 */
export function handleError(error, verbose = false) {
  console.error('Error:', error.message);
  if (error.status) {
    console.error('Status:', error.status);
  }
  if (verbose && error.data) {
    console.error('Details:', JSON.stringify(error.data, null, 2));
  }
  process.exit(1);
}

/**
 * Display help for a command
 */
export function showHelp(commandName, sections) {
  console.log(`\n${commandName}\n${'='.repeat(commandName.length)}\n`);
  
  for (const [title, content] of Object.entries(sections)) {
    console.log(`${title}:`);
    if (Array.isArray(content)) {
      for (const line of content) {
        console.log(`  ${line}`);
      }
    } else {
      console.log(`  ${content}`);
    }
    console.log('');
  }
}

/**
 * Read a file safely
 */
export function readFileSafe(filePath) {
  if (!fs.existsSync(filePath)) {
    console.error(`Error: File not found: ${filePath}`);
    process.exit(1);
  }
  return fs.readFileSync(filePath);
}

export { MEMORY_DIR, BASE_URL, REST_API_URL };
