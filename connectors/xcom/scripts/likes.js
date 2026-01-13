#!/usr/bin/env node

/**
 * X.com Likes Management
 * Like, unlike, and list liked tweets.
 */

import { fileURLToPath } from 'url';
import path from 'path';
import {
  parseArgs, initScript, apiRequest, apiRequestPaginated, confirmDestructiveAction,
  formatDate, handleError, showHelp, getAuthenticatedUserId
} from './utils.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const args = parseArgs(process.argv.slice(2));
initScript(path.join(__dirname, '..'), args);

// Help documentation
function printHelp() {
  showHelp('X.com Likes', {
    'Commands': [
      'list [user_id]             List liked tweets (yours if no user specified)',
      'like <tweet_id>            Like a tweet',
      'unlike <tweet_id>          Unlike a tweet (destructive)',
      'liking-users <tweet_id>    Get users who liked a tweet',
      'help                       Show this help'
    ],
    'Options': [
      '--limit <n>                Max results to return (default: 10, max: 100)',
      '--all                      Fetch all available pages',
      '--verbose                  Show full API response',
      '--force                    Skip confirmation for unlike'
    ],
    'Examples': [
      'node likes.js list',
      'node likes.js list 1234567890123456789',
      'node likes.js like 1234567890123456789',
      'node likes.js unlike 1234567890123456789',
      'node likes.js liking-users 1234567890123456789'
    ],
    'Notes': [
      'Your likes are public unless your account is protected',
      'Liking/unliking counts toward your rate limit'
    ]
  });
}

const TWEET_FIELDS = 'created_at,public_metrics,author_id';
const USER_FIELDS = 'name,username,public_metrics';
const EXPANSIONS = 'author_id';

// List liked tweets
async function listLikes(userId, args) {
  const targetUserId = userId || await getAuthenticatedUserId();
  const limit = parseInt(args.limit) || 10;
  
  const params = {
    'tweet.fields': TWEET_FIELDS,
    'user.fields': USER_FIELDS,
    'expansions': EXPANSIONS,
    max_results: Math.min(limit, 100)
  };
  
  console.log('Fetching liked tweets...\n');
  
  if (args.all) {
    const { data, meta } = await apiRequestPaginated(`/users/${targetUserId}/liked_tweets`, {
      all: true,
      maxResults: Math.min(limit, 100),
      params
    });
    
    if (args.verbose) {
      console.log(JSON.stringify({ data, meta }, null, 2));
      return;
    }
    
    console.log(`Found ${meta.total} liked tweets:\n`);
    for (const tweet of data) {
      displayTweet(tweet, {});
    }
  } else {
    const data = await apiRequest('GET', `/users/${targetUserId}/liked_tweets`, { params });
    
    if (args.verbose) {
      console.log(JSON.stringify(data, null, 2));
      return;
    }
    
    const tweets = data.data || [];
    console.log(`Found ${tweets.length} liked tweets:\n`);
    
    for (const tweet of tweets) {
      displayTweet(tweet, data.includes || {});
    }
  }
}

// Display tweet
function displayTweet(tweet, includes) {
  const author = includes.users?.find(u => u.id === tweet.author_id);
  const metrics = tweet.public_metrics || {};
  
  const authorName = author ? `${author.name} (@${author.username})` : tweet.author_id;
  
  console.log(`${authorName}`);
  console.log(`${tweet.text}`);
  console.log(`  ${formatDate(tweet.created_at)} | ❤️ ${metrics.like_count || 0} | 🔁 ${metrics.retweet_count || 0}`);
  console.log(`  ID: ${tweet.id}`);
  console.log('');
}

// Like a tweet
async function likeTweet(tweetId, args) {
  const userId = await getAuthenticatedUserId();
  
  console.log('Liking tweet...\n');
  
  const data = await apiRequest('POST', `/users/${userId}/likes`, {
    body: { tweet_id: tweetId }
  });
  
  if (args.verbose) {
    console.log(JSON.stringify(data, null, 2));
    return;
  }
  
  if (data.data?.liked) {
    console.log('Tweet liked successfully!');
    console.log(`https://x.com/i/status/${tweetId}`);
  } else {
    console.log('Like may have failed. Check the tweet.');
  }
}

// Unlike a tweet
async function unlikeTweet(tweetId, args) {
  const userId = await getAuthenticatedUserId();
  
  const confirmed = await confirmDestructiveAction(
    `Unlike tweet: ${tweetId}`,
    [],
    args.force
  );
  
  if (!confirmed) return;
  
  const data = await apiRequest('DELETE', `/users/${userId}/likes/${tweetId}`);
  
  if (args.verbose) {
    console.log(JSON.stringify(data, null, 2));
    return;
  }
  
  console.log('Tweet unliked successfully.');
}

// Get users who liked a tweet
async function getLikingUsers(tweetId, args) {
  const limit = parseInt(args.limit) || 10;
  
  const params = {
    'user.fields': USER_FIELDS,
    max_results: Math.min(limit, 100)
  };
  
  console.log('Fetching users who liked this tweet...\n');
  
  if (args.all) {
    const { data, meta } = await apiRequestPaginated(`/tweets/${tweetId}/liking_users`, {
      all: true,
      maxResults: Math.min(limit, 100),
      params
    });
    
    if (args.verbose) {
      console.log(JSON.stringify({ data, meta }, null, 2));
      return;
    }
    
    console.log(`Found ${meta.total} users:\n`);
    for (const user of data) {
      displayUser(user);
    }
  } else {
    const data = await apiRequest('GET', `/tweets/${tweetId}/liking_users`, { params });
    
    if (args.verbose) {
      console.log(JSON.stringify(data, null, 2));
      return;
    }
    
    const users = data.data || [];
    console.log(`Found ${users.length} users:\n`);
    
    for (const user of users) {
      displayUser(user);
    }
  }
}

// Display user
function displayUser(user) {
  const metrics = user.public_metrics || {};
  console.log(`${user.name} (@${user.username})`);
  console.log(`  Followers: ${metrics.followers_count?.toLocaleString() || 0}`);
  console.log('');
}

// Main
async function main() {
  const command = args._[0];
  
  try {
    switch (command) {
      case 'list':
        await listLikes(args._[1], args);
        break;
      case 'like':
        if (!args._[1]) {
          console.error('Error: Tweet ID required');
          console.error('Usage: node likes.js like <tweet_id>');
          process.exit(1);
        }
        await likeTweet(args._[1], args);
        break;
      case 'unlike':
        if (!args._[1]) {
          console.error('Error: Tweet ID required');
          console.error('Usage: node likes.js unlike <tweet_id>');
          process.exit(1);
        }
        await unlikeTweet(args._[1], args);
        break;
      case 'liking-users':
        if (!args._[1]) {
          console.error('Error: Tweet ID required');
          console.error('Usage: node likes.js liking-users <tweet_id>');
          process.exit(1);
        }
        await getLikingUsers(args._[1], args);
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
