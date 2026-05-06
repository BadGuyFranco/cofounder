#!/usr/bin/env node

import http from 'http';
import {
  DEFAULT_REDIRECT_URI,
  getClientCredentials,
  loadConfig,
  outputError,
  parseArgs,
  printJson,
  redditRequest,
  showHelp,
  tokenRequest
} from './utils.js';

const AUTH_URL = 'https://www.reddit.com/api/v1/authorize';
const DEFAULT_SCOPES = ['identity', 'read', 'history', 'mysubreddits'];
const AVAILABLE_SCOPES = {
  identity: 'Read current account identity',
  read: 'Read posts, comments, and subreddit listings',
  history: 'Read saved, hidden, upvoted, and downvoted listings',
  mysubreddits: 'Read subscribed subreddit listings',
  save: 'Save and unsave posts or comments',
  submit: 'Submit posts or comments',
  privatemessages: 'Read and manage private messages',
  modposts: 'Read and manage moderator post queues'
};

function printHelp() {
  showHelp('Reddit Authentication', {
    Commands: [
      'flow                 Start local callback server and print authorization URL',
      'url                  Print authorization URL only',
      'exchange <code>      Exchange authorization code for tokens',
      'refresh              Refresh access token',
      'status               Check current access token',
      'scopes               List common OAuth scopes',
      'help                 Show this help'
    ],
    Options: [
      '--scopes <list>      Comma-separated scopes, default: identity,read,history,mysubreddits',
      '--duration <value>   temporary or permanent, default: permanent',
      '--port <number>      Local callback port, default: 3000',
      '--verbose            Show full responses'
    ],
    Examples: [
      'node scripts/auth.js url',
      'node scripts/auth.js flow --scopes identity,read,history',
      'node scripts/auth.js exchange AUTH_CODE',
      'node scripts/auth.js refresh',
      'node scripts/auth.js status'
    ]
  });
}

function parseScopes(args) {
  return args.scopes ? String(args.scopes).split(',').map(scope => scope.trim()).filter(Boolean) : DEFAULT_SCOPES;
}

function getAuthUrl(args = {}) {
  const { clientId, redirectUri } = getClientCredentials();
  const scopes = parseScopes(args);
  const params = new URLSearchParams({
    client_id: clientId,
    response_type: 'code',
    state: Math.random().toString(36).slice(2),
    redirect_uri: redirectUri,
    duration: args.duration || 'permanent',
    scope: scopes.join(' ')
  });

  return `${AUTH_URL}?${params.toString()}`;
}

async function exchangeCode(code, args = {}) {
  const credentials = getClientCredentials();
  const data = await tokenRequest({
    grant_type: 'authorization_code',
    code,
    redirect_uri: credentials.redirectUri
  }, credentials);

  if (args.verbose) {
    printJson(data);
  }

  console.log('\nToken obtained successfully.\n');
  console.log('Add or update these values in /memory/connectors/reddit/.env:\n');
  console.log(`REDDIT_ACCESS_TOKEN=${data.access_token}`);
  if (data.refresh_token) {
    console.log(`REDDIT_REFRESH_TOKEN=${data.refresh_token}`);
  }
  console.log('');
}

async function refreshToken(args = {}) {
  const refreshTokenValue = process.env.REDDIT_REFRESH_TOKEN;
  if (!refreshTokenValue) {
    throw new Error('REDDIT_REFRESH_TOKEN not found. Re-run node scripts/auth.js flow with duration permanent.');
  }

  const data = await tokenRequest({
    grant_type: 'refresh_token',
    refresh_token: refreshTokenValue
  });

  if (args.verbose) {
    printJson(data);
  }

  console.log('\nToken refreshed successfully.\n');
  console.log('Update this value in /memory/connectors/reddit/.env:\n');
  console.log(`REDDIT_ACCESS_TOKEN=${data.access_token}`);
  console.log('');
}

async function checkStatus(args = {}) {
  if (!process.env.REDDIT_ACCESS_TOKEN) {
    console.log('Status: No access token configured.');
    console.log('Run: node scripts/auth.js flow');
    return;
  }

  const { data, rateLimit } = await redditRequest('/api/v1/me');
  const summary = {
    status: 'valid',
    username: data.name,
    id: data.id,
    created_utc: data.created_utc,
    has_verified_email: data.has_verified_email,
    rateLimit
  };

  printJson(args.verbose ? { summary, raw: data } : summary);
}

function listScopes() {
  console.log('\nCommon Reddit OAuth scopes:\n');
  for (const [scope, description] of Object.entries(AVAILABLE_SCOPES)) {
    console.log(`  ${scope.padEnd(18)} ${description}`);
  }
  console.log(`\nDefault scopes: ${DEFAULT_SCOPES.join(',')}\n`);
}

async function startFlow(args = {}) {
  const port = Number(args.port || new URL(process.env.REDDIT_REDIRECT_URI || DEFAULT_REDIRECT_URI).port || 3000);
  const authUrl = getAuthUrl(args);

  console.log('\nReddit OAuth Flow\n');
  console.log('Open this URL in your browser and authorize the app:\n');
  console.log(authUrl);
  console.log(`\nWaiting for callback on http://localhost:${port}/callback ...\n`);

  await new Promise((resolve, reject) => {
    const server = http.createServer(async (req, res) => {
      const url = new URL(req.url, `http://localhost:${port}`);

      if (url.pathname !== '/callback') {
        res.writeHead(404);
        res.end('Not found');
        return;
      }

      const code = url.searchParams.get('code');
      const error = url.searchParams.get('error');

      if (error) {
        res.writeHead(400, { 'Content-Type': 'text/html' });
        res.end(`<html><body><h1>Authorization failed</h1><p>${error}</p></body></html>`);
        server.close();
        reject(new Error(error));
        return;
      }

      if (!code) {
        res.writeHead(400, { 'Content-Type': 'text/html' });
        res.end('<html><body><h1>Missing authorization code</h1></body></html>');
        server.close();
        reject(new Error('Missing authorization code'));
        return;
      }

      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end('<html><body><h1>Authorization received</h1><p>You can close this window.</p></body></html>');
      server.close();

      try {
        await exchangeCode(code, args);
        resolve();
      } catch (err) {
        reject(err);
      }
    });

    server.listen(port);
    setTimeout(() => {
      server.close();
      reject(new Error('OAuth flow timed out after 5 minutes'));
    }, 300000);
  });
}

async function main() {
  const args = parseArgs();
  const command = args._[0] || 'help';

  try {
    if (command !== 'help' && command !== 'scopes') {
      loadConfig();
    }

    switch (command) {
      case 'flow':
        await startFlow(args);
        break;
      case 'url':
        console.log(getAuthUrl(args));
        break;
      case 'exchange':
        if (!args._[1]) throw new Error('Authorization code required. Usage: node scripts/auth.js exchange <code>');
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
        break;
    }
  } catch (error) {
    outputError(error, args.verbose);
  }
}

main();
