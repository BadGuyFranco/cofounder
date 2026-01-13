#!/usr/bin/env node

/**
 * X.com Bookmarks Management
 * Add, remove, and list bookmarked tweets.
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
  showHelp('X.com Bookmarks', {
    'Commands': [
      'list                       List your bookmarked tweets',
      'add <tweet_id>             Bookmark a tweet',
      'remove <tweet_id>          Remove bookmark (destructive)',
      'help                       Show this help'
    ],
    'Options': [
      '--limit <n>                Max bookmarks to return (default: 10, max: 100)',
      '--all                      Fetch all bookmarks',
      '--verbose                  Show full API response',
      '--force                    Skip confirmation for remove'
    ],
    'Examples': [
      'node bookmarks.js list',
      'node bookmarks.js list --all',
      'node bookmarks.js add 1234567890123456789',
      'node bookmarks.js remove 1234567890123456789'
    ],
    'Notes': [
      'Bookmarks are private - only you can see them',
      'Requires OAuth 2.0 with bookmark.read and bookmark.write scopes'
    ]
  });
}

const TWEET_FIELDS = 'created_at,public_metrics,author_id';
const USER_FIELDS = 'name,username';
const EXPANSIONS = 'author_id';

// List bookmarks
async function listBookmarks(args) {
  const userId = await getAuthenticatedUserId();
  const limit = parseInt(args.limit) || 10;
  
  const params = {
    'tweet.fields': TWEET_FIELDS,
    'user.fields': USER_FIELDS,
    'expansions': EXPANSIONS,
    max_results: Math.min(limit, 100)
  };
  
  console.log('Fetching bookmarks...\n');
  
  if (args.all) {
    const { data, meta } = await apiRequestPaginated(`/users/${userId}/bookmarks`, {
      all: true,
      maxResults: Math.min(limit, 100),
      params
    });
    
    if (args.verbose) {
      console.log(JSON.stringify({ data, meta }, null, 2));
      return;
    }
    
    console.log(`Found ${meta.total} bookmarks:\n`);
    for (const tweet of data) {
      displayBookmark(tweet, {});
    }
  } else {
    const data = await apiRequest('GET', `/users/${userId}/bookmarks`, { params });
    
    if (args.verbose) {
      console.log(JSON.stringify(data, null, 2));
      return;
    }
    
    const tweets = data.data || [];
    console.log(`Found ${tweets.length} bookmarks:\n`);
    
    for (const tweet of tweets) {
      displayBookmark(tweet, data.includes || {});
    }
  }
}

// Display bookmark
function displayBookmark(tweet, includes) {
  const author = includes.users?.find(u => u.id === tweet.author_id);
  const metrics = tweet.public_metrics || {};
  
  const authorName = author ? `${author.name} (@${author.username})` : tweet.author_id;
  
  console.log(`${authorName}`);
  console.log(`${tweet.text}`);
  console.log(`  ${formatDate(tweet.created_at)} | ❤️ ${metrics.like_count || 0} | 🔁 ${metrics.retweet_count || 0}`);
  console.log(`  ID: ${tweet.id}`);
  console.log(`  https://x.com/i/status/${tweet.id}`);
  console.log('');
}

// Add bookmark
async function addBookmark(tweetId, args) {
  const userId = await getAuthenticatedUserId();
  
  console.log('Adding bookmark...\n');
  
  const data = await apiRequest('POST', `/users/${userId}/bookmarks`, {
    body: { tweet_id: tweetId }
  });
  
  if (args.verbose) {
    console.log(JSON.stringify(data, null, 2));
    return;
  }
  
  if (data.data?.bookmarked) {
    console.log('Tweet bookmarked successfully!');
    console.log(`https://x.com/i/status/${tweetId}`);
  } else {
    console.log('Bookmark may have failed. Check the tweet.');
  }
}

// Remove bookmark
async function removeBookmark(tweetId, args) {
  const userId = await getAuthenticatedUserId();
  
  const confirmed = await confirmDestructiveAction(
    `Remove bookmark for tweet: ${tweetId}`,
    [],
    args.force
  );
  
  if (!confirmed) return;
  
  const data = await apiRequest('DELETE', `/users/${userId}/bookmarks/${tweetId}`);
  
  if (args.verbose) {
    console.log(JSON.stringify(data, null, 2));
    return;
  }
  
  console.log('Bookmark removed successfully.');
}

// Main
async function main() {
  const command = args._[0];
  
  try {
    switch (command) {
      case 'list':
        await listBookmarks(args);
        break;
      case 'add':
        if (!args._[1]) {
          console.error('Error: Tweet ID required');
          console.error('Usage: node bookmarks.js add <tweet_id>');
          process.exit(1);
        }
        await addBookmark(args._[1], args);
        break;
      case 'remove':
        if (!args._[1]) {
          console.error('Error: Tweet ID required');
          console.error('Usage: node bookmarks.js remove <tweet_id>');
          process.exit(1);
        }
        await removeBookmark(args._[1], args);
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
