#!/usr/bin/env node

import {
  initScript,
  normalizeListing,
  outputError,
  printJson,
  redditRequest,
  showHelp
} from './utils.js';

function printHelp() {
  showHelp('Reddit Saved Content', {
    Commands: [
      'list                 List saved posts and comments for the authenticated user',
      'help                 Show this help'
    ],
    Options: [
      '--limit <number>     Result limit, default: 25',
      '--after <token>      Pagination cursor',
      '--verbose            Include raw API response'
    ],
    Examples: [
      'node scripts/saved.js list',
      'node scripts/saved.js list --limit 50 --after t3_example'
    ],
    Notes: [
      'Requires identity and history scopes.',
      'Reddit requires deleted user content to be removed from your possession.'
    ]
  });
}

async function currentUsername(credentials) {
  const { data } = await redditRequest('/api/v1/me', { credentials });
  return data.name;
}

async function listSaved(credentials, args) {
  const username = await currentUsername(credentials);
  const { data, rateLimit } = await redditRequest(`/user/${username}/saved`, {
    credentials,
    query: {
      limit: args.limit || 25,
      after: args.after
    }
  });
  const listing = normalizeListing(data);
  printJson(args.verbose ? { username, listing, rateLimit, raw: data } : { username, ...listing, rateLimit });
}

async function main() {
  const init = initScript(printHelp);
  if (!init) return;

  const { credentials, args, command } = init;

  try {
    switch (command) {
      case 'list':
        await listSaved(credentials, args);
        break;
      default:
        printHelp();
        break;
    }
  } catch (error) {
    outputError(error, args.verbose);
  }
}

main();
