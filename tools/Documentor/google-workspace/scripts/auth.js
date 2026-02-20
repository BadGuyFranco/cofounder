#!/usr/bin/env node
/**
 * Google OAuth authentication - Uses Google Connector credentials
 * 
 * This module provides getAuthClient() for other Documentor scripts.
 * Credentials are managed by the centralized Google Connector.
 * 
 * Credential location: /memory/connectors/google/[email].json
 * Setup: See /cofounder/connectors/google/SETUP.md
 */

// Dependency check (must be first, before any npm imports)
import { ensureDeps } from '../../../../system/shared/ensure-deps.js';
ensureDeps(import.meta.url);

// npm packages (dynamic import after dependency check)
const { google } = await import('googleapis');

// Built-in Node.js modules
import { readFileSync, writeFileSync, existsSync, readdirSync, mkdirSync } from 'fs';
import { dirname, join, resolve } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Use Google Connector credential location
const CONNECTOR_BASE = resolve(__dirname, '..', '..', '..', '..', '..', 'memory', 'connectors', 'google');

// Fallback to legacy Documentor location for migration
const LEGACY_BASE = resolve(__dirname, '..', '..', '..', '..', '..', 'memory', 'Documentor', 'accounts', 'google');

/**
 * Migrate legacy account credentials into connector location.
 * Keeps runtime behavior backward compatible while reducing legacy reliance.
 */
function migrateLegacyAccount(email) {
  const connectorPath = join(CONNECTOR_BASE, `${email}.json`);
  const legacyPath = join(LEGACY_BASE, `${email}.json`);

  if (existsSync(connectorPath) || !existsSync(legacyPath)) {
    return connectorPath;
  }

  try {
    const legacyCredentials = JSON.parse(readFileSync(legacyPath, 'utf-8'));
    saveCredentials(email, legacyCredentials);
    console.log(`Note: Migrated legacy credentials for ${email} to Connector location.`);
    return connectorPath;
  } catch (error) {
    console.log(`Note: Legacy credential migration failed for ${email}; using legacy file.`);
    return legacyPath;
  }
}

/**
 * Get path to account credentials file
 * Checks Connector location first, then legacy Documentor location
 */
function getAccountPath(email) {
  const connectorPath = join(CONNECTOR_BASE, `${email}.json`);
  if (existsSync(connectorPath)) {
    return connectorPath;
  }
  
  // Fallback to legacy location
  const legacyPath = join(LEGACY_BASE, `${email}.json`);
  if (existsSync(legacyPath)) {
    return migrateLegacyAccount(email);
  }
  
  return connectorPath; // Return connector path for error messages
}

/**
 * Load credentials for an account
 */
function loadCredentials(email) {
  const accountPath = getAccountPath(email);
  if (!existsSync(accountPath)) {
    return null;
  }
  return JSON.parse(readFileSync(accountPath, 'utf-8'));
}

/**
 * Save credentials for an account (to Connector location)
 */
function saveCredentials(email, credentials) {
  if (!existsSync(CONNECTOR_BASE)) {
    mkdirSync(CONNECTOR_BASE, { recursive: true });
  }
  
  const accountPath = join(CONNECTOR_BASE, `${email}.json`);
  writeFileSync(accountPath, JSON.stringify(credentials, null, 2));
}

/**
 * List all configured accounts (from both locations)
 */
function listAccounts() {
  const accounts = new Set();
  
  // Check Connector location
  if (existsSync(CONNECTOR_BASE)) {
    readdirSync(CONNECTOR_BASE)
      .filter(f => f.endsWith('.json') && !f.startsWith('.'))
      .forEach(f => accounts.add(f.replace('.json', '')));
  }
  
  // Check legacy location
  if (existsSync(LEGACY_BASE)) {
    readdirSync(LEGACY_BASE)
      .filter(f => f.endsWith('.json') && !f.startsWith('.'))
      .forEach(f => accounts.add(f.replace('.json', '')));
  }
  
  return Array.from(accounts);
}

/**
 * Check if tokens are expired
 */
function isExpired(credentials) {
  if (!credentials.expiry) return true;
  const expiry = new Date(credentials.expiry);
  // Consider expired if less than 5 minutes remaining
  return expiry.getTime() - Date.now() < 5 * 60 * 1000;
}

const REDIRECT_PORT = 3847;
const REDIRECT_URI = `http://localhost:${REDIRECT_PORT}`;

/**
 * Create OAuth2 client
 */
function createOAuth2Client(credentials) {
  return new google.auth.OAuth2(
    credentials.client_id,
    credentials.client_secret,
    REDIRECT_URI
  );
}

/**
 * Get authenticated OAuth2 client for an account
 */
export async function getAuthClient(email) {
  const credentials = loadCredentials(email);
  
  if (!credentials) {
    throw new Error(
      `No credentials found for ${email}.\n\n` +
      `Set up Google credentials using the Connector:\n` +
      `  1. Follow /cofounder/connectors/google/SETUP.md\n` +
      `  2. Run: cd "/cofounder/connectors/google" && node scripts/auth.js setup --account ${email}`
    );
  }
  
  const oauth2Client = createOAuth2Client(credentials);
  
  oauth2Client.setCredentials({
    access_token: credentials.access_token,
    refresh_token: credentials.refresh_token
  });
  
  // Check if refresh needed
  if (isExpired(credentials)) {
    console.log(`Refreshing tokens for ${email}...`);
    try {
      const { credentials: newTokens } = await oauth2Client.refreshAccessToken();
      
      // Update stored credentials
      credentials.access_token = newTokens.access_token;
      if (newTokens.refresh_token) {
        credentials.refresh_token = newTokens.refresh_token;
      }
      credentials.expiry = newTokens.expiry_date 
        ? new Date(newTokens.expiry_date).toISOString()
        : new Date(Date.now() + 3600 * 1000).toISOString();
      
      // Save to Connector location
      saveCredentials(email, credentials);
      
      oauth2Client.setCredentials({
        access_token: credentials.access_token,
        refresh_token: credentials.refresh_token
      });
    } catch (error) {
      throw new Error(
        `Token refresh failed for ${email}.\n\n` +
        `Re-run setup using the Connector:\n` +
        `  cd "/cofounder/connectors/google" && node scripts/auth.js setup --account ${email}`
      );
    }
  }
  
  return oauth2Client;
}

// CLI - redirect to Connector
async function main() {
  console.log(`
Documentor now uses the Google Connector for authentication.

To set up or manage Google credentials:
  cd "/cofounder/connectors/google"
  node scripts/auth.js setup --account your@email.com

To check status:
  node scripts/auth.js status --account your@email.com

To list accounts:
  node scripts/auth.js list

See /cofounder/connectors/google/SETUP.md for full instructions.
`);
}

// Only run CLI if this is the main entry point
const __filename = fileURLToPath(import.meta.url);
const isMainModule = __filename === process.argv[1];
if (isMainModule) {
  main();
}
