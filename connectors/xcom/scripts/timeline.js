#!/usr/bin/env node

/**
 * X.com Timeline Reading
 * Read user timelines and mentions.
 */

import { fileURLToPath } from 'url';
import path from 'path';
import {
  parseArgs, initScript, apiRequest, apiRequestPaginated,
  formatDate, handleError, showHelp, truncate, getAuthenticatedUserId
} from './utils.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const args = parseArgs(process.argv.slice(2));
initScript(path.join(__dirname, '..'), args);

// Help documentation
function printHelp() {
  showHelp('X.com Timeline', {
    'Commands': [
      'user <id|username>         Get tweets from a user',
      'mentions                   Get tweets mentioning you',
      'home                       Get your home timeline (requires elevated access)',
      'help                       Show this help'
    ],
    'Options': [
      '--limit <n>                Max tweets to return (default: 10, max: 100)',
      '--all                      Fetch all available pages',
      '--since <id>               Only tweets after this tweet ID',
      '--until <id>               Only tweets before this tweet ID',
      '--verbose                  Show full API response'
    ],
    'Examples': [
      'node timeline.js user elonmusk',
      'node timeline.js user elonmusk --limit 50',
      'node timeline.js mentions',
      'node timeline.js mentions --since 1234567890123456789'
    ],
    'Notes': [
      'User timeline returns recent tweets from that user',
      'Mentions returns tweets that @mention you',
      'Home timeline requires elevated API access',
      'Results include retweets by default'
    ]
  });
}

const TWEET_FIELDS = 'created_at,public_metrics,author_id,conversation_id,in_reply_to_user_id,referenced_tweets';
const USER_FIELDS = 'name,username';
const EXPANSIONS = 'author_id,referenced_tweets.id';

// Display tweet
function displayTweet(tweet, includes = {}, verbose = false) {
  if (verbose) {
    console.log(JSON.stringify(tweet, null, 2));
    return;
  }
  
  const author = includes.users?.find(u => u.id === tweet.author_id);
  const metrics = tweet.public_metrics || {};
  
  const authorName = author ? `${author.name} (@${author.username})` : tweet.author_id;
  
  console.log(`${authorName}`);
  console.log(`${tweet.text}`);
  console.log(`  ${formatDate(tweet.created_at)} | ❤️ ${metrics.like_count || 0} | 🔁 ${metrics.retweet_count || 0} | 💬 ${metrics.reply_count || 0}`);
  console.log(`  ID: ${tweet.id}`);
  console.log('');
}

// Get user ID from username or ID
async function resolveUserId(userIdOrUsername) {
  // If it looks like an ID (all digits), use as-is
  if (/^\d+$/.test(userIdOrUsername)) {
    return userIdOrUsername;
  }
  
  // Otherwise, look up by username
  const username = userIdOrUsername.replace(/^@/, '');
  const data = await apiRequest('GET', `/users/by/username/${username}`);
  return data.data.id;
}

// Get user timeline
async function getUserTimeline(userIdOrUsername, args) {
  const userId = await resolveUserId(userIdOrUsername);
  const limit = parseInt(args.limit) || 10;
  
  const params = {
    'tweet.fields': TWEET_FIELDS,
    'user.fields': USER_FIELDS,
    'expansions': EXPANSIONS,
    max_results: Math.min(limit, 100)
  };
  
  if (args.since) params.since_id = args.since;
  if (args.until) params.until_id = args.until;
  
  console.log('Fetching user timeline...\n');
  
  if (args.all) {
    const { data, meta } = await apiRequestPaginated(`/users/${userId}/tweets`, {
      all: true,
      maxResults: Math.min(limit, 100),
      params
    });
    
    if (args.verbose) {
      console.log(JSON.stringify({ data, meta }, null, 2));
      return;
    }
    
    console.log(`Found ${meta.total} tweets:\n`);
    for (const tweet of data) {
      displayTweet(tweet, {});
    }
  } else {
    const data = await apiRequest('GET', `/users/${userId}/tweets`, { params });
    
    if (args.verbose) {
      console.log(JSON.stringify(data, null, 2));
      return;
    }
    
    const tweets = data.data || [];
    console.log(`Found ${tweets.length} tweets:\n`);
    
    for (const tweet of tweets) {
      displayTweet(tweet, data.includes || {});
    }
  }
}

// Get mentions
async function getMentions(args) {
  const userId = await getAuthenticatedUserId();
  const limit = parseInt(args.limit) || 10;
  
  const params = {
    'tweet.fields': TWEET_FIELDS,
    'user.fields': USER_FIELDS,
    'expansions': EXPANSIONS,
    max_results: Math.min(limit, 100)
  };
  
  if (args.since) params.since_id = args.since;
  if (args.until) params.until_id = args.until;
  
  console.log('Fetching mentions...\n');
  
  if (args.all) {
    const { data, meta } = await apiRequestPaginated(`/users/${userId}/mentions`, {
      all: true,
      maxResults: Math.min(limit, 100),
      params
    });
    
    if (args.verbose) {
      console.log(JSON.stringify({ data, meta }, null, 2));
      return;
    }
    
    console.log(`Found ${meta.total} mentions:\n`);
    for (const tweet of data) {
      displayTweet(tweet, {});
    }
  } else {
    const data = await apiRequest('GET', `/users/${userId}/mentions`, { params });
    
    if (args.verbose) {
      console.log(JSON.stringify(data, null, 2));
      return;
    }
    
    const tweets = data.data || [];
    console.log(`Found ${tweets.length} mentions:\n`);
    
    for (const tweet of tweets) {
      displayTweet(tweet, data.includes || {});
    }
  }
}

// Get home timeline (requires elevated access)
async function getHomeTimeline(args) {
  const userId = await getAuthenticatedUserId();
  const limit = parseInt(args.limit) || 10;
  
  const params = {
    'tweet.fields': TWEET_FIELDS,
    'user.fields': USER_FIELDS,
    'expansions': EXPANSIONS,
    max_results: Math.min(limit, 100)
  };
  
  if (args.since) params.since_id = args.since;
  if (args.until) params.until_id = args.until;
  
  console.log('Fetching home timeline...\n');
  console.log('Note: This requires elevated API access.\n');
  
  const data = await apiRequest('GET', `/users/${userId}/reverse_chronological_timeline`, { params });
  
  if (args.verbose) {
    console.log(JSON.stringify(data, null, 2));
    return;
  }
  
  const tweets = data.data || [];
  console.log(`Found ${tweets.length} tweets:\n`);
  
  for (const tweet of tweets) {
    displayTweet(tweet, data.includes || {});
  }
}

// Main
async function main() {
  const command = args._[0];
  
  try {
    switch (command) {
      case 'user':
        if (!args._[1]) {
          console.error('Error: User ID or username required');
          console.error('Usage: node timeline.js user <id|username>');
          process.exit(1);
        }
        await getUserTimeline(args._[1], args);
        break;
      case 'mentions':
        await getMentions(args);
        break;
      case 'home':
        await getHomeTimeline(args);
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
