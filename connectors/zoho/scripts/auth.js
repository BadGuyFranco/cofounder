#!/usr/bin/env node

/**
 * Zoho CRM OAuth Authentication
 * Handles OAuth 2.0 flow for getting access tokens.
 * Supports multiple organizations with separate credentials.
 */

import { fileURLToPath } from 'url';
import path from 'path';
import http from 'http';
import fs from 'fs';
import {
  loadOrgConfig, saveOrgConfig, listOrganizations, getClientCredentials,
  getRegionEndpoints, getAccessToken, parseArgs, handleError, showHelp,
  apiRequest, MEMORY_DIR, ZOHO_REGIONS, DEFAULT_REGION,
  SUPPORTED_EDITIONS, DEFAULT_EDITION, normalizeEdition
} from './utils.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const REDIRECT_URI = 'http://localhost:8080/callback';

// Available scopes for Zoho CRM
const AVAILABLE_SCOPES = {
  // Module access
  'ZohoCRM.modules.ALL': 'Full access to all modules (Leads, Contacts, Deals, etc.)',
  'ZohoCRM.modules.leads.ALL': 'Full access to Leads module',
  'ZohoCRM.modules.contacts.ALL': 'Full access to Contacts module',
  'ZohoCRM.modules.accounts.ALL': 'Full access to Accounts module',
  'ZohoCRM.modules.deals.ALL': 'Full access to Deals module',
  'ZohoCRM.modules.products.ALL': 'Full access to Products module',
  'ZohoCRM.modules.tasks.ALL': 'Full access to Tasks module',
  'ZohoCRM.modules.calls.ALL': 'Full access to Calls module',
  'ZohoCRM.modules.events.ALL': 'Full access to Events module',
  'ZohoCRM.modules.custom.ALL': 'Full access to custom modules',
  
  // Settings and automation
  'ZohoCRM.settings.ALL': 'Full access to CRM settings',
  'ZohoCRM.settings.workflow_rules.ALL': 'Workflow rules management',
  'ZohoCRM.settings.pipeline.ALL': 'Pipeline management',
  'ZohoCRM.settings.assignment_rules.ALL': 'Assignment rules access',
  'ZohoCRM.settings.scoring_rules.ALL': 'Scoring rules management',
  'ZohoCRM.settings.territories.ALL': 'Territory management',
  'ZohoCRM.settings.tags.ALL': 'Tags management',
  
  // Organization
  'ZohoCRM.org.ALL': 'Organization details access',
  'ZohoCRM.users.ALL': 'Users management',
  'ZohoCRM.settings.roles.ALL': 'Roles management',
  'ZohoCRM.settings.profiles.ALL': 'Profiles management',
  
  // Bulk and query
  'ZohoCRM.bulk.ALL': 'Bulk operations (import/export)',
  'ZohoCRM.coql.READ': 'COQL query access',
  
  // Other
  'ZohoCRM.notifications.ALL': 'Notification access',
  'ZohoCRM.mass_update.ALL': 'Mass update operations',
  'ZohoCRM.files.ALL': 'File attachments access'
};

// Default scopes for full CRM access
const DEFAULT_SCOPES = [
  'ZohoCRM.modules.ALL',
  'ZohoCRM.settings.ALL',
  'ZohoCRM.org.ALL',
  'ZohoCRM.users.ALL',
  'ZohoCRM.bulk.ALL',
  'ZohoCRM.coql.READ'
];

// Help documentation
function printHelp() {
  showHelp('Zoho CRM Authentication', {
    'Commands': [
      'setup                       Configure a new organization',
      'flow                        Start OAuth flow (opens browser)',
      'url                         Print authorization URL only',
      'exchange <code>             Exchange auth code for tokens',
      'refresh                     Refresh access token',
      'status                      Check token status',
      'edition                     View or update CRM edition for an org',
      'orgs                        List configured organizations',
      'scopes                      List available OAuth scopes',
      'test                        Test API connection',
      'help                        Show this help'
    ],
    'Options': [
      '--org <name>                Organization name (required for multi-org)',
      '--region <code>             Region: us, eu, in, au, jp, cn, ca (default: us)',
      `--edition <name>            CRM edition: ${SUPPORTED_EDITIONS.join(', ')} (default: ${DEFAULT_EDITION})`,
      '--scopes <list>             Comma-separated scopes',
      '--port <port>               Callback port (default: 3000)',
      '--verbose                   Show full API responses'
    ],
    'Examples': [
      'node auth.js setup --org mycompany --region us',
      'node auth.js setup --org mycompany --edition professional',
      'node auth.js edition --org mycompany --edition enterprise',
      'node auth.js flow --org mycompany',
      'node auth.js status --org mycompany',
      'node auth.js test --org mycompany',
      'node auth.js orgs'
    ],
    'Multi-Organization': [
      'Each Zoho organization requires separate authentication.',
      'Use --org to specify which organization to work with.',
      'Credentials are stored in /memory/connectors/zoho/<org>.json'
    ],
    'Regions': Object.entries(ZOHO_REGIONS).map(([code, urls]) => 
      `  ${code.padEnd(4)} - ${urls.accounts}`
    )
  });
}

// List available scopes
function listScopes() {
  console.log('\nAvailable Zoho CRM OAuth Scopes:\n');
  
  const categories = {
    'Module Access': [],
    'Settings & Automation': [],
    'Organization': [],
    'Bulk & Query': [],
    'Other': []
  };
  
  for (const [scope, description] of Object.entries(AVAILABLE_SCOPES)) {
    if (scope.includes('.modules.')) {
      categories['Module Access'].push({ scope, description });
    } else if (scope.includes('.settings.') || scope.includes('workflow') || scope.includes('pipeline')) {
      categories['Settings & Automation'].push({ scope, description });
    } else if (scope.includes('.org.') || scope.includes('.users.') || scope.includes('roles') || scope.includes('profiles')) {
      categories['Organization'].push({ scope, description });
    } else if (scope.includes('.bulk.') || scope.includes('.coql.')) {
      categories['Bulk & Query'].push({ scope, description });
    } else {
      categories['Other'].push({ scope, description });
    }
  }
  
  for (const [category, scopes] of Object.entries(categories)) {
    if (scopes.length > 0) {
      console.log(`${category}:`);
      for (const { scope, description } of scopes) {
        console.log(`  ${scope.padEnd(40)} ${description}`);
      }
      console.log('');
    }
  }
  
  console.log('Default scopes: ' + DEFAULT_SCOPES.join(', '));
}

// List configured organizations
function listOrgs() {
  const orgs = listOrganizations();
  
  if (orgs.length === 0) {
    console.log('\nNo organizations configured.');
    console.log('Run: node auth.js setup --org <name> --region <region>');
    return;
  }
  
  console.log('\nConfigured Organizations:\n');
  
  for (const orgName of orgs) {
    try {
      const configPath = path.join(MEMORY_DIR, `${orgName}.json`);
      const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
      
      const hasToken = !!config.accessToken;
      const region = config.region || 'us';
      const edition = normalizeEdition(config.edition || config.apiEdition || DEFAULT_EDITION);
      const updatedAt = config.updatedAt ? new Date(config.updatedAt).toLocaleString() : 'N/A';
      
      console.log(`- ${orgName}`);
      console.log(`    Region: ${region}`);
      console.log(`    Edition: ${edition}`);
      console.log(`    Token: ${hasToken ? 'Configured' : 'Not configured'}`);
      console.log(`    Updated: ${updatedAt}`);
      console.log('');
    } catch (e) {
      console.log(`- ${orgName} (error reading config)`);
    }
  }
}

// Setup a new organization
async function setupOrg(args) {
  const orgName = args.org;
  const region = args.region || DEFAULT_REGION;
  const requestedEdition = normalizeEdition(args.edition || DEFAULT_EDITION);
  
  if (!orgName) {
    console.error('Error: --org <name> is required');
    console.error('Example: node auth.js setup --org mycompany --region us');
    process.exit(1);
  }
  
  // Validate region
  if (!ZOHO_REGIONS[region]) {
    console.error(`Error: Unknown region "${region}"`);
    console.error('Valid regions: ' + Object.keys(ZOHO_REGIONS).join(', '));
    process.exit(1);
  }
  
  // Check for client credentials
  let clientId, clientSecret;
  try {
    const creds = getClientCredentials();
    clientId = creds.clientId;
    clientSecret = creds.clientSecret;
  } catch (e) {
    console.log('\nClient credentials not found in .env file.');
    console.log('You will need to add them to: /memory/connectors/zoho/.env');
    console.log('\nRequired format:');
    console.log('  ZOHO_CLIENT_ID=your_client_id');
    console.log('  ZOHO_CLIENT_SECRET=your_client_secret');
  }
  
  // Create initial config
  const config = {
    region,
    edition: requestedEdition,
    scopes: DEFAULT_SCOPES,
    createdAt: new Date().toISOString()
  };
  
  const configPath = saveOrgConfig(orgName, config);
  
  console.log(`\nOrganization "${orgName}" configured.`);
  console.log(`Region: ${region}`);
  console.log(`Edition: ${requestedEdition}`);
  console.log(`Config saved to: ${configPath}`);
  console.log('\nNext steps:');
  console.log(`1. Ensure client credentials are in /memory/connectors/zoho/.env`);
  console.log(`2. Run: node auth.js flow --org ${orgName}`);
}

// Generate authorization URL
function getAuthUrl(region, scopes = DEFAULT_SCOPES) {
  const { clientId } = getClientCredentials();
  const endpoints = getRegionEndpoints(region);
  
  const params = new URLSearchParams({
    response_type: 'code',
    client_id: clientId,
    redirect_uri: REDIRECT_URI,
    scope: scopes.join(','),
    access_type: 'offline',  // Request refresh token
    prompt: 'consent'        // Always show consent screen
  });
  
  return `${endpoints.accounts}/oauth/v2/auth?${params.toString()}`;
}

// Exchange authorization code for tokens
async function exchangeCode(code, args) {
  const config = loadOrgConfig(args.org);
  const { clientId, clientSecret } = getClientCredentials();
  const endpoints = getRegionEndpoints(config.region);
  
  const params = new URLSearchParams({
    grant_type: 'authorization_code',
    code,
    redirect_uri: REDIRECT_URI,
    client_id: clientId,
    client_secret: clientSecret
  });
  
  const response = await fetch(`${endpoints.accounts}/oauth/v2/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params.toString()
  });
  
  const data = await response.json();
  
  if (!response.ok || data.error) {
    const error = new Error(data.error || 'Token exchange failed');
    error.data = data;
    throw error;
  }
  
  if (args.verbose) {
    console.log(JSON.stringify(data, null, 2));
  }
  
  // Save tokens to config
  const newConfig = {
    ...config,
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresAt: new Date(Date.now() + (data.expires_in * 1000)).toISOString(),
    tokenType: data.token_type,
    apiDomain: data.api_domain
  };
  
  saveOrgConfig(config.orgName, newConfig);
  
  console.log('\nTokens obtained successfully!\n');
  console.log(`Access Token: ${data.access_token.substring(0, 20)}...`);
  console.log(`Expires In: ${data.expires_in} seconds (${Math.round(data.expires_in / 60)} minutes)`);
  
  if (data.refresh_token) {
    console.log(`Refresh Token: ${data.refresh_token.substring(0, 20)}...`);
  }
  
  console.log(`\nTokens saved to config for "${config.orgName}".`);
  
  return data;
}

// Refresh access token
async function refreshToken(args) {
  const config = loadOrgConfig(args.org);
  
  if (!config.refreshToken) {
    console.error('Error: No refresh token found.');
    console.error(`Run: node auth.js flow --org ${config.orgName}`);
    process.exit(1);
  }
  
  // Force refresh by getting token
  const originalToken = config.accessToken;
  config.expiresAt = null; // Force refresh
  
  const token = await getAccessToken(config);
  
  if (token !== originalToken) {
    console.log('Token refreshed successfully!');
  } else {
    console.log('Token is still valid.');
  }
}

// Check token status
async function checkStatus(args) {
  let config;
  try {
    config = loadOrgConfig(args.org);
  } catch (e) {
    console.log('Status: No organization configured');
    console.log('\nRun: node auth.js setup --org <name> --region <region>');
    return;
  }
  
  console.log(`Organization: ${config.orgName}`);
  console.log(`Region: ${config.region || 'us'}`);
  console.log(`Edition: ${normalizeEdition(config.edition || config.apiEdition || DEFAULT_EDITION)}`);
  console.log('');
  
  if (!config.accessToken) {
    console.log('Status: No access token');
    console.log(`\nRun: node auth.js flow --org ${config.orgName}`);
    return;
  }
  
  // Check if token is expired
  const expiresAt = config.expiresAt ? new Date(config.expiresAt) : null;
  const isExpired = !expiresAt || Date.now() > expiresAt.getTime();
  
  console.log(`Token Expires: ${expiresAt ? expiresAt.toLocaleString() : 'Unknown'}`);
  console.log(`Status: ${isExpired ? 'Expired' : 'Valid'}`);
  console.log(`Refresh Token: ${config.refreshToken ? 'Available' : 'Not available'}`);
  
  if (args.verbose) {
    console.log('\nFull config:');
    const safeConfig = { ...config };
    if (safeConfig.accessToken) safeConfig.accessToken = safeConfig.accessToken.substring(0, 20) + '...';
    if (safeConfig.refreshToken) safeConfig.refreshToken = safeConfig.refreshToken.substring(0, 20) + '...';
    console.log(JSON.stringify(safeConfig, null, 2));
  }
}

// View or update organization edition
function manageEdition(args) {
  if (!args.org) {
    console.error('Error: --org <name> is required');
    console.error('Usage: node auth.js edition --org <name> [--edition <name>]');
    process.exit(1);
  }

  const config = loadOrgConfig(args.org);
  const currentEdition = normalizeEdition(config.edition || config.apiEdition || DEFAULT_EDITION);

  if (!args.edition) {
    console.log(`Organization: ${config.orgName}`);
    console.log(`Edition: ${currentEdition}`);
    if (config.apiEdition) {
      console.log(`API-reported edition: ${config.apiEdition}`);
    }
    console.log('\nUse --edition to update this value.');
    return;
  }

  const nextEdition = normalizeEdition(args.edition);
  const newConfig = {
    ...config,
    edition: nextEdition
  };

  saveOrgConfig(config.orgName, newConfig);

  console.log(`Updated edition for "${config.orgName}".`);
  console.log(`Previous: ${currentEdition}`);
  console.log(`Current: ${nextEdition}`);
  if (!SUPPORTED_EDITIONS.includes(nextEdition)) {
    console.log(`Warning: "${nextEdition}" is not in known editions (${SUPPORTED_EDITIONS.join(', ')}).`);
  }
}

// Test API connection
async function testConnection(args) {
  console.log('Testing API connection...\n');
  
  const config = loadOrgConfig(args.org);
  const token = await getAccessToken(config);
  
  try {
    // Test org endpoint
    const orgData = await apiRequest('GET', '/org', token, null, { region: config.region });
    
    if (orgData.org && orgData.org.length > 0) {
      const org = orgData.org[0];
      console.log('Connection successful!\n');
      console.log(`Organization: ${org.company_name || 'N/A'}`);
      console.log(`Domain: ${org.domain_name || 'N/A'}`);
      console.log(`Edition: ${org.edition || 'N/A'}`);
      console.log(`Currency: ${org.currency_symbol || ''} ${org.currency || 'N/A'}`);
      console.log(`Timezone: ${org.time_zone || 'N/A'}`);
      
      if (args.verbose) {
        console.log('\nFull organization data:');
        console.log(JSON.stringify(org, null, 2));
      }

      // Persist API-reported edition and backfill configured edition if missing
      if (org.edition) {
        const apiEdition = normalizeEdition(org.edition);
        const configuredEdition = normalizeEdition(config.edition || DEFAULT_EDITION);
        const nextConfig = {
          ...config,
          apiEdition
        };

        if (!config.edition) {
          nextConfig.edition = apiEdition;
        }

        saveOrgConfig(config.orgName, nextConfig);

        if (config.edition && configuredEdition !== apiEdition) {
          console.log('');
          console.log(`Note: Config edition is "${configuredEdition}" but API reports "${apiEdition}".`);
          console.log(`Run: node auth.js edition --org ${config.orgName} --edition ${apiEdition}`);
        }
      }
    } else {
      console.log('Connection successful, but no organization data returned.');
    }
  } catch (error) {
    console.error('Connection test failed.');
    throw error;
  }
}

// Start OAuth flow with local server
async function startOAuthFlow(args) {
  const config = loadOrgConfig(args.org);
  const scopes = args.scopes ? args.scopes.split(',') : config.scopes || DEFAULT_SCOPES;
  const port = parseInt(args.port) || 8080;
  
  const authUrl = getAuthUrl(config.region, scopes);
  
  console.log('\n=== Zoho CRM OAuth Flow ===\n');
  console.log(`Organization: ${config.orgName}`);
  console.log(`Region: ${config.region}`);
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
        const location = url.searchParams.get('location');
        const accountsServer = url.searchParams.get('accounts-server');
        
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
          
          console.log('\nAuthorization code received!\n');
          
          // If location info provided, update config region
          if (location) {
            console.log(`Data center location: ${location}`);
          }
          
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

// Print URL only
function printAuthUrl(args) {
  let config;
  try {
    config = loadOrgConfig(args.org);
  } catch (e) {
    console.error('Error: Organization not configured.');
    console.error('Run: node auth.js setup --org <name> --region <region>');
    process.exit(1);
  }
  
  const scopes = args.scopes ? args.scopes.split(',') : config.scopes || DEFAULT_SCOPES;
  const authUrl = getAuthUrl(config.region, scopes);
  
  console.log('\nAuthorization URL:');
  console.log(authUrl);
  console.log('\nOpen this URL in a browser, authorize, and note the "code" parameter from the redirect.');
  console.log(`Then run: node auth.js exchange <code> --org ${config.orgName}\n`);
}

// Main
async function main() {
  const args = parseArgs(process.argv.slice(2));
  const command = args._[0];
  
  try {
    switch (command) {
      case 'setup':
        await setupOrg(args);
        break;
      case 'flow':
        await startOAuthFlow(args);
        break;
      case 'url':
        printAuthUrl(args);
        break;
      case 'exchange':
        if (!args._[1]) {
          console.error('Error: Authorization code required');
          console.error('Usage: node auth.js exchange <code> --org <name>');
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
      case 'edition':
        manageEdition(args);
        break;
      case 'orgs':
        listOrgs();
        break;
      case 'scopes':
        listScopes();
        break;
      case 'test':
        await testConnection(args);
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
