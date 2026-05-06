#!/usr/bin/env node

import {
  initScript,
  normalizeListing,
  outputError,
  printJson,
  redditRequest,
  showHelp
} from './utils.js';

const VALID_SORTS = new Set(['hot', 'new', 'top', 'rising', 'controversial']);

function printHelp() {
  showHelp('Reddit Subreddits', {
    Commands: [
      'about <subreddit>       Get subreddit metadata',
      'posts <subreddit>       List posts in a subreddit',
      'search <query>          Search for subreddits',
      'mine                    List subscribed subreddits',
      'help                    Show this help'
    ],
    Options: [
      '--sort <sort>           hot, new, top, rising, controversial. Default: hot',
      '--time <range>          hour, day, week, month, year, all. Used with top/controversial',
      '--limit <number>        Result limit, default: 25',
      '--after <token>         Pagination cursor',
      '--verbose               Include raw API response'
    ],
    Examples: [
      'node scripts/subreddits.js about startups',
      'node scripts/subreddits.js posts SaaS --sort top --time month --limit 10',
      'node scripts/subreddits.js search "founder advice"',
      'node scripts/subreddits.js mine'
    ]
  });
}

function cleanSubreddit(value) {
  return String(value || '').replace(/^r\//i, '').trim();
}

async function about(credentials, subreddit, args) {
  if (!subreddit) throw new Error('Subreddit required. Usage: about <subreddit>');
  const { data, rateLimit } = await redditRequest(`/r/${cleanSubreddit(subreddit)}/about`, { credentials });
  printJson(args.verbose ? { data, rateLimit } : {
    id: data.data?.id,
    name: data.data?.display_name_prefixed,
    title: data.data?.title,
    public_description: data.data?.public_description,
    subscribers: data.data?.subscribers,
    active_user_count: data.data?.active_user_count,
    over18: data.data?.over18,
    created_utc: data.data?.created_utc,
    url: data.data?.url ? `https://www.reddit.com${data.data.url}` : undefined,
    rateLimit
  });
}

async function posts(credentials, subreddit, args) {
  if (!subreddit) throw new Error('Subreddit required. Usage: posts <subreddit>');

  const sort = String(args.sort || 'hot').toLowerCase();
  if (!VALID_SORTS.has(sort)) {
    throw new Error(`Invalid sort "${sort}". Use one of: ${Array.from(VALID_SORTS).join(', ')}`);
  }

  const { data, rateLimit } = await redditRequest(`/r/${cleanSubreddit(subreddit)}/${sort}`, {
    credentials,
    query: {
      limit: args.limit || 25,
      after: args.after,
      t: args.time
    }
  });
  const listing = normalizeListing(data);
  printJson(args.verbose ? { listing, rateLimit, raw: data } : { ...listing, rateLimit });
}

async function search(credentials, query, args) {
  if (!query) throw new Error('Search query required. Usage: search <query>');
  const { data, rateLimit } = await redditRequest('/subreddits/search', {
    credentials,
    query: {
      q: query,
      limit: args.limit || 25,
      after: args.after
    }
  });
  const listing = normalizeListing(data);
  printJson(args.verbose ? { listing, rateLimit, raw: data } : { ...listing, rateLimit });
}

async function mine(credentials, args) {
  const { data, rateLimit } = await redditRequest('/subreddits/mine/subscriber', {
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
      case 'about':
        await about(credentials, args._[1], args);
        break;
      case 'posts':
        await posts(credentials, args._[1], args);
        break;
      case 'search':
        await search(credentials, args._[1], args);
        break;
      case 'mine':
        await mine(credentials, args);
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
