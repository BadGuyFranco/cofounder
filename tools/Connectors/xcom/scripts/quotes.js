#!/usr/bin/env node

/**
 * X.com Quote Tweets
 * Get quote tweets of a specific tweet.
 */

import { fileURLToPath } from 'url';
import path from 'path';
import {
  parseArgs, initScript, apiRequest, apiRequestPaginated,
  formatDate, handleError, showHelp
} from './utils.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const args = parseArgs(process.argv.slice(2));
initScript(path.join(__dirname, '..'), args);

// Help documentation
function printHelp() {
  showHelp('X.com Quote Tweets', {
    'Commands': [
      'get <tweet_id>            Get quote tweets of a tweet',
      'help                      Show this help'
    ],
    'Options': [
      '--limit <n>               Max results (default: 10, max: 100)',
      '--all                     Fetch all pages',
      '--verbose                 Show full API response'
    ],
    'Examples': [
      'node quotes.js get 1234567890123456789',
      'node quotes.js get 1234567890123456789 --limit 50',
      'node quotes.js get 1234567890123456789 --all'
    ],
    'Notes': [
      'Quote tweets are tweets that embed another tweet with commentary',
      'Results are returned in reverse chronological order'
    ]
  });
}

const TWEET_FIELDS = 'created_at,author_id,text,public_metrics,conversation_id';
const USER_FIELDS = 'name,username';

// Get quote tweets
async function getQuotes(tweetId, args) {
  const limit = parseInt(args.limit) || 10;
  
  const params = {
    'tweet.fields': TWEET_FIELDS,
    'user.fields': USER_FIELDS,
    'expansions': 'author_id',
    max_results: Math.min(limit, 100)
  };
  
  console.log(`Fetching quote tweets of ${tweetId}...\n`);
  
  if (args.all) {
    const { data, meta } = await apiRequestPaginated(`/tweets/${tweetId}/quote_tweets`, {
      all: true,
      maxResults: Math.min(limit, 100),
      params
    });
    
    if (args.verbose) {
      console.log(JSON.stringify({ data, meta }, null, 2));
      return;
    }
    
    console.log(`Found ${meta.total} quote tweets:\n`);
    for (const tweet of data) {
      displayTweet(tweet, {});
    }
  } else {
    const data = await apiRequest('GET', `/tweets/${tweetId}/quote_tweets`, { params });
    
    if (args.verbose) {
      console.log(JSON.stringify(data, null, 2));
      return;
    }
    
    const tweets = data.data || [];
    const meta = data.meta || {};
    
    console.log(`Found ${meta.result_count || tweets.length} quote tweets:\n`);
    
    for (const tweet of tweets) {
      displayTweet(tweet, data.includes || {});
    }
    
    if (meta.next_token) {
      console.log('More results available. Use --all to fetch all.');
    }
  }
}

// Display tweet
function displayTweet(tweet, includes) {
  const author = includes.users?.find(u => u.id === tweet.author_id);
  const metrics = tweet.public_metrics || {};
  
  if (author) {
    console.log(`${author.name} (@${author.username}) - ${formatDate(tweet.created_at)}`);
  } else {
    console.log(`User ${tweet.author_id} - ${formatDate(tweet.created_at)}`);
  }
  
  console.log(`  ${tweet.text}`);
  console.log(`  Likes: ${metrics.like_count || 0} | Retweets: ${metrics.retweet_count || 0} | Replies: ${metrics.reply_count || 0}`);
  console.log(`  ID: ${tweet.id}`);
  console.log('');
}

// Main
async function main() {
  const command = args._[0];
  
  try {
    switch (command) {
      case 'get':
        if (!args._[1]) {
          console.error('Error: Tweet ID required');
          console.error('Usage: node quotes.js get <tweet_id>');
          process.exit(1);
        }
        await getQuotes(args._[1], args);
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
