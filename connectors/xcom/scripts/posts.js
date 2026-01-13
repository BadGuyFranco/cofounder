#!/usr/bin/env node

/**
 * X.com Posts (Tweets) Management
 * Create, read, delete, quote, and reply to tweets.
 */

import { fileURLToPath } from 'url';
import path from 'path';
import {
  parseArgs, initScript, apiRequest, confirmDestructiveAction,
  formatDate, handleError, showHelp, truncate, getAuthenticatedUserId
} from './utils.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const args = parseArgs(process.argv.slice(2));
initScript(path.join(__dirname, '..'), args);

// Help documentation
function printHelp() {
  showHelp('X.com Posts (Tweets)', {
    'Commands': [
      'create <text>              Create a new tweet',
      'get <id>                   Get a tweet by ID',
      'delete <id>                Delete a tweet (destructive)',
      'reply <id> <text>          Reply to a tweet',
      'quote <id> <text>          Quote a tweet',
      'retweet <id>               Retweet a tweet',
      'unretweet <id>             Undo a retweet',
      'help                       Show this help'
    ],
    'Options': [
      '--media <id1,id2,...>      Attach media IDs (up to 4 images or 1 video)',
      '--poll <option1|option2>   Create poll (pipe-separated options, 2-4)',
      '--poll-duration <minutes>  Poll duration (5-10080, default: 1440)',
      '--reply-settings <who>     Who can reply: everyone, mentionedUsers, following',
      '--verbose                  Show full API response',
      '--force                    Skip confirmation for destructive actions'
    ],
    'Examples': [
      'node posts.js create "Hello, world!"',
      'node posts.js create "Check this out!" --media 1234567890',
      'node posts.js create "Vote now!" --poll "Yes|No|Maybe" --poll-duration 60',
      'node posts.js get 1234567890123456789',
      'node posts.js reply 1234567890123456789 "Great thread!"',
      'node posts.js quote 1234567890123456789 "This is so true!"',
      'node posts.js retweet 1234567890123456789',
      'node posts.js delete 1234567890123456789'
    ],
    'Notes': [
      'Tweet IDs are large numbers (use quotes if needed)',
      'Free tier: 1,500 tweets/month',
      'Basic tier: 3,000 tweets/month',
      'Character limit: 280 (4,000 for X Premium)',
      'URLs count as 23 characters regardless of length'
    ]
  });
}

// Create a tweet
async function createTweet(text, args) {
  if (!text) {
    console.error('Error: Tweet text is required');
    console.error('Usage: node posts.js create "Your tweet text"');
    process.exit(1);
  }
  
  const body = { text };
  
  // Add media if provided
  if (args.media) {
    const mediaIds = args.media.split(',').map(id => id.trim());
    body.media = { media_ids: mediaIds };
  }
  
  // Add poll if provided
  if (args.poll) {
    const options = args.poll.split('|').map(opt => opt.trim());
    if (options.length < 2 || options.length > 4) {
      console.error('Error: Poll must have 2-4 options');
      process.exit(1);
    }
    body.poll = {
      options: options,
      duration_minutes: parseInt(args['poll-duration']) || 1440
    };
  }
  
  // Add reply settings if provided
  if (args['reply-settings']) {
    body.reply_settings = args['reply-settings'];
  }
  
  console.log('Creating tweet...\n');
  
  const data = await apiRequest('POST', '/tweets', { body });
  
  if (args.verbose) {
    console.log(JSON.stringify(data, null, 2));
    return;
  }
  
  console.log('Tweet created successfully!\n');
  console.log(`ID: ${data.data.id}`);
  console.log(`Text: ${data.data.text}`);
  console.log(`\nView at: https://x.com/i/status/${data.data.id}`);
}

// Get a tweet by ID
async function getTweet(id, args) {
  const params = {
    'tweet.fields': 'created_at,public_metrics,author_id,conversation_id,in_reply_to_user_id,referenced_tweets,attachments',
    'expansions': 'author_id,attachments.media_keys',
    'user.fields': 'name,username',
    'media.fields': 'type,url,preview_image_url'
  };
  
  const data = await apiRequest('GET', `/tweets/${id}`, { params });
  
  if (args.verbose) {
    console.log(JSON.stringify(data, null, 2));
    return;
  }
  
  const tweet = data.data;
  const author = data.includes?.users?.[0];
  const metrics = tweet.public_metrics || {};
  
  console.log(`Tweet by ${author?.name || 'Unknown'} (@${author?.username || 'unknown'})\n`);
  console.log(`ID: ${tweet.id}`);
  console.log(`Text: ${tweet.text}`);
  console.log(`Created: ${formatDate(tweet.created_at)}`);
  console.log('');
  console.log('Metrics:');
  console.log(`  Likes: ${metrics.like_count || 0}`);
  console.log(`  Retweets: ${metrics.retweet_count || 0}`);
  console.log(`  Replies: ${metrics.reply_count || 0}`);
  console.log(`  Quotes: ${metrics.quote_count || 0}`);
  console.log(`  Impressions: ${metrics.impression_count || 0}`);
  console.log(`  Bookmarks: ${metrics.bookmark_count || 0}`);
  
  if (tweet.referenced_tweets) {
    console.log('');
    console.log('References:');
    for (const ref of tweet.referenced_tweets) {
      console.log(`  ${ref.type}: ${ref.id}`);
    }
  }
  
  console.log(`\nView at: https://x.com/i/status/${tweet.id}`);
}

// Delete a tweet
async function deleteTweet(id, args) {
  // Get tweet first to show what's being deleted
  let tweetText = id;
  try {
    const data = await apiRequest('GET', `/tweets/${id}`, {
      params: { 'tweet.fields': 'text' }
    });
    tweetText = truncate(data.data.text, 50);
  } catch (e) {
    // Continue with deletion even if we can't fetch the tweet
  }
  
  const confirmed = await confirmDestructiveAction(
    `Delete tweet: ${id}`,
    [`Text: ${tweetText}`],
    args.force
  );
  
  if (!confirmed) return;
  
  await apiRequest('DELETE', `/tweets/${id}`);
  
  console.log('Tweet deleted successfully.');
}

// Reply to a tweet
async function replyToTweet(tweetId, text, args) {
  if (!text) {
    console.error('Error: Reply text is required');
    console.error('Usage: node posts.js reply <tweet_id> "Your reply text"');
    process.exit(1);
  }
  
  const body = {
    text,
    reply: {
      in_reply_to_tweet_id: tweetId
    }
  };
  
  // Add media if provided
  if (args.media) {
    const mediaIds = args.media.split(',').map(id => id.trim());
    body.media = { media_ids: mediaIds };
  }
  
  console.log('Creating reply...\n');
  
  const data = await apiRequest('POST', '/tweets', { body });
  
  if (args.verbose) {
    console.log(JSON.stringify(data, null, 2));
    return;
  }
  
  console.log('Reply created successfully!\n');
  console.log(`ID: ${data.data.id}`);
  console.log(`Text: ${data.data.text}`);
  console.log(`\nView at: https://x.com/i/status/${data.data.id}`);
}

// Quote a tweet
async function quoteTweet(tweetId, text, args) {
  if (!text) {
    console.error('Error: Quote text is required');
    console.error('Usage: node posts.js quote <tweet_id> "Your comment"');
    process.exit(1);
  }
  
  const body = {
    text,
    quote_tweet_id: tweetId
  };
  
  // Add media if provided
  if (args.media) {
    const mediaIds = args.media.split(',').map(id => id.trim());
    body.media = { media_ids: mediaIds };
  }
  
  console.log('Creating quote tweet...\n');
  
  const data = await apiRequest('POST', '/tweets', { body });
  
  if (args.verbose) {
    console.log(JSON.stringify(data, null, 2));
    return;
  }
  
  console.log('Quote tweet created successfully!\n');
  console.log(`ID: ${data.data.id}`);
  console.log(`Text: ${data.data.text}`);
  console.log(`\nView at: https://x.com/i/status/${data.data.id}`);
}

// Retweet
async function retweet(tweetId, args) {
  const userId = await getAuthenticatedUserId();
  
  console.log('Creating retweet...\n');
  
  const data = await apiRequest('POST', `/users/${userId}/retweets`, {
    body: { tweet_id: tweetId }
  });
  
  if (args.verbose) {
    console.log(JSON.stringify(data, null, 2));
    return;
  }
  
  if (data.data.retweeted) {
    console.log('Retweeted successfully!');
  } else {
    console.log('Retweet may have failed. Check the tweet.');
  }
}

// Undo retweet
async function unretweet(tweetId, args) {
  const userId = await getAuthenticatedUserId();
  
  const confirmed = await confirmDestructiveAction(
    `Remove retweet of: ${tweetId}`,
    [],
    args.force
  );
  
  if (!confirmed) return;
  
  const data = await apiRequest('DELETE', `/users/${userId}/retweets/${tweetId}`);
  
  if (args.verbose) {
    console.log(JSON.stringify(data, null, 2));
    return;
  }
  
  console.log('Retweet removed successfully.');
}

// Main
async function main() {
  const command = args._[0];
  
  try {
    switch (command) {
      case 'create':
        await createTweet(args._[1], args);
        break;
      case 'get':
        if (!args._[1]) {
          console.error('Error: Tweet ID required');
          console.error('Usage: node posts.js get <id>');
          process.exit(1);
        }
        await getTweet(args._[1], args);
        break;
      case 'delete':
        if (!args._[1]) {
          console.error('Error: Tweet ID required');
          console.error('Usage: node posts.js delete <id>');
          process.exit(1);
        }
        await deleteTweet(args._[1], args);
        break;
      case 'reply':
        if (!args._[1]) {
          console.error('Error: Tweet ID required');
          console.error('Usage: node posts.js reply <id> "text"');
          process.exit(1);
        }
        await replyToTweet(args._[1], args._[2], args);
        break;
      case 'quote':
        if (!args._[1]) {
          console.error('Error: Tweet ID required');
          console.error('Usage: node posts.js quote <id> "text"');
          process.exit(1);
        }
        await quoteTweet(args._[1], args._[2], args);
        break;
      case 'retweet':
        if (!args._[1]) {
          console.error('Error: Tweet ID required');
          console.error('Usage: node posts.js retweet <id>');
          process.exit(1);
        }
        await retweet(args._[1], args);
        break;
      case 'unretweet':
        if (!args._[1]) {
          console.error('Error: Tweet ID required');
          console.error('Usage: node posts.js unretweet <id>');
          process.exit(1);
        }
        await unretweet(args._[1], args);
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
