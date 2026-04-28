#!/usr/bin/env node

/**
 * X.com Search
 * Search tweets and users.
 */

import { fileURLToPath } from 'url';
import path from 'path';
import {
  parseArgs, initScript, apiRequest,
  formatDate, handleError, showHelp
} from './utils.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const args = parseArgs(process.argv.slice(2));
initScript(path.join(__dirname, '..'), args);

// Help documentation
function printHelp() {
  showHelp('X.com Search', {
    'Commands': [
      'tweets <query>             Search recent tweets (last 7 days)',
      'archive <query>            Search the full tweet archive (back to 2010)',
      'counts <query>             Tweet volume counts over time (full archive)',
      'help                       Show this help'
    ],
    'Options': [
      '--limit <n>                Max results per page (10-100, default: 10)',
      '--since <id>               Only tweets after this tweet ID',
      '--until <id>               Only tweets before this tweet ID',
      '--start <date>             Start time (ISO 8601, e.g. 2024-01-01T00:00:00Z)',
      '--end <date>               End time (ISO 8601)',
      '--sort <order>             Sort: recency (default) or relevancy [tweets only]',
      '--granularity <unit>       day | hour | minute (counts only, default: day)',
      '--verbose                  Show full API response'
    ],
    'Query Syntax (works on all commands)': [
      'Basic:     "machine learning"',
      'Exact:     "\\"deep learning\\""',
      'From user: from:elonmusk',
      'To user:   to:elonmusk',
      'Hashtag:   #AI',
      'Mention:   @openai',
      'URL:       url:github.com',
      'Exclude:   AI -crypto',
      'OR:        (AI OR ML)',
      'Has media: AI has:media',
      'Has link:  AI has:links',
      'Verified:  AI is:verified',
      'Language:  AI lang:en',
      'No RTs:    AI -is:retweet'
    ],
    'Examples': [
      'node search.js tweets "AI agents" --limit 20',
      'node search.js tweets "from:elonmusk AI" --limit 10',
      'node search.js archive "AI agents lang:en" --start 2024-01-01T00:00:00Z --end 2024-01-08T00:00:00Z',
      'node search.js archive "from:elonmusk" --start 2020-01-01T00:00:00Z --end 2020-02-01T00:00:00Z',
      'node search.js counts "AI agents lang:en" --start 2024-01-01T00:00:00Z --end 2024-02-01T00:00:00Z --granularity day'
    ],
    'Notes': [
      'archive and counts use /tweets/search/all and require Bearer (OAuth 2.0 app-only) auth.',
      'Engagement operators (min_faves, min_retweets) are Enterprise-only and will be rejected.',
      'Archive endpoints have strict per-15min rate limits; queries consume API credits.'
    ]
  });
}

const TWEET_FIELDS = 'created_at,public_metrics,author_id,conversation_id,in_reply_to_user_id';
const USER_FIELDS = 'name,username';
const EXPANSIONS = 'author_id';

// X API requires max_results between 10 and 100 for search endpoints.
// Clamp the user's --limit so a small number doesn't 400 the request.
function clampLimit(rawLimit) {
  const requested = parseInt(rawLimit) || 10;
  const clamped = Math.max(10, Math.min(requested, 100));
  if (rawLimit && requested !== clamped) {
    console.log(`(--limit ${requested} clamped to ${clamped}; X API requires 10-100)\n`);
  }
  return clamped;
}

function printTweets(data) {
  const tweets = data.data || [];
  const meta = data.meta || {};

  console.log(`Found ${meta.result_count || tweets.length} tweets:\n`);

  for (const tweet of tweets) {
    const author = data.includes?.users?.find(u => u.id === tweet.author_id);
    const metrics = tweet.public_metrics || {};
    const authorName = author ? `${author.name} (@${author.username})` : tweet.author_id;

    console.log(`${authorName}`);
    console.log(`${tweet.text}`);
    console.log(`  ${formatDate(tweet.created_at)} | likes ${metrics.like_count || 0} | rt ${metrics.retweet_count || 0} | replies ${metrics.reply_count || 0}`);
    console.log(`  ID: ${tweet.id}`);
    console.log(`  https://x.com/i/status/${tweet.id}`);
    console.log('');
  }

  if (meta.next_token) {
    console.log(`More results available. next_token: ${meta.next_token}`);
  }
}

// Search recent tweets (last 7 days)
async function searchTweets(query, args) {
  const params = {
    query,
    'tweet.fields': TWEET_FIELDS,
    'user.fields': USER_FIELDS,
    'expansions': EXPANSIONS,
    max_results: clampLimit(args.limit)
  };

  if (args.since) params.since_id = args.since;
  if (args.until) params.until_id = args.until;
  if (args.start) params.start_time = args.start;
  if (args.end) params.end_time = args.end;
  if (args.sort) params.sort_order = args.sort;

  console.log(`Searching recent for "${query}"...\n`);

  const data = await apiRequest('GET', '/tweets/search/recent', { params });

  if (args.verbose) {
    console.log(JSON.stringify(data, null, 2));
    return;
  }

  printTweets(data);
}

// Search the full tweet archive (back to 2010).
// Requires Bearer (OAuth 2.0 app-only) auth and consumes credits.
async function searchArchive(query, args) {
  const params = {
    query,
    'tweet.fields': TWEET_FIELDS,
    'user.fields': USER_FIELDS,
    'expansions': EXPANSIONS,
    max_results: clampLimit(args.limit)
  };

  if (args.since) params.since_id = args.since;
  if (args.until) params.until_id = args.until;
  if (args.start) params.start_time = args.start;
  if (args.end) params.end_time = args.end;

  console.log(`Searching full archive for "${query}"...\n`);

  const data = await apiRequest('GET', '/tweets/search/all', { params, useBearer: true });

  if (args.verbose) {
    console.log(JSON.stringify(data, null, 2));
    return;
  }

  printTweets(data);
}

// Tweet volume counts over time across the full archive.
// Requires Bearer auth. Returns time-bucketed counts, not tweet bodies.
async function countTweets(query, args) {
  const params = {
    query,
    granularity: args.granularity || 'day'
  };

  if (args.start) params.start_time = args.start;
  if (args.end) params.end_time = args.end;
  if (args.since) params.since_id = args.since;
  if (args.until) params.until_id = args.until;

  console.log(`Counting tweets for "${query}" (granularity: ${params.granularity})...\n`);

  const data = await apiRequest('GET', '/tweets/counts/all', { params, useBearer: true });

  if (args.verbose) {
    console.log(JSON.stringify(data, null, 2));
    return;
  }

  const buckets = data.data || [];
  const total = data.meta?.total_tweet_count;

  console.log(`Total tweets: ${total ?? 'n/a'} across ${buckets.length} buckets\n`);

  // Print buckets with a simple bar for visual scale
  const max = buckets.reduce((m, b) => Math.max(m, b.tweet_count), 0) || 1;
  for (const b of buckets) {
    const label = b.start.replace('T', ' ').replace('.000Z', '');
    const barLen = Math.round((b.tweet_count / max) * 40);
    const bar = '#'.repeat(barLen);
    console.log(`  ${label}  ${String(b.tweet_count).padStart(8)}  ${bar}`);
  }

  if (data.meta?.next_token) {
    console.log(`\nMore buckets available. next_token: ${data.meta.next_token}`);
  }
}

// Main
async function main() {
  const command = args._[0];

  function requireQuery(cmd) {
    if (!args._[1]) {
      console.error('Error: Search query required');
      console.error(`Usage: node search.js ${cmd} "your query"`);
      process.exit(1);
    }
  }

  try {
    switch (command) {
      case 'tweets':
        requireQuery('tweets');
        await searchTweets(args._[1], args);
        break;
      case 'archive':
        requireQuery('archive');
        await searchArchive(args._[1], args);
        break;
      case 'counts':
        requireQuery('counts');
        await countTweets(args._[1], args);
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
