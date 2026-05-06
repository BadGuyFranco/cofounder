#!/usr/bin/env node

import {
  initScript,
  normalizeListing,
  normalizeThing,
  outputError,
  printJson,
  redditRequest,
  showHelp
} from './utils.js';

function printHelp() {
  showHelp('Reddit Posts', {
    Commands: [
      'get <post-id-or-url>     Get a post and top-level comment listing',
      'info <fullnames>         Get posts by fullname, comma-separated t3 ids',
      'user <username>          List posts submitted by a user',
      'duplicates <post-id>     Find duplicate submissions for a post',
      'help                     Show this help'
    ],
    Options: [
      '--sort <sort>            Comment sort for get, default: best',
      '--limit <number>         Result limit, default: 25',
      '--after <token>          Pagination cursor',
      '--verbose                Include raw API response'
    ],
    Examples: [
      'node scripts/posts.js get abc123',
      'node scripts/posts.js get https://www.reddit.com/r/startups/comments/abc123/title/',
      'node scripts/posts.js info t3_abc123,t3_def456',
      'node scripts/posts.js user spez --limit 10'
    ]
  });
}

function extractPostId(value) {
  const raw = String(value || '').trim();
  const urlMatch = raw.match(/\/comments\/([a-z0-9]+)/i);
  if (urlMatch) return urlMatch[1];
  return raw.replace(/^t3_/i, '');
}

function normalizeFullnames(value) {
  return String(value || '')
    .split(',')
    .map(item => item.trim())
    .filter(Boolean)
    .map(item => item.startsWith('t3_') ? item : `t3_${item}`)
    .join(',');
}

async function getPost(credentials, value, args) {
  if (!value) throw new Error('Post ID or URL required. Usage: get <post-id-or-url>');
  const postId = extractPostId(value);
  const { data, rateLimit } = await redditRequest(`/comments/${postId}`, {
    credentials,
    query: {
      sort: args.sort || 'best',
      limit: args.limit || 25
    }
  });

  const post = normalizeListing(data[0]).items[0] || null;
  const comments = normalizeListing(data[1]);
  printJson(args.verbose ? { post, comments, rateLimit, raw: data } : { post, comments, rateLimit });
}

async function info(credentials, fullnames, args) {
  if (!fullnames) throw new Error('Fullnames required. Usage: info <t3_id,t3_id>');
  const { data, rateLimit } = await redditRequest('/api/info', {
    credentials,
    query: {
      id: normalizeFullnames(fullnames)
    }
  });
  const listing = normalizeListing(data);
  printJson(args.verbose ? { listing, rateLimit, raw: data } : { ...listing, rateLimit });
}

async function userPosts(credentials, username, args) {
  if (!username) throw new Error('Username required. Usage: user <username>');
  const { data, rateLimit } = await redditRequest(`/user/${username}/submitted`, {
    credentials,
    query: {
      limit: args.limit || 25,
      after: args.after
    }
  });
  const listing = normalizeListing(data);
  printJson(args.verbose ? { listing, rateLimit, raw: data } : { ...listing, rateLimit });
}

async function duplicates(credentials, value, args) {
  if (!value) throw new Error('Post ID required. Usage: duplicates <post-id>');
  const postId = extractPostId(value);
  const { data, rateLimit } = await redditRequest(`/duplicates/${postId}`, {
    credentials,
    query: {
      limit: args.limit || 25,
      after: args.after
    }
  });

  const original = normalizeListing(data[0]).items[0] || normalizeThing(data[0]);
  const listing = normalizeListing(data[1]);
  printJson(args.verbose ? { original, duplicates: listing, rateLimit, raw: data } : { original, duplicates: listing, rateLimit });
}

async function main() {
  const init = initScript(printHelp);
  if (!init) return;

  const { credentials, args, command } = init;

  try {
    switch (command) {
      case 'get':
        await getPost(credentials, args._[1], args);
        break;
      case 'info':
        await info(credentials, args._[1], args);
        break;
      case 'user':
        await userPosts(credentials, args._[1], args);
        break;
      case 'duplicates':
        await duplicates(credentials, args._[1], args);
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
