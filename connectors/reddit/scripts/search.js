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
  showHelp('Reddit Search', {
    Commands: [
      'all <query>              Search all Reddit posts',
      'subreddit <name> <query> Search posts inside a subreddit',
      'comments <query>         Search comments, if account/API access supports it',
      'help                     Show this help'
    ],
    Options: [
      '--sort <sort>            relevance, hot, top, new, comments. Default: relevance',
      '--time <range>           hour, day, week, month, year, all. Default: all',
      '--limit <number>         Result limit, default: 25',
      '--after <token>          Pagination cursor',
      '--verbose                Include raw API response'
    ],
    Examples: [
      'node scripts/search.js all "founder onboarding"',
      'node scripts/search.js subreddit startups "customer discovery" --sort top --time year',
      'node scripts/search.js comments "pricing page" --limit 10'
    ]
  });
}

function cleanSubreddit(value) {
  return String(value || '').replace(/^r\//i, '').trim();
}

async function searchPosts(credentials, endpoint, query, args) {
  if (!query) throw new Error('Search query required.');
  const { data, rateLimit } = await redditRequest(endpoint, {
    credentials,
    query: {
      q: query,
      sort: args.sort || 'relevance',
      t: args.time || 'all',
      limit: args.limit || 25,
      after: args.after,
      restrict_sr: endpoint.startsWith('/r/') ? 1 : undefined
    }
  });
  const listing = normalizeListing(data);
  printJson(args.verbose ? { listing, rateLimit, raw: data } : { ...listing, rateLimit });
}

async function searchComments(credentials, query, args) {
  if (!query) throw new Error('Search query required. Usage: comments <query>');
  const { data, rateLimit } = await redditRequest('/search', {
    credentials,
    query: {
      q: query,
      type: 'comment',
      sort: args.sort || 'relevance',
      t: args.time || 'all',
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
      case 'all':
        await searchPosts(credentials, '/search', args._[1], args);
        break;
      case 'subreddit': {
        const subreddit = cleanSubreddit(args._[1]);
        const query = args._[2];
        if (!subreddit || !query) throw new Error('Usage: subreddit <name> <query>');
        await searchPosts(credentials, `/r/${subreddit}/search`, query, args);
        break;
      }
      case 'comments':
        await searchComments(credentials, args._[1], args);
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
