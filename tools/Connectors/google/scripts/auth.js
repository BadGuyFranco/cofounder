#!/usr/bin/env node
/**
 * Google OAuth Authentication
 * Handles OAuth 2.0 flow for getting access tokens across all Google services.
 * 
 * Usage:
 *   node auth.js setup --account user@example.com --client-id ID --client-secret SECRET
 *   node auth.js status --account user@example.com
 *   node auth.js refresh --account user@example.com
 *   node auth.js list
 *   node auth.js scopes
 */

import { google } from 'googleapis';
import { createServer } from 'http';
import { URL, fileURLToPath } from 'url';
import { exec } from 'child_process';
import {
  loadCredentials,
  saveCredentials,
  listAccounts,
  isExpired,
  parseArgs,
  output,
  outputError,
  showHelp,
  API_ROUNDS,
  API_DESCRIPTIONS,
  DEFAULT_ENABLED_APIS,
  getEnabledApis,
  updateEnabledApis
} from './utils.js';

const REDIRECT_PORT = 3847;
const REDIRECT_URI = `http://localhost:${REDIRECT_PORT}`;

// Available OAuth scopes organized by service
const AVAILABLE_SCOPES = {
  // Drive & Files
  'drive': {
    scope: 'https://www.googleapis.com/auth/drive',
    description: 'Full Google Drive access (read, write, delete)'
  },
  'drive.file': {
    scope: 'https://www.googleapis.com/auth/drive.file',
    description: 'Access only to files created by this app'
  },
  'drive.readonly': {
    scope: 'https://www.googleapis.com/auth/drive.readonly',
    description: 'Read-only Drive access'
  },
  
  // Google Docs
  'documents': {
    scope: 'https://www.googleapis.com/auth/documents',
    description: 'Full Google Docs access'
  },
  'documents.readonly': {
    scope: 'https://www.googleapis.com/auth/documents.readonly',
    description: 'Read-only Google Docs access'
  },
  
  // Google Sheets
  'spreadsheets': {
    scope: 'https://www.googleapis.com/auth/spreadsheets',
    description: 'Full Google Sheets access'
  },
  'spreadsheets.readonly': {
    scope: 'https://www.googleapis.com/auth/spreadsheets.readonly',
    description: 'Read-only Google Sheets access'
  },
  
  // Google Slides
  'presentations': {
    scope: 'https://www.googleapis.com/auth/presentations',
    description: 'Full Google Slides access'
  },
  'presentations.readonly': {
    scope: 'https://www.googleapis.com/auth/presentations.readonly',
    description: 'Read-only Google Slides access'
  },
  
  // Gmail
  'gmail.modify': {
    scope: 'https://www.googleapis.com/auth/gmail.modify',
    description: 'Full Gmail access (read, write, delete)'
  },
  'gmail.readonly': {
    scope: 'https://www.googleapis.com/auth/gmail.readonly',
    description: 'Read-only Gmail access'
  },
  'gmail.send': {
    scope: 'https://www.googleapis.com/auth/gmail.send',
    description: 'Send emails only'
  },
  'gmail.compose': {
    scope: 'https://www.googleapis.com/auth/gmail.compose',
    description: 'Create and send emails'
  },
  
  // YouTube
  'youtube': {
    scope: 'https://www.googleapis.com/auth/youtube',
    description: 'Full YouTube account management'
  },
  'youtube.readonly': {
    scope: 'https://www.googleapis.com/auth/youtube.readonly',
    description: 'Read-only YouTube access'
  },
  'youtube.upload': {
    scope: 'https://www.googleapis.com/auth/youtube.upload',
    description: 'Upload YouTube videos'
  },
  'youtube.force-ssl': {
    scope: 'https://www.googleapis.com/auth/youtube.force-ssl',
    description: 'YouTube operations over SSL'
  },
  
  // Calendar
  'calendar': {
    scope: 'https://www.googleapis.com/auth/calendar',
    description: 'Full Google Calendar access'
  },
  'calendar.readonly': {
    scope: 'https://www.googleapis.com/auth/calendar.readonly',
    description: 'Read-only Calendar access'
  },
  'calendar.events': {
    scope: 'https://www.googleapis.com/auth/calendar.events',
    description: 'Manage calendar events only'
  }
};

// Default scopes for full functionality
const DEFAULT_SCOPES = [
  'drive',
  'documents',
  'spreadsheets',
  'presentations',
  'gmail.modify',
  'youtube',
  'youtube.upload',
  'calendar'
];

// Scope presets for common use cases
const SCOPE_PRESETS = {
  'full': DEFAULT_SCOPES,
  'drive-only': ['drive'],
  'workspace': ['drive', 'documents', 'spreadsheets', 'presentations'],
  'gmail-only': ['gmail.modify'],
  'gmail-readonly': ['gmail.readonly'],
  'youtube-only': ['youtube', 'youtube.upload'],
  'calendar-only': ['calendar'],
  'readonly': ['drive.readonly', 'documents.readonly', 'spreadsheets.readonly', 'presentations.readonly', 'gmail.readonly', 'youtube.readonly', 'calendar.readonly']
};

/**
 * Parse rounds string into array of round numbers
 * Supports: "1,2,3", "1-3", "all", "1,3-4"
 */
function parseRounds(roundsStr) {
  if (roundsStr === 'all') {
    return [1, 2, 3, 4];
  }
  
  const rounds = new Set();
  const parts = roundsStr.split(',');
  
  for (const part of parts) {
    const trimmed = part.trim();
    if (trimmed.includes('-')) {
      const [start, end] = trimmed.split('-').map(n => parseInt(n.trim()));
      for (let i = start; i <= end; i++) {
        if (i >= 1 && i <= 4) rounds.add(i);
      }
    } else {
      const num = parseInt(trimmed);
      if (num >= 1 && num <= 4) rounds.add(num);
    }
  }
  
  return Array.from(rounds).sort();
}

/**
 * Convert scope names to full URLs
 */
function scopeNamesToUrls(scopeNames) {
  return scopeNames.map(name => {
    if (AVAILABLE_SCOPES[name]) {
      return AVAILABLE_SCOPES[name].scope;
    }
    // If already a URL, use as-is
    if (name.startsWith('https://')) {
      return name;
    }
    throw new Error(`Unknown scope: ${name}`);
  });
}

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
 * Start local server to capture OAuth callback
 */
function startCallbackServer() {
  return new Promise((resolve, reject) => {
    const server = createServer((req, res) => {
      const url = new URL(req.url, `http://localhost:${REDIRECT_PORT}`);
      const code = url.searchParams.get('code');
      const error = url.searchParams.get('error');
      
      if (error) {
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end(`<html><body>
          <h1>Authorization Failed</h1>
          <p>Error: ${error}</p>
          <p>You can close this window.</p>
        </body></html>`);
        server.close();
        reject(new Error(`Authorization failed: ${error}`));
        return;
      }
      
      if (code) {
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end(`<html><body>
          <h1>Authorization Successful!</h1>
          <p>You can close this window and return to the terminal.</p>
        </body></html>`);
        server.close();
        resolve(code);
        return;
      }
      
      res.writeHead(404);
      res.end('Not found');
    });
    
    server.listen(REDIRECT_PORT, () => {
      console.log(`Listening for OAuth callback on port ${REDIRECT_PORT}...`);
    });
    
    server.on('error', (err) => {
      reject(new Error(`Failed to start callback server: ${err.message}`));
    });
    
    // Timeout after 5 minutes
    setTimeout(() => {
      server.close();
      reject(new Error('Authorization timed out after 5 minutes'));
    }, 5 * 60 * 1000);
  });
}

/**
 * Get authenticated OAuth2 client for an account
 * @param {string} email - Account email
 * @returns {Promise<OAuth2Client>} Authenticated client
 */
export async function getAuthClient(email) {
  const credentials = loadCredentials(email);
  
  if (!credentials) {
    throw new Error(`No credentials found for ${email}. Run: node auth.js setup --account ${email}`);
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
      
      saveCredentials(email, credentials);
      
      oauth2Client.setCredentials({
        access_token: credentials.access_token,
        refresh_token: credentials.refresh_token
      });
    } catch (error) {
      throw new Error(`Token refresh failed for ${email}. Re-run setup: node auth.js setup --account ${email}`);
    }
  }
  
  return oauth2Client;
}

/**
 * Setup new account credentials
 */
async function setupAccount(email, clientId, clientSecret, scopeNames, enabledRounds = null) {
  console.log(`\n=== Google OAuth Setup for ${email} ===\n`);
  
  if (!clientId || !clientSecret) {
    console.error('Error: --client-id and --client-secret are required for setup');
    console.error('\nGet these from Google Cloud Console:');
    console.error('1. Go to: https://console.cloud.google.com/apis/credentials');
    console.error('2. Create OAuth 2.0 Client ID (Desktop app type)');
    console.error('3. Copy Client ID and Client Secret');
    process.exit(1);
  }
  
  // Determine which APIs are enabled based on rounds
  const enabledApis = { ...DEFAULT_ENABLED_APIS };
  
  if (enabledRounds) {
    // Parse rounds string like "1,2,3" or "1-3" or "all"
    const rounds = parseRounds(enabledRounds);
    
    // Disable all first, then enable based on rounds
    for (const key of Object.keys(enabledApis)) {
      enabledApis[key] = false;
    }
    
    for (const round of rounds) {
      const apis = API_ROUNDS[`round${round}`];
      if (apis) {
        for (const api of apis) {
          enabledApis[api] = true;
        }
      }
    }
  }
  
  // Convert scope names to URLs
  const scopeUrls = scopeNamesToUrls(scopeNames);
  
  console.log('Scopes requested:');
  for (const name of scopeNames) {
    const info = AVAILABLE_SCOPES[name];
    if (info) {
      console.log(`  - ${name}: ${info.description}`);
    } else {
      console.log(`  - ${name}`);
    }
  }
  console.log('');
  
  const oauth2Client = new google.auth.OAuth2(
    clientId,
    clientSecret,
    REDIRECT_URI
  );
  
  const authUrl = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: scopeUrls,
    prompt: 'consent' // Force consent to get refresh token
  });
  
  console.log('Opening browser for authorization...\n');
  console.log('If browser does not open, visit this URL:');
  console.log(authUrl);
  console.log('');
  
  // Open browser
  const openCommand = process.platform === 'darwin' ? 'open' :
                      process.platform === 'win32' ? 'start' : 'xdg-open';
  
  exec(`${openCommand} "${authUrl}"`);
  
  // Wait for callback
  let code;
  try {
    code = await startCallbackServer();
  } catch (error) {
    console.error(`\nError: ${error.message}`);
    process.exit(1);
  }
  
  console.log('\n✓ Authorization code received!');
  console.log('Exchanging for access token...\n');
  
  try {
    const { tokens } = await oauth2Client.getToken(code);
    
    const credentials = {
      email,
      client_id: clientId,
      client_secret: clientSecret,
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      scopes: scopeNames,
      enabled_apis: enabledApis,
      expiry: tokens.expiry_date
        ? new Date(tokens.expiry_date).toISOString()
        : new Date(Date.now() + 3600 * 1000).toISOString()
    };
    
    saveCredentials(email, credentials);
    
    console.log(`✓ Credentials saved for ${email}`);
    console.log(`\nEnabled APIs:`);
    for (const [api, enabled] of Object.entries(enabledApis)) {
      if (enabled) {
        const desc = API_DESCRIPTIONS[api] || api;
        console.log(`  ✓ ${desc}`);
      }
    }
    console.log(`\nYou can now use Google services with --account ${email}`);
    console.log(`\nTo change enabled APIs later: node auth.js configure-apis --account ${email}`);
    
  } catch (error) {
    console.error(`\nError getting tokens: ${error.message}`);
    process.exit(1);
  }
}

/**
 * Generate auth URL without completing setup
 */
function generateAuthUrl(clientId, clientSecret, scopeNames) {
  if (!clientId || !clientSecret) {
    console.error('Error: --client-id and --client-secret are required');
    process.exit(1);
  }
  
  const scopeUrls = scopeNamesToUrls(scopeNames);
  
  const oauth2Client = new google.auth.OAuth2(
    clientId,
    clientSecret,
    REDIRECT_URI
  );
  
  const authUrl = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: scopeUrls,
    prompt: 'consent'
  });
  
  console.log(authUrl);
}

/**
 * Show status of an account
 */
function showStatus(email) {
  const credentials = loadCredentials(email);
  
  if (!credentials) {
    console.log(`\nNo credentials found for: ${email}`);
    console.log(`Run: node auth.js setup --account ${email}`);
    return;
  }
  
  const expired = isExpired(credentials);
  const expiry = credentials.expiry ? new Date(credentials.expiry) : null;
  
  console.log(`\nAccount: ${email}`);
  console.log(`Status: ${expired ? 'EXPIRED' : 'VALID'}`);
  console.log(`Expiry: ${expiry ? expiry.toLocaleString() : 'Unknown'}`);
  console.log(`Has refresh token: ${credentials.refresh_token ? 'Yes' : 'No'}`);
  
  if (credentials.scopes && credentials.scopes.length > 0) {
    console.log(`Scopes: ${credentials.scopes.join(', ')}`);
  }
  
  // Show enabled APIs
  const enabledApis = credentials.enabled_apis || DEFAULT_ENABLED_APIS;
  console.log(`\nEnabled APIs:`);
  for (const [round, apis] of Object.entries(API_ROUNDS)) {
    const roundNum = round.replace('round', '');
    const enabledInRound = apis.filter(api => enabledApis[api]);
    if (enabledInRound.length > 0) {
      console.log(`  Round ${roundNum}:`);
      for (const api of enabledInRound) {
        const desc = API_DESCRIPTIONS[api] || api;
        console.log(`    ✓ ${desc}`);
      }
    }
  }
  
  const disabledApis = Object.entries(enabledApis).filter(([_, enabled]) => !enabled).map(([api]) => api);
  if (disabledApis.length > 0) {
    console.log(`\nDisabled APIs: ${disabledApis.length}`);
    console.log(`  Run 'node auth.js configure-apis --account ${email}' to enable more`);
  }
}

/**
 * Configure which APIs are enabled for an account
 */
function configureApis(email, rounds, specificApis = null) {
  const credentials = loadCredentials(email);
  
  if (!credentials) {
    console.log(`\nNo credentials found for: ${email}`);
    console.log(`Run: node auth.js setup --account ${email}`);
    return;
  }
  
  const enabledApis = credentials.enabled_apis || { ...DEFAULT_ENABLED_APIS };
  
  if (rounds) {
    // Enable/disable by rounds
    const roundNums = parseRounds(rounds);
    
    // First disable all
    for (const key of Object.keys(enabledApis)) {
      enabledApis[key] = false;
    }
    
    // Then enable specified rounds
    for (const roundNum of roundNums) {
      const apis = API_ROUNDS[`round${roundNum}`];
      if (apis) {
        for (const api of apis) {
          enabledApis[api] = true;
        }
      }
    }
    
    console.log(`\nEnabled rounds: ${roundNums.join(', ')}`);
  }
  
  if (specificApis) {
    // Enable/disable specific APIs
    const apiList = specificApis.split(',').map(s => s.trim());
    for (const api of apiList) {
      if (api.startsWith('-')) {
        // Disable
        const apiName = api.slice(1);
        if (enabledApis.hasOwnProperty(apiName)) {
          enabledApis[apiName] = false;
          console.log(`  Disabled: ${API_DESCRIPTIONS[apiName] || apiName}`);
        }
      } else if (api.startsWith('+')) {
        // Enable
        const apiName = api.slice(1);
        if (enabledApis.hasOwnProperty(apiName)) {
          enabledApis[apiName] = true;
          console.log(`  Enabled: ${API_DESCRIPTIONS[apiName] || apiName}`);
        }
      } else {
        // Enable
        if (enabledApis.hasOwnProperty(api)) {
          enabledApis[api] = true;
          console.log(`  Enabled: ${API_DESCRIPTIONS[api] || api}`);
        }
      }
    }
  }
  
  credentials.enabled_apis = enabledApis;
  saveCredentials(email, credentials);
  
  console.log(`\n✓ API configuration saved for ${email}`);
  
  // Show summary
  const enabledCount = Object.values(enabledApis).filter(v => v).length;
  const totalCount = Object.keys(enabledApis).length;
  console.log(`\nEnabled: ${enabledCount}/${totalCount} APIs`);
}

/**
 * List available API rounds and their contents
 */
function listApiRounds() {
  console.log('\n=== API Rounds ===\n');
  
  console.log('Round 1 - Core (Free, no billing):');
  for (const api of API_ROUNDS.round1) {
    console.log(`  ${api.padEnd(20)} ${API_DESCRIPTIONS[api]}`);
  }
  
  console.log('\nRound 2 - Services (Free, no billing):');
  for (const api of API_ROUNDS.round2) {
    console.log(`  ${api.padEnd(20)} ${API_DESCRIPTIONS[api]}`);
  }
  
  console.log('\nRound 3 - AI (May require billing):');
  for (const api of API_ROUNDS.round3) {
    console.log(`  ${api.padEnd(20)} ${API_DESCRIPTIONS[api]}`);
  }
  
  console.log('\nRound 4 - Cloud Management (Requires billing):');
  for (const api of API_ROUNDS.round4) {
    console.log(`  ${api.padEnd(20)} ${API_DESCRIPTIONS[api]}`);
  }
  
  console.log('\nUsage:');
  console.log('  --rounds "1,2"              Enable rounds 1 and 2');
  console.log('  --rounds "1-3"              Enable rounds 1 through 3');
  console.log('  --rounds "all"              Enable all rounds');
  console.log('  --apis "+ai,-vision"        Enable ai, disable vision');
}

/**
 * Manually refresh tokens
 */
async function refreshTokens(email) {
  try {
    await getAuthClient(email);
    console.log(`\n✓ Tokens refreshed for ${email}`);
  } catch (error) {
    console.error(`\nError: ${error.message}`);
    process.exit(1);
  }
}

/**
 * Test all enabled APIs for an account
 */
async function testApis(email) {
  const credentials = loadCredentials(email);
  
  if (!credentials) {
    console.error(`\nNo credentials found for: ${email}`);
    console.error(`Run: node auth.js setup --account ${email}`);
    process.exit(1);
  }
  
  const enabledApis = credentials.enabled_apis || {};
  const results = [];
  
  console.log(`\n=== Testing APIs for ${email} ===\n`);
  
  // Get auth client
  let auth;
  try {
    auth = await getAuthClient(email);
  } catch (error) {
    console.error(`✗ OAuth authentication failed: ${error.message}`);
    process.exit(1);
  }
  console.log('✓ OAuth authentication valid\n');
  
  // Test Drive
  if (enabledApis.drive) {
    try {
      const drive = google.drive({ version: 'v3', auth });
      await drive.about.get({ fields: 'user' });
      console.log('✓ Google Drive');
      results.push({ api: 'drive', success: true });
    } catch (e) {
      console.log(`✗ Google Drive: ${e.message}`);
      results.push({ api: 'drive', success: false, error: e.message });
    }
  }
  
  // Test Docs
  if (enabledApis.docs) {
    try {
      const docs = google.docs({ version: 'v1', auth });
      // Just verify we can initialize - no simple "ping" endpoint
      console.log('✓ Google Docs (API initialized)');
      results.push({ api: 'docs', success: true });
    } catch (e) {
      console.log(`✗ Google Docs: ${e.message}`);
      results.push({ api: 'docs', success: false, error: e.message });
    }
  }
  
  // Test Sheets
  if (enabledApis.sheets) {
    try {
      const sheets = google.sheets({ version: 'v4', auth });
      console.log('✓ Google Sheets (API initialized)');
      results.push({ api: 'sheets', success: true });
    } catch (e) {
      console.log(`✗ Google Sheets: ${e.message}`);
      results.push({ api: 'sheets', success: false, error: e.message });
    }
  }
  
  // Test Slides
  if (enabledApis.slides) {
    try {
      const slides = google.slides({ version: 'v1', auth });
      console.log('✓ Google Slides (API initialized)');
      results.push({ api: 'slides', success: true });
    } catch (e) {
      console.log(`✗ Google Slides: ${e.message}`);
      results.push({ api: 'slides', success: false, error: e.message });
    }
  }
  
  // Test Gmail
  if (enabledApis.gmail) {
    try {
      const gmail = google.gmail({ version: 'v1', auth });
      await gmail.users.getProfile({ userId: 'me' });
      console.log('✓ Gmail');
      results.push({ api: 'gmail', success: true });
    } catch (e) {
      console.log(`✗ Gmail: ${e.message}`);
      results.push({ api: 'gmail', success: false, error: e.message });
    }
  }
  
  // Test YouTube
  if (enabledApis.youtube) {
    try {
      const youtube = google.youtube({ version: 'v3', auth });
      await youtube.channels.list({ part: ['id'], mine: true });
      console.log('✓ YouTube');
      results.push({ api: 'youtube', success: true });
    } catch (e) {
      console.log(`✗ YouTube: ${e.message}`);
      results.push({ api: 'youtube', success: false, error: e.message });
    }
  }
  
  // Test Calendar
  if (enabledApis.calendar) {
    try {
      const calendar = google.calendar({ version: 'v3', auth });
      await calendar.calendarList.list({ maxResults: 1 });
      console.log('✓ Google Calendar');
      results.push({ api: 'calendar', success: true });
    } catch (e) {
      console.log(`✗ Google Calendar: ${e.message}`);
      results.push({ api: 'calendar', success: false, error: e.message });
    }
  }
  
  // Test Gemini (separate API key)
  if (enabledApis.ai) {
    try {
      const { getGeminiApiKey } = await import('./utils.js');
      const apiKey = getGeminiApiKey();
      if (apiKey) {
        const { GoogleGenerativeAI } = await import('@google/generative-ai');
        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
        await model.generateContent('Say "test" in one word');
        console.log('✓ Gemini AI');
        results.push({ api: 'ai', success: true });
      } else {
        console.log('⚠ Gemini AI: No API key configured');
        results.push({ api: 'ai', success: false, error: 'No API key' });
      }
    } catch (e) {
      console.log(`✗ Gemini AI: ${e.message}`);
      results.push({ api: 'ai', success: false, error: e.message });
    }
  }
  
  // Summary
  const passed = results.filter(r => r.success).length;
  const failed = results.filter(r => !r.success).length;
  const total = results.length;
  
  console.log(`\n=== Results ===`);
  console.log(`Passed: ${passed}/${total}`);
  if (failed > 0) {
    console.log(`Failed: ${failed}/${total}`);
  }
  
  return results;
}

/**
 * List available scopes
 */
function listScopes() {
  console.log('\n=== Available Google OAuth Scopes ===\n');
  
  const categories = {
    'Drive & Files': ['drive', 'drive.file', 'drive.readonly'],
    'Google Docs': ['documents', 'documents.readonly'],
    'Google Sheets': ['spreadsheets', 'spreadsheets.readonly'],
    'Google Slides': ['presentations', 'presentations.readonly'],
    'Gmail': ['gmail.modify', 'gmail.readonly', 'gmail.send', 'gmail.compose'],
    'YouTube': ['youtube', 'youtube.readonly', 'youtube.upload', 'youtube.force-ssl'],
    'Calendar': ['calendar', 'calendar.readonly', 'calendar.events']
  };
  
  for (const [category, scopes] of Object.entries(categories)) {
    console.log(`${category}:`);
    for (const name of scopes) {
      const info = AVAILABLE_SCOPES[name];
      console.log(`  ${name.padEnd(25)} ${info.description}`);
    }
    console.log('');
  }
  
  console.log('=== Scope Presets ===\n');
  for (const [preset, scopes] of Object.entries(SCOPE_PRESETS)) {
    console.log(`  ${preset.padEnd(15)} ${scopes.join(', ')}`);
  }
  
  console.log('\nUsage:');
  console.log('  --scopes "drive,gmail.modify,calendar"');
  console.log('  --preset full');
  console.log('  --preset workspace');
}

// CLI
function printHelp() {
  showHelp('Google OAuth Authentication', {
    'Commands': [
      'setup                       Set up credentials for a new account',
      'test                        Test all enabled APIs for an account',
      'status                      Check status of an account\'s credentials',
      'refresh                     Manually refresh tokens for an account',
      'configure-apis              Configure which APIs are enabled for an account',
      'api-rounds                  List available API rounds',
      'list                        List all configured accounts',
      'scopes                      List available OAuth scopes',
      'url                         Generate authorization URL (no callback)',
      'help                        Show this help'
    ],
    'Options': [
      '--account EMAIL             Google account email (required for most commands)',
      '--client-id ID              OAuth Client ID (required for setup)',
      '--client-secret SECRET      OAuth Client Secret (required for setup)',
      '--scopes "scope1,scope2"    Comma-separated scope names',
      '--preset NAME               Use scope preset (full, workspace, gmail-only, etc.)',
      '--rounds "1,2,3"            API rounds enabled (for setup or configure-apis)',
      '--apis "+api,-api"          Enable/disable specific APIs'
    ],
    'Examples': [
      'node auth.js setup --account user@example.com --client-id "ID" --client-secret "SECRET"',
      'node auth.js setup --account user@example.com --client-id "ID" --client-secret "SECRET" --rounds "1,2"',
      'node auth.js configure-apis --account user@example.com --rounds "1,2,3"',
      'node auth.js configure-apis --account user@example.com --apis "+ai,+vertex"',
      'node auth.js status --account user@example.com',
      'node auth.js api-rounds'
    ],
    'API Rounds': [
      'Round 1   Core: Drive',
      'Round 2   Services: Docs, Sheets, Slides, Gmail, YouTube, Calendar',
      'Round 3   AI: Gemini, Vertex AI, Vision (may require billing)',
      'Round 4   Cloud: Run, Functions, App Engine, etc. (requires billing)'
    ],
    'Scope Presets': [
      'full          All scopes (default)',
      'workspace     Drive, Docs, Sheets, Slides',
      'drive-only    Just Google Drive',
      'gmail-only    Just Gmail',
      'youtube-only  YouTube and uploads',
      'calendar-only Just Calendar',
      'readonly      Read-only access to all services'
    ]
  });
}

async function main() {
  const { command, flags } = parseArgs();
  
  try {
    // Determine scopes to use
    let scopeNames = DEFAULT_SCOPES;
    if (flags.scopes) {
      scopeNames = flags.scopes.split(',').map(s => s.trim());
    } else if (flags.preset) {
      if (!SCOPE_PRESETS[flags.preset]) {
        console.error(`Unknown preset: ${flags.preset}`);
        console.error(`Available presets: ${Object.keys(SCOPE_PRESETS).join(', ')}`);
        process.exit(1);
      }
      scopeNames = SCOPE_PRESETS[flags.preset];
    }
    
    switch (command) {
      case 'setup':
        if (!flags.account) {
          console.error('Error: --account is required for setup');
          process.exit(1);
        }
        await setupAccount(
          flags.account,
          flags['client-id'],
          flags['client-secret'],
          scopeNames,
          flags.rounds || '1,2' // Default to rounds 1 and 2 (free APIs)
        );
        break;
        
      case 'url':
        generateAuthUrl(flags['client-id'], flags['client-secret'], scopeNames);
        break;
        
      case 'test':
        if (!flags.account) {
          console.error('Error: --account is required for test');
          process.exit(1);
        }
        await testApis(flags.account);
        break;
        
      case 'status':
        if (!flags.account) {
          console.error('Error: --account is required for status');
          process.exit(1);
        }
        showStatus(flags.account);
        break;
        
      case 'refresh':
        if (!flags.account) {
          console.error('Error: --account is required for refresh');
          process.exit(1);
        }
        await refreshTokens(flags.account);
        break;
        
      case 'configure-apis':
        if (!flags.account) {
          console.error('Error: --account is required for configure-apis');
          process.exit(1);
        }
        if (!flags.rounds && !flags.apis) {
          console.error('Error: --rounds or --apis is required');
          console.error('Example: node auth.js configure-apis --account user@example.com --rounds "1,2,3"');
          console.error('Example: node auth.js configure-apis --account user@example.com --apis "+ai,+vertex"');
          process.exit(1);
        }
        configureApis(flags.account, flags.rounds, flags.apis);
        break;
        
      case 'api-rounds':
        listApiRounds();
        break;
        
      case 'list': {
        const accounts = listAccounts();
        if (accounts.length === 0) {
          console.log('\nNo accounts configured.');
          console.log('Run: node auth.js setup --account your@email.com');
        } else {
          console.log('\nConfigured accounts:');
          for (const account of accounts) {
            const creds = loadCredentials(account);
            const expired = isExpired(creds);
            const status = expired ? '(expired)' : '(valid)';
            const apiCount = creds.enabled_apis 
              ? Object.values(creds.enabled_apis).filter(v => v).length 
              : 'unknown';
            console.log(`  - ${account} ${status} [${apiCount} APIs enabled]`);
          }
        }
        break;
      }
        
      case 'scopes':
        listScopes();
        break;
        
      case 'help':
      default:
        printHelp();
    }
  } catch (error) {
    outputError(error);
  }
}

// Only run main if this is the entry point
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main();
}
