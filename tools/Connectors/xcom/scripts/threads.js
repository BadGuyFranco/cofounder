#!/usr/bin/env node

/**
 * X.com Thread Creation
 * Create multi-tweet threads from text or files.
 */

import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs';
import {
  parseArgs, initScript, apiRequest, confirmDestructiveAction,
  handleError, showHelp, truncate
} from './utils.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const args = parseArgs(process.argv.slice(2));
initScript(path.join(__dirname, '..'), args);

// Help documentation
function printHelp() {
  showHelp('X.com Thread Creation', {
    'Commands': [
      'create <text1> [text2] ...  Create thread from multiple text arguments',
      'from-file <file>           Create thread from file (--- separates tweets)',
      'preview <file>             Preview thread without posting',
      'help                       Show this help'
    ],
    'Options': [
      '--delay <seconds>          Delay between tweets (default: 1)',
      '--verbose                  Show full API response',
      '--force                    Skip confirmation'
    ],
    'Examples': [
      'node threads.js create "First tweet" "Second tweet" "Third tweet"',
      'node threads.js from-file ~/thread.txt',
      'node threads.js preview ~/thread.txt'
    ],
    'File Format': [
      'Each tweet separated by --- on its own line:',
      '',
      '  This is the first tweet in the thread.',
      '  ---',
      '  This is the second tweet.',
      '  It can be multiple lines.',
      '  ---',
      '  Final tweet!'
    ],
    'Notes': [
      'Each tweet in a thread is limited to 280 characters (4,000 for Premium)',
      'The first tweet is posted, then each subsequent tweet replies to the previous',
      'If any tweet fails, the thread stops (already posted tweets remain)'
    ]
  });
}

// Split text into thread-friendly chunks
function splitIntoTweets(text, maxLength = 280) {
  const tweets = [];
  let remaining = text.trim();
  
  while (remaining.length > 0) {
    if (remaining.length <= maxLength) {
      tweets.push(remaining);
      break;
    }
    
    // Find a good break point
    let breakPoint = maxLength;
    
    // Try to break at sentence end
    const sentenceEnd = remaining.lastIndexOf('. ', maxLength);
    if (sentenceEnd > maxLength * 0.5) {
      breakPoint = sentenceEnd + 1;
    } else {
      // Try to break at word boundary
      const spaceIndex = remaining.lastIndexOf(' ', maxLength);
      if (spaceIndex > maxLength * 0.5) {
        breakPoint = spaceIndex;
      }
    }
    
    tweets.push(remaining.substring(0, breakPoint).trim());
    remaining = remaining.substring(breakPoint).trim();
  }
  
  return tweets;
}

// Parse thread file
function parseThreadFile(filePath) {
  if (!fs.existsSync(filePath)) {
    console.error(`Error: File not found: ${filePath}`);
    process.exit(1);
  }
  
  const content = fs.readFileSync(filePath, 'utf-8');
  const tweets = content.split(/\n---+\n/).map(t => t.trim()).filter(t => t.length > 0);
  
  return tweets;
}

// Preview thread
async function previewThread(tweets, args) {
  console.log(`Thread preview (${tweets.length} tweets):\n`);
  
  let hasLongTweets = false;
  
  for (let i = 0; i < tweets.length; i++) {
    const tweet = tweets[i];
    const charCount = tweet.length;
    const isLong = charCount > 280;
    
    if (isLong) hasLongTweets = true;
    
    console.log(`--- Tweet ${i + 1} of ${tweets.length} (${charCount} chars${isLong ? ' - TOO LONG!' : ''}) ---`);
    console.log(tweet);
    console.log('');
  }
  
  if (hasLongTweets) {
    console.log('WARNING: Some tweets exceed 280 characters.');
    console.log('They will fail unless you have X Premium (4,000 char limit).\n');
  }
  
  return tweets;
}

// Create thread from tweets array
async function createThread(tweets, args) {
  if (tweets.length === 0) {
    console.error('Error: No tweets to post');
    process.exit(1);
  }
  
  // Preview first
  await previewThread(tweets, args);
  
  const confirmed = await confirmDestructiveAction(
    `Post thread with ${tweets.length} tweets?`,
    [
      `First tweet: ${truncate(tweets[0], 50)}`,
      'This will post all tweets as a connected thread.'
    ],
    args.force
  );
  
  if (!confirmed) return;
  
  const delay = parseInt(args.delay) || 1;
  const postedTweets = [];
  
  console.log('Creating thread...\n');
  
  for (let i = 0; i < tweets.length; i++) {
    const tweetText = tweets[i];
    const body = { text: tweetText };
    
    // Reply to previous tweet (except for first)
    if (i > 0 && postedTweets[i - 1]) {
      body.reply = {
        in_reply_to_tweet_id: postedTweets[i - 1].id
      };
    }
    
    try {
      console.log(`Posting tweet ${i + 1}/${tweets.length}...`);
      
      const data = await apiRequest('POST', '/tweets', { body });
      postedTweets.push(data.data);
      
      if (args.verbose) {
        console.log(JSON.stringify(data, null, 2));
      } else {
        console.log(`  ID: ${data.data.id}`);
      }
      
      // Delay between tweets (except after last)
      if (i < tweets.length - 1 && delay > 0) {
        await new Promise(resolve => setTimeout(resolve, delay * 1000));
      }
    } catch (error) {
      console.error(`\nError posting tweet ${i + 1}: ${error.message}`);
      console.error('Thread creation stopped.');
      
      if (postedTweets.length > 0) {
        console.log(`\nPartially posted thread (${postedTweets.length} tweets):`);
        console.log(`View at: https://x.com/i/status/${postedTweets[0].id}`);
      }
      
      process.exit(1);
    }
  }
  
  console.log(`\nThread created successfully! (${postedTweets.length} tweets)`);
  console.log(`View at: https://x.com/i/status/${postedTweets[0].id}`);
  
  return postedTweets;
}

// Create thread from command line arguments
async function createFromArgs(args) {
  const tweets = args._.slice(1);
  
  if (tweets.length === 0) {
    console.error('Error: At least one tweet text required');
    console.error('Usage: node threads.js create "Tweet 1" "Tweet 2" ...');
    process.exit(1);
  }
  
  await createThread(tweets, args);
}

// Create thread from file
async function createFromFile(filePath, args) {
  const tweets = parseThreadFile(filePath);
  await createThread(tweets, args);
}

// Preview thread from file
async function previewFromFile(filePath, args) {
  const tweets = parseThreadFile(filePath);
  await previewThread(tweets, args);
}

// Main
async function main() {
  const command = args._[0];
  
  try {
    switch (command) {
      case 'create':
        await createFromArgs(args);
        break;
      case 'from-file':
        if (!args._[1]) {
          console.error('Error: File path required');
          console.error('Usage: node threads.js from-file <file>');
          process.exit(1);
        }
        await createFromFile(args._[1], args);
        break;
      case 'preview':
        if (!args._[1]) {
          console.error('Error: File path required');
          console.error('Usage: node threads.js preview <file>');
          process.exit(1);
        }
        await previewFromFile(args._[1], args);
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
