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
  showHelp('Reddit Account', {
    Commands: [
      'me                  Show authenticated account',
      'karma               Show subreddit karma',
      'submitted           List your submitted posts',
      'comments            List your comments',
      'help                Show this help'
    ],
    Options: [
      '--limit <number>    Result limit, default: 25',
      '--after <token>     Pagination cursor',
      '--verbose           Include raw API response'
    ],
    Examples: [
      'node scripts/me.js me',
      'node scripts/me.js karma',
      'node scripts/me.js submitted --limit 10',
      'node scripts/me.js comments --after t1_example'
    ]
  });
}

async function getMe(credentials, args) {
  const { data, rateLimit } = await redditRequest('/api/v1/me', { credentials });
  printJson(args.verbose ? { data, rateLimit } : {
    id: data.id,
    name: data.name,
    created_utc: data.created_utc,
    link_karma: data.link_karma,
    comment_karma: data.comment_karma,
    total_karma: data.total_karma,
    has_verified_email: data.has_verified_email,
    rateLimit
  });
}

async function getKarma(credentials, args) {
  const { data, rateLimit } = await redditRequest('/api/v1/me/karma', { credentials });
  printJson(args.verbose ? { data, rateLimit } : {
    count: data.data?.length || 0,
    items: data.data || [],
    rateLimit
  });
}

async function currentUsername(credentials) {
  const { data } = await redditRequest('/api/v1/me', { credentials });
  return data.name;
}

async function getListing(credentials, path, args) {
  const { data, rateLimit } = await redditRequest(path, {
    credentials,
    query: {
      limit: args.limit || 25,
      after: args.after
    }
  });
  const listing = normalizeListing(data);
  printJson(args.verbose ? { listing, rateLimit, raw: data } : { ...listing, rateLimit });
}

async function main() {
  const init = initScript(printHelp);
  if (!init) return;

  const { credentials, args, command } = init;

  try {
    switch (command) {
      case 'me':
        await getMe(credentials, args);
        break;
      case 'karma':
        await getKarma(credentials, args);
        break;
      case 'submitted': {
        const username = await currentUsername(credentials);
        await getListing(credentials, `/user/${username}/submitted`, args);
        break;
      }
      case 'comments': {
        const username = await currentUsername(credentials);
        await getListing(credentials, `/user/${username}/comments`, args);
        break;
      }
      default:
        printHelp();
        break;
    }
  } catch (error) {
    outputError(error, args.verbose);
  }
}

main();
