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
      'tweets <query>             Search recent tweets',
      'help                       Show this help'
    ],
    'Options': [
      '--limit <n>                Max results (default: 10, max: 100)',
      '--since <id>               Only tweets after this tweet ID',
      '--until <id>               Only tweets before this tweet ID',
      '--start <date>             Start time (ISO 8601)',
      '--end <date>               End time (ISO 8601)',
      '--sort <order>             Sort: recency (default) or relevancy',
      '--verbose                  Show full API response'
    ],
    'Query Syntax': [
      'Basic:     node search.js tweets "machine learning"',
      'Exact:     node search.js tweets "\\"deep learning\\""',
      'From user: node search.js tweets "from:elonmusk"',
      'To user:   node search.js tweets "to:elonmusk"',
      'Hashtag:   node search.js tweets "#AI"',
      'Mention:   node search.js tweets "@openai"',
      'URL:       node search.js tweets "url:github.com"',
      'Exclude:   node search.js tweets "AI -crypto"',
      'OR:        node search.js tweets "(AI OR ML)"',
      'Min likes: node search.js tweets "AI min_faves:100"',
      'Min RTs:   node search.js tweets "AI min_retweets:50"',
      'Has media: node search.js tweets "AI has:media"',
      'Has link:  node search.js tweets "AI has:links"',
      'Language:  node search.js tweets "AI lang:en"',
      'No RTs:    node search.js tweets "AI -is:retweet"'
    ],
    'Examples': [
      'node search.js tweets "AI agents" --limit 20',
      'node search.js tweets "from:elonmusk AI" --limit 10',
      'node search.js tweets "#startups has:links" --sort relevancy',
      'node search.js tweets "AI min_faves:1000 lang:en -is:retweet"'
    ],
    'Notes': [
      'Free tier: Recent tweets only (last 7 days)',
      'Basic tier: Recent tweets with more rate limits',
      'Pro tier: Full archive search available',
      'Search is rate-limited; use judiciously'
    ]
  });
}

const TWEET_FIELDS = 'created_at,public_metrics,author_id,conversation_id,in_reply_to_user_id';
const USER_FIELDS = 'name,username';
const EXPANSIONS = 'author_id';

// Search recent tweets
async function searchTweets(query, args) {
  const limit = parseInt(args.limit) || 10;
  
  const params = {
    query,
    'tweet.fields': TWEET_FIELDS,
    'user.fields': USER_FIELDS,
    'expansions': EXPANSIONS,
    max_results: Math.min(limit, 100)
  };
  
  if (args.since) params.since_id = args.since;
  if (args.until) params.until_id = args.until;
  if (args.start) params.start_time = args.start;
  if (args.end) params.end_time = args.end;
  if (args.sort) params.sort_order = args.sort;
  
  console.log(`Searching for "${query}"...\n`);
  
  const data = await apiRequest('GET', '/tweets/search/recent', { params });
  
  if (args.verbose) {
    console.log(JSON.stringify(data, null, 2));
    return;
  }
  
  const tweets = data.data || [];
  const meta = data.meta || {};
  
  console.log(`Found ${meta.result_count || tweets.length} tweets:\n`);
  
  for (const tweet of tweets) {
    const author = data.includes?.users?.find(u => u.id === tweet.author_id);
    const metrics = tweet.public_metrics || {};
    
    const authorName = author ? `${author.name} (@${author.username})` : tweet.author_id;
    
    console.log(`${authorName}`);
    console.log(`${tweet.text}`);
    console.log(`  ${formatDate(tweet.created_at)} | ❤️ ${metrics.like_count || 0} | 🔁 ${metrics.retweet_count || 0} | 💬 ${metrics.reply_count || 0}`);
    console.log(`  ID: ${tweet.id}`);
    console.log(`  https://x.com/i/status/${tweet.id}`);
    console.log('');
  }
  
  if (meta.next_token) {
    console.log('More results available. Use pagination for full results.');
  }
}

// Main
async function main() {
  const command = args._[0];
  
  try {
    switch (command) {
      case 'tweets':
        if (!args._[1]) {
          console.error('Error: Search query required');
          console.error('Usage: node search.js tweets "your query"');
          process.exit(1);
        }
        await searchTweets(args._[1], args);
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
