#!/usr/bin/env node

/**
 * Meetup OAuth Authentication
 * Handles OAuth 2.0 flow for getting access tokens.
 */

import { fileURLToPath } from 'url';
import path from 'path';
import http from 'http';
import fs from 'fs';
import {
  loadEnv, getClientCredentials, getToken, parseArgs, handleError, showHelp, 
  graphqlRequest, MEMORY_DIR, AUTH_URL, TOKEN_URL
} from './utils.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
loadEnv(path.join(__dirname, '..'));

// Default redirect URI - update this to match your OAuth client registration
const REDIRECT_URI = process.env.MEETUP_REDIRECT_URI || 'https://firststrategy.ai';

// Help documentation
function printHelp() {
  showHelp('Meetup Authentication', {
    'Commands': [
      'flow                        Start OAuth flow (opens browser)',
      'url                         Just print the authorization URL',
      'exchange <code>             Exchange auth code for token',
      'refresh                     Refresh existing token',
      'status                      Check current token status',
      'help                        Show this help'
    ],
    'Options': [
      '--port <port>               Callback port (default: 3000)',
      '--verbose                   Show full responses'
    ],
    'Examples': [
      'node auth.js flow',
      'node auth.js url',
      'node auth.js exchange YOUR_AUTH_CODE',
      'node auth.js refresh',
      'node auth.js status'
    ],
    'Notes': [
      'You must have a Meetup Pro subscription and OAuth Client.',
      'See SETUP.md for detailed instructions.',
      '',
      'OAuth Client management: https://www.meetup.com/api/oauth/list/'
    ]
  });
}

// Generate authorization URL
function getAuthUrl() {
  const { clientId } = getClientCredentials();
  
  const params = new URLSearchParams({
    response_type: 'code',
    client_id: clientId,
    redirect_uri: REDIRECT_URI,
    state: Math.random().toString(36).substring(7)
  });
  
  return `${AUTH_URL}?${params.toString()}`;
}

// Exchange authorization code for access token
async function exchangeCode(code, args) {
  const { clientId, clientSecret } = getClientCredentials();
  
  const params = new URLSearchParams({
    grant_type: 'authorization_code',
    code,
    redirect_uri: REDIRECT_URI,
    client_id: clientId,
    client_secret: clientSecret
  });
  
  const response = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: params.toString()
  });
  
  const data = await response.json();
  
  if (!response.ok) {
    const error = new Error(data.error_description || data.error || 'Token exchange failed');
    error.data = data;
    throw error;
  }
  
  if (args.verbose) {
    console.log(JSON.stringify(data, null, 2));
  }
  
  console.log('\n[OK] Token obtained successfully!\n');
  console.log(`Access Token: ${data.access_token.substring(0, 20)}...`);
  console.log(`Expires In: ${data.expires_in} seconds (${Math.round(data.expires_in / 60)} minutes)`);
  
  if (data.refresh_token) {
    console.log(`Refresh Token: ${data.refresh_token.substring(0, 20)}...`);
  }
  
  console.log('\n--- Add to /memory/connectors/meetup/.env ---');
  console.log(`MEETUP_ACCESS_TOKEN=${data.access_token}`);
  if (data.refresh_token) {
    console.log(`MEETUP_REFRESH_TOKEN=${data.refresh_token}`);
  }
  console.log('----------------------------------------------\n');
  
  return data;
}

// Refresh access token
async function refreshToken(args) {
  const { clientId, clientSecret } = getClientCredentials();
  const refreshTokenValue = process.env.MEETUP_REFRESH_TOKEN;
  
  if (!refreshTokenValue) {
    console.error('Error: MEETUP_REFRESH_TOKEN not found in environment.');
    console.error('You may need to re-authenticate with: node auth.js flow');
    process.exit(1);
  }
  
  const params = new URLSearchParams({
    grant_type: 'refresh_token',
    refresh_token: refreshTokenValue,
    client_id: clientId,
    client_secret: clientSecret
  });
  
  const response = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: params.toString()
  });
  
  const data = await response.json();
  
  if (!response.ok) {
    const error = new Error(data.error_description || data.error || 'Token refresh failed');
    error.data = data;
    throw error;
  }
  
  if (args.verbose) {
    console.log(JSON.stringify(data, null, 2));
  }
  
  console.log('\n[OK] Token refreshed successfully!\n');
  console.log(`New Access Token: ${data.access_token.substring(0, 20)}...`);
  console.log(`Expires In: ${data.expires_in} seconds (${Math.round(data.expires_in / 60)} minutes)`);
  
  console.log('\n--- Update in /memory/connectors/meetup/.env ---');
  console.log(`MEETUP_ACCESS_TOKEN=${data.access_token}`);
  if (data.refresh_token) {
    console.log(`MEETUP_REFRESH_TOKEN=${data.refresh_token}`);
  }
  console.log('------------------------------------------------\n');
  
  return data;
}

// Check token status using GraphQL
async function checkStatus(args) {
  let token;
  try {
    token = getToken();
  } catch {
    console.log('Status: No token configured');
    console.log('\nRun: node auth.js flow to get a token');
    return;
  }
  
  console.log('Checking token status...\n');
  
  try {
    // Query self to verify token works
    const query = `
      query {
        self {
          id
          name
          email
          isOrganizer
        }
      }
    `;
    
    const data = await graphqlRequest(query, {}, token);
    
    console.log('[OK] Token is valid\n');
    console.log(`Authenticated as: ${data.self.name}`);
    console.log(`Email: ${data.self.email || 'N/A'}`);
    console.log(`Member ID: ${data.self.id}`);
    console.log(`Is Organizer: ${data.self.isOrganizer ? 'Yes' : 'No'}`);
    
    if (args.verbose) {
      console.log('\nFull response:');
      console.log(JSON.stringify(data, null, 2));
    }
  } catch (error) {
    if (error.status === 401 || error.message.includes('Unauthorized')) {
      console.log('[X] Token is expired or invalid');
      console.log('\nRun: node auth.js refresh or node auth.js flow');
    } else {
      console.error('Error checking token:', error.message);
      if (args.verbose && error.errors) {
        console.error('Details:', JSON.stringify(error.errors, null, 2));
      }
    }
  }
}

// Start OAuth flow with local server
async function startOAuthFlow(args) {
  const port = parseInt(args.port) || 3000;
  const authUrl = getAuthUrl();
  
  console.log('\n=== Meetup OAuth Flow ===\n');
  console.log('1. Opening browser to authorize...');
  console.log('2. After authorizing, you will be redirected back here.\n');
  console.log('Authorization URL:');
  console.log(authUrl);
  console.log('');
  
  // Open browser
  const openCommand = process.platform === 'darwin' ? 'open' :
                      process.platform === 'win32' ? 'start' : 'xdg-open';
  
  const { exec } = await import('child_process');
  exec(`${openCommand} "${authUrl}"`);
  
  // Start local server to receive callback
  return new Promise((resolve, reject) => {
    const server = http.createServer(async (req, res) => {
      const url = new URL(req.url, `http://localhost:${port}`);
      
      if (url.pathname === '/callback') {
        const code = url.searchParams.get('code');
        const error = url.searchParams.get('error');
        
        if (error) {
          res.writeHead(400, { 'Content-Type': 'text/html' });
          res.end(`<html><body><h1>Error</h1><p>${error}</p></body></html>`);
          server.close();
          reject(new Error(error));
          return;
        }
        
        if (code) {
          res.writeHead(200, { 'Content-Type': 'text/html' });
          res.end(`<html><body>
            <h1>Authorization Successful!</h1>
            <p>You can close this window and return to the terminal.</p>
          </body></html>`);
          
          server.close();
          
          console.log('\n[OK] Authorization code received!\n');
          console.log('Exchanging code for access token...\n');
          
          try {
            const tokenData = await exchangeCode(code, args);
            resolve(tokenData);
          } catch (err) {
            reject(err);
          }
        }
      } else {
        res.writeHead(404);
        res.end('Not found');
      }
    });
    
    server.listen(port, () => {
      console.log(`Callback server listening on http://localhost:${port}/callback`);
      console.log('Waiting for authorization...\n');
    });
    
    // Timeout after 5 minutes
    setTimeout(() => {
      server.close();
      reject(new Error('OAuth flow timed out after 5 minutes'));
    }, 300000);
  });
}

// Main
async function main() {
  const args = parseArgs(process.argv.slice(2));
  const command = args._[0];
  
  try {
    switch (command) {
      case 'flow':
        await startOAuthFlow(args);
        break;
      case 'url':
        console.log('\nAuthorization URL:');
        console.log(getAuthUrl());
        console.log('\nOpen this URL in a browser, authorize, and note the "code" parameter from the redirect.');
        console.log('Then run: node auth.js exchange YOUR_CODE\n');
        break;
      case 'exchange':
        if (!args._[1]) {
          console.error('Error: Authorization code required');
          console.error('Usage: node auth.js exchange <code>');
          process.exit(1);
        }
        await exchangeCode(args._[1], args);
        break;
      case 'refresh':
        await refreshToken(args);
        break;
      case 'status':
        await checkStatus(args);
        break;
      case 'help':
      default:
        printHelp();
    }
  } catch (error) {
    handleError(error, args.verbose);
  }
}

main();
