#!/usr/bin/env node

// Dependency check must run before npm imports.
import { ensureDeps } from '../../../system/shared/ensure-deps.js';
ensureDeps(import.meta.url);

import { parseArgs as sharedParseArgs } from '../../../system/shared/utils.js';
import { dirname, join } from 'path';
import { existsSync } from 'fs';
import { fileURLToPath } from 'url';

const dotenv = (await import('dotenv')).default;

const __dirname = dirname(fileURLToPath(import.meta.url));
const MEMORY_DIR = join(__dirname, '..', '..', '..', '..', 'memory', 'connectors', 'reddit');
const LOCAL_ENV_PATH = join(__dirname, '..', '.env');
const MEMORY_ENV_PATH = join(MEMORY_DIR, '.env');
const API_BASE_URL = 'https://oauth.reddit.com';
const TOKEN_URL = 'https://www.reddit.com/api/v1/access_token';
const DEFAULT_REDIRECT_URI = 'http://localhost:3000/callback';

export function loadConfig() {
  if (existsSync(MEMORY_ENV_PATH)) {
    dotenv.config({ path: MEMORY_ENV_PATH });
  } else if (existsSync(LOCAL_ENV_PATH)) {
    dotenv.config({ path: LOCAL_ENV_PATH });
  } else {
    console.error('Error: No .env file found.');
    console.error('Create /memory/connectors/reddit/.env with your Reddit app credentials.');
    console.error('See SETUP.md for instructions.');
    process.exit(1);
  }

  return process.env;
}

export function getClientCredentials(env = process.env) {
  const clientId = env.REDDIT_CLIENT_ID;
  const clientSecret = env.REDDIT_CLIENT_SECRET || '';
  const redirectUri = env.REDDIT_REDIRECT_URI || DEFAULT_REDIRECT_URI;

  if (!clientId) {
    console.error('Error: REDDIT_CLIENT_ID not found in environment.');
    console.error('Add it to /memory/connectors/reddit/.env');
    process.exit(1);
  }

  return { clientId, clientSecret, redirectUri };
}

export function getCredentials(env = process.env) {
  const accessToken = env.REDDIT_ACCESS_TOKEN;
  const refreshToken = env.REDDIT_REFRESH_TOKEN;
  const userAgent = env.REDDIT_USER_AGENT;

  if (!accessToken) {
    console.error('Error: REDDIT_ACCESS_TOKEN not found in environment.');
    console.error('Run: node scripts/auth.js flow');
    process.exit(1);
  }

  if (!userAgent) {
    console.error('Error: REDDIT_USER_AGENT not found in environment.');
    console.error('Use a descriptive value like: script:cofounder-reddit:v1.0.0 (by /u/your_username)');
    process.exit(1);
  }

  return {
    accessToken,
    refreshToken,
    userAgent,
    clientId: env.REDDIT_CLIENT_ID,
    clientSecret: env.REDDIT_CLIENT_SECRET || '',
    redirectUri: env.REDDIT_REDIRECT_URI || DEFAULT_REDIRECT_URI
  };
}

export function parseArgs(args = process.argv.slice(2)) {
  return sharedParseArgs(args);
}

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

function buildUrl(endpoint, query = {}) {
  const url = endpoint.startsWith('http')
    ? new URL(endpoint)
    : new URL(`${API_BASE_URL}${endpoint}`);

  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined && value !== null && value !== '') {
      url.searchParams.set(key, String(value));
    }
  }

  return url;
}

function parseRateLimits(response) {
  return {
    used: response.headers.get('x-ratelimit-used'),
    remaining: response.headers.get('x-ratelimit-remaining'),
    resetSeconds: response.headers.get('x-ratelimit-reset')
  };
}

export async function redditRequest(endpoint, options = {}) {
  const credentials = options.credentials || getCredentials();
  const url = buildUrl(endpoint, options.query);
  const headers = {
    Authorization: `Bearer ${credentials.accessToken}`,
    'User-Agent': credentials.userAgent,
    Accept: 'application/json',
    ...options.headers
  };

  const response = await fetch(url, {
    method: options.method || 'GET',
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined
  });

  const text = await response.text();
  let data = {};

  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = { raw: text };
    }
  }

  if (!response.ok) {
    const error = new Error(data.message || data.reason || data.error || 'Reddit API request failed');
    error.status = response.status;
    error.data = data;
    error.rateLimit = parseRateLimits(response);
    throw error;
  }

  return {
    data,
    rateLimit: parseRateLimits(response)
  };
}

export async function tokenRequest(params, credentials = getClientCredentials()) {
  const basic = Buffer.from(`${credentials.clientId}:${credentials.clientSecret}`).toString('base64');
  const response = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${basic}`,
      'Content-Type': 'application/x-www-form-urlencoded',
      'User-Agent': process.env.REDDIT_USER_AGENT || 'script:cofounder-reddit:v1.0.0 (by /u/user_example)'
    },
    body: new URLSearchParams(params).toString()
  });

  const data = await response.json();

  if (!response.ok || data.error) {
    const error = new Error(data.error_description || data.error || 'Token request failed');
    error.status = response.status;
    error.data = data;
    throw error;
  }

  return data;
}

export function normalizeThing(thing) {
  if (!thing) return null;
  const data = thing.data || thing;
  return {
    kind: thing.kind,
    id: data.id,
    name: data.name,
    subreddit: data.subreddit,
    author: data.author,
    title: data.title,
    body: data.selftext || data.body,
    url: data.url,
    permalink: data.permalink ? `https://www.reddit.com${data.permalink}` : undefined,
    score: data.score,
    num_comments: data.num_comments,
    created_utc: data.created_utc,
    over_18: data.over_18,
    stickied: data.stickied,
    locked: data.locked,
    raw: data
  };
}

export function normalizeListing(listing) {
  const data = listing?.data || listing || {};
  return {
    after: data.after || null,
    before: data.before || null,
    count: Array.isArray(data.children) ? data.children.length : 0,
    items: Array.isArray(data.children) ? data.children.map(normalizeThing) : []
  };
}

export function printJson(data) {
  console.log(JSON.stringify(data, null, 2));
}

export function showHelp(commandName, sections) {
  console.log(`\n${commandName}\n${'='.repeat(commandName.length)}\n`);
  for (const [title, lines] of Object.entries(sections)) {
    console.log(`${title}:`);
    for (const line of lines) {
      console.log(`  ${line}`);
    }
    console.log('');
  }
}

export function outputError(error, verbose = false) {
  console.error('Error:', error.message);
  if (error.status) console.error('Status:', error.status);
  if (error.rateLimit?.remaining !== null && error.rateLimit?.remaining !== undefined) {
    console.error('Rate limit remaining:', error.rateLimit.remaining);
    console.error('Rate limit reset seconds:', error.rateLimit.resetSeconds);
  }
  if (verbose && error.data) {
    console.error('Details:', JSON.stringify(error.data, null, 2));
  }
  process.exit(1);
}

export { MEMORY_DIR, DEFAULT_REDIRECT_URI };
