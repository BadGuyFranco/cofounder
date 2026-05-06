#!/usr/bin/env node

import {
  initScript,
  normalizeListing,
  outputError,
  printJson,
  redditRequest,
  showHelp
} from './utils.js';

function printHelp() {
  showHelp('Reddit Comments', {
    Commands: [
      'post <post-id-or-url>    List comments on a post',
      'user <username>          List comments by a user',
      'help                     Show this help'
    ],
    Options: [
      '--sort <sort>            best, top, new, controversial, old, qa. Default: best',
      '--limit <number>         Result limit, default: 25',
      '--after <token>          Pagination cursor for user comments',
      '--verbose                Include raw API response'
    ],
    Examples: [
      'node scripts/comments.js post abc123 --sort top --limit 50',
      'node scripts/comments.js user spez --limit 10'
    ]
  });
}

function extractPostId(value) {
  const raw = String(value || '').trim();
  const urlMatch = raw.match(/\/comments\/([a-z0-9]+)/i);
  if (urlMatch) return urlMatch[1];
  return raw.replace(/^t3_/i, '');
}

async function postComments(credentials, value, args) {
  if (!value) throw new Error('Post ID or URL required. Usage: post <post-id-or-url>');
  const { data, rateLimit } = await redditRequest(`/comments/${extractPostId(value)}`, {
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

async function userComments(credentials, username, args) {
  if (!username) throw new Error('Username required. Usage: user <username>');
  const { data, rateLimit } = await redditRequest(`/user/${username}/comments`, {
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
      case 'post':
        await postComments(credentials, args._[1], args);
        break;
      case 'user':
        await userComments(credentials, args._[1], args);
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
