#!/usr/bin/env node

/**
 * LinkedIn OAuth Authentication
 * Handles OAuth 2.0 flow for getting access tokens.
 */

import { fileURLToPath } from 'url';
import path from 'path';
import http from 'http';
import fs from 'fs';
import {
  loadEnv, getClientCredentials, parseArgs, handleError, showHelp, MEMORY_DIR
} from './utils.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
loadEnv(path.join(__dirname, '..'));

const REDIRECT_URI = 'http://localhost:3000/callback';

// Available scopes for LinkedIn
const AVAILABLE_SCOPES = {
  'openid': 'OpenID Connect (basic identity)',
  'profile': 'Read basic profile (name, photo)',
  'email': 'Read email address',
  'w_member_social': 'Create, modify, and delete posts as a member',
  'r_basicprofile': 'Read basic profile (legacy)',
  'r_liteprofile': 'Read lite profile info',
  'r_emailaddress': 'Read email address (legacy)',
  'r_organization_social': 'Read organization posts',
  'w_organization_social': 'Post to organization pages',
  'r_organization_admin': 'Read organization admin data',
  'rw_organization_admin': 'Read/write organization admin data',
  'r_ads': 'Read advertising data',
  'rw_ads': 'Read/write advertising data',
  'r_1st_connections_size': 'Read connection count',
  'r_ads_reporting': 'Read ads reporting data',
  'r_compliance': 'Read compliance data',
  'r_marketing_leadgen_automation': 'Lead gen automation read',
  'rw_dmp_segments': 'DMP segments'
};

// Default scopes for personal posting
const DEFAULT_SCOPES = ['openid', 'profile', 'email', 'w_member_social'];

// Help documentation
function printHelp() {
  showHelp('LinkedIn Authentication', {
    'Commands': [
      'flow                        Start OAuth flow (opens browser)',
      'url                         Just print the authorization URL',
      'exchange <code>             Exchange auth code for token',
      'refresh                     Refresh existing token',
      'status                      Check current token status',
      'scopes                      List available scopes',
      'help                        Show this help'
    ],
    'Options': [
      '--scopes <list>             Comma-separated scopes (default: openid,profile,email,w_member_social)',
      '--port <port>               Callback port (default: 3000)',
      '--verbose                   Show full responses'
    ],
    'Examples': [
      'node auth.js flow',
      'node auth.js flow --scopes "openid,profile,w_member_social,w_organization_social"',
      'node auth.js url --scopes "openid,profile,email,w_member_social"',
      'node auth.js exchange YOUR_AUTH_CODE',
      'node auth.js status'
    ],
    'Notes': [
      'You must have a LinkedIn App with the required products enabled.',
      'See SETUP.md for detailed instructions.',
      '',
      'Common scope combinations:',
      '  Personal posting: openid,profile,email,w_member_social',
      '  Company pages: add w_organization_social,r_organization_social',
      '  Full access: openid,profile,email,w_member_social,w_organization_social,r_organization_social'
    ]
  });
}

// List available scopes
function listScopes() {
  console.log('\nAvailable LinkedIn OAuth Scopes:\n');
  for (const [scope, description] of Object.entries(AVAILABLE_SCOPES)) {
    console.log(`  ${scope.padEnd(35)} ${description}`);
  }
  console.log('\nDefault scopes: ' + DEFAULT_SCOPES.join(', '));
  console.log('\nNote: Some scopes require specific LinkedIn products to be enabled for your app.');
}

// Generate authorization URL
function getAuthUrl(scopes = DEFAULT_SCOPES) {
  const { clientId } = getClientCredentials();
  
  const params = new URLSearchParams({
    response_type: 'code',
    client_id: clientId,
    redirect_uri: REDIRECT_URI,
    scope: scopes.join(' '),
    state: Math.random().toString(36).substring(7)
  });
  
  return `https://www.linkedin.com/oauth/v2/authorization?${params.toString()}`;
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
  
  const response = await fetch('https://www.linkedin.com/oauth/v2/accessToken', {
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
  
  console.log('\n✓ Token obtained successfully!\n');
  console.log(`Access Token: ${data.access_token.substring(0, 20)}...`);
  console.log(`Expires In: ${data.expires_in} seconds (${Math.round(data.expires_in / 86400)} days)`);
  
  if (data.refresh_token) {
    console.log(`Refresh Token: ${data.refresh_token.substring(0, 20)}...`);
    console.log(`Refresh Expires In: ${data.refresh_token_expires_in} seconds`);
  }
  
  console.log('\n--- Add to /memory/Connectors/linkedin/.env ---');
  console.log(`LINKEDIN_ACCESS_TOKEN=${data.access_token}`);
  if (data.refresh_token) {
    console.log(`LINKEDIN_REFRESH_TOKEN=${data.refresh_token}`);
  }
  console.log('----------------------------------------------\n');
  
  return data;
}

// Refresh access token
async function refreshToken(args) {
  const { clientId, clientSecret } = getClientCredentials();
  const refreshTokenValue = process.env.LINKEDIN_REFRESH_TOKEN;
  
  if (!refreshTokenValue) {
    console.error('Error: LINKEDIN_REFRESH_TOKEN not found in environment.');
    console.error('Refresh tokens are only available for certain LinkedIn products.');
    console.error('You may need to re-authenticate with: node auth.js flow');
    process.exit(1);
  }
  
  const params = new URLSearchParams({
    grant_type: 'refresh_token',
    refresh_token: refreshTokenValue,
    client_id: clientId,
    client_secret: clientSecret
  });
  
  const response = await fetch('https://www.linkedin.com/oauth/v2/accessToken', {
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
  
  console.log('\n✓ Token refreshed successfully!\n');
  console.log(`New Access Token: ${data.access_token.substring(0, 20)}...`);
  console.log(`Expires In: ${data.expires_in} seconds (${Math.round(data.expires_in / 86400)} days)`);
  
  console.log('\n--- Update in /memory/Connectors/linkedin/.env ---');
  console.log(`LINKEDIN_ACCESS_TOKEN=${data.access_token}`);
  if (data.refresh_token) {
    console.log(`LINKEDIN_REFRESH_TOKEN=${data.refresh_token}`);
  }
  console.log('------------------------------------------------\n');
  
  return data;
}

// Check token status
async function checkStatus(args) {
  const token = process.env.LINKEDIN_ACCESS_TOKEN;
  
  if (!token) {
    console.log('Status: No token configured');
    console.log('\nRun: node auth.js flow to get a token');
    return;
  }
  
  console.log('Checking token status...\n');
  
  try {
    // Try to get profile to test token
    const response = await fetch('https://api.linkedin.com/v2/userinfo', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    if (response.ok) {
      const profile = await response.json();
      console.log('✓ Token is valid\n');
      console.log(`Authenticated as: ${profile.name || profile.given_name}`);
      console.log(`Email: ${profile.email || 'N/A'}`);
      console.log(`User ID: ${profile.sub}`);
      
      if (args.verbose) {
        console.log('\nFull profile:');
        console.log(JSON.stringify(profile, null, 2));
      }
    } else if (response.status === 401) {
      console.log('✗ Token is expired or invalid');
      console.log('\nRun: node auth.js refresh or node auth.js flow');
    } else {
      console.log(`✗ Unexpected status: ${response.status}`);
    }
  } catch (error) {
    console.error('Error checking token:', error.message);
  }
}

// Start OAuth flow with local server
async function startOAuthFlow(args) {
  const scopes = args.scopes ? args.scopes.split(',') : DEFAULT_SCOPES;
  const port = parseInt(args.port) || 3000;
  
  const authUrl = getAuthUrl(scopes);
  
  console.log('\n=== LinkedIn OAuth Flow ===\n');
  console.log('Scopes requested:', scopes.join(', '));
  console.log('\n1. Opening browser to authorize...');
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
          
          console.log('\n✓ Authorization code received!\n');
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
      case 'url': {
        const scopes = args.scopes ? args.scopes.split(',') : DEFAULT_SCOPES;
        console.log('\nAuthorization URL:');
        console.log(getAuthUrl(scopes));
        console.log('\nOpen this URL in a browser, authorize, and note the "code" parameter from the redirect.');
        console.log('Then run: node auth.js exchange YOUR_CODE\n');
        break;
      }
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
      case 'scopes':
        listScopes();
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
