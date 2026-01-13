#!/usr/bin/env node

/**
 * WordPress Comments Script
 * List, get, create, update, and moderate comments.
 */

import path from 'path';
import { fileURLToPath } from 'url';
import { initScript, parseArgs, apiRequest, listAll, showHelp, handleError, formatDate, truncate } from './utils.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const args = parseArgs(process.argv.slice(2));

function displayHelp() {
  showHelp('WordPress Comments', {
    'Usage': 'node scripts/comments.js <command> [options]',
    'Commands': [
      'list                List comments',
      'get <id>            Get comment by ID',
      'create              Create a new comment',
      'update <id>         Update a comment',
      'approve <id>        Approve a comment',
      'unapprove <id>      Unapprove (hold) a comment',
      'spam <id>           Mark as spam',
      'trash <id>          Move to trash',
      'delete <id>         Permanently delete',
      'help                Show this help'
    ],
    'List Options': [
      '--status <status>   Filter by status (approved, hold, spam, trash, all)',
      '--post <id>         Filter by post ID',
      '--author <id>       Filter by author user ID',
      '--per-page <n>      Results per page (default: 10)',
      '--page <n>          Page number',
      '--search <term>     Search comments',
      '--all               Get all comments (paginated)'
    ],
    'Create/Update Options': [
      '--post <id>         Post ID (required for create)',
      '--content <text>    Comment content',
      '--author-name <n>   Author name (for anonymous)',
      '--author-email <e>  Author email (for anonymous)',
      '--author-url <url>  Author URL (optional)',
      '--parent <id>       Parent comment ID (for replies)',
      '--status <status>   Comment status'
    ],
    'Examples': [
      'node scripts/comments.js list --status hold',
      'node scripts/comments.js list --post 123',
      'node scripts/comments.js approve 456',
      'node scripts/comments.js create --post 123 --content "Great article!"'
    ]
  });
}

function formatComment(comment, detailed = false) {
  const statusMap = {
    approved: 'Approved',
    hold: 'Pending',
    spam: 'Spam',
    trash: 'Trash'
  };
  
  const lines = [
    `ID: ${comment.id}`,
    `Post: ${comment.post}`,
    `Author: ${comment.author_name} <${comment.author_email || 'no email'}>`,
    `Status: ${statusMap[comment.status] || comment.status}`,
    `Date: ${formatDate(comment.date)}`
  ];
  
  if (comment.parent) {
    lines.push(`Reply to: ${comment.parent}`);
  }
  
  if (detailed) {
    lines.push(`\nContent:\n${comment.content?.rendered || comment.content?.raw || '(empty)'}`);
    if (comment.author_url) {
      lines.push(`Author URL: ${comment.author_url}`);
    }
    if (comment.author_ip) {
      lines.push(`Author IP: ${comment.author_ip}`);
    }
  } else {
    const content = comment.content?.rendered || '';
    const plain = content.replace(/<[^>]*>/g, '');
    lines.push(`Content: ${truncate(plain, 80)}`);
  }
  
  return lines.join('\n');
}

async function list() {
  const params = {};
  
  if (args.status) params.status = args.status === 'all' ? 'any' : args.status;
  if (args.post) params.post = parseInt(args.post);
  if (args.author) params.author = parseInt(args.author);
  if (args['per-page']) params.per_page = parseInt(args['per-page']);
  if (args.page) params.page = parseInt(args.page);
  if (args.search) params.search = args.search;
  
  if (!params.per_page && !args.all) {
    params.per_page = 10;
  }
  
  const items = await listAll('/comments', { all: args.all, params });
  
  if (items.length === 0) {
    console.log('No comments found.');
    return;
  }
  
  console.log(`Found ${items.length} comment(s):\n`);
  for (const item of items) {
    console.log(formatComment(item));
    console.log('');
  }
}

async function get(id) {
  const comment = await apiRequest(`/comments/${id}`, {
    params: { context: 'edit' }
  });
  console.log(formatComment(comment, true));
}

async function create() {
  const body = {};
  
  if (args.post) body.post = parseInt(args.post);
  if (args.content) body.content = args.content;
  if (args['author-name']) body.author_name = args['author-name'];
  if (args['author-email']) body.author_email = args['author-email'];
  if (args['author-url']) body.author_url = args['author-url'];
  if (args.parent) body.parent = parseInt(args.parent);
  if (args.status) body.status = args.status;
  
  if (!body.post) {
    console.error('Error: --post is required');
    process.exit(1);
  }
  
  if (!body.content) {
    console.error('Error: --content is required');
    process.exit(1);
  }
  
  const comment = await apiRequest('/comments', { method: 'POST', body });
  
  console.log('Comment created:\n');
  console.log(formatComment(comment, true));
}

async function update(id) {
  const body = {};
  
  if (args.content) body.content = args.content;
  if (args['author-name']) body.author_name = args['author-name'];
  if (args['author-email']) body.author_email = args['author-email'];
  if (args['author-url']) body.author_url = args['author-url'];
  if (args.status) body.status = args.status;
  
  if (Object.keys(body).length === 0) {
    console.error('Error: No update fields provided');
    process.exit(1);
  }
  
  const comment = await apiRequest(`/comments/${id}`, { method: 'POST', body });
  
  console.log('Comment updated:\n');
  console.log(formatComment(comment, true));
}

async function setStatus(id, status) {
  const comment = await apiRequest(`/comments/${id}`, {
    method: 'POST',
    body: { status }
  });
  
  const statusLabels = {
    approved: 'approved',
    hold: 'held for moderation',
    spam: 'marked as spam',
    trash: 'moved to trash'
  };
  
  console.log(`Comment ${id} ${statusLabels[status] || status}.`);
}

async function deleteComment(id) {
  await apiRequest(`/comments/${id}`, { method: 'DELETE', params: { force: true } });
  console.log(`Comment ${id} permanently deleted.`);
}

async function main() {
  initScript(__dirname, args);
  
  const command = args._[0] || 'help';
  const id = args._[1];
  
  try {
    switch (command) {
      case 'list':
        await list();
        break;
      case 'get':
        if (!id) throw new Error('Comment ID required. Usage: get <id>');
        await get(id);
        break;
      case 'create':
        await create();
        break;
      case 'update':
        if (!id) throw new Error('Comment ID required. Usage: update <id>');
        await update(id);
        break;
      case 'approve':
        if (!id) throw new Error('Comment ID required. Usage: approve <id>');
        await setStatus(id, 'approved');
        break;
      case 'unapprove':
      case 'hold':
        if (!id) throw new Error('Comment ID required. Usage: unapprove <id>');
        await setStatus(id, 'hold');
        break;
      case 'spam':
        if (!id) throw new Error('Comment ID required. Usage: spam <id>');
        await setStatus(id, 'spam');
        break;
      case 'trash':
        if (!id) throw new Error('Comment ID required. Usage: trash <id>');
        await setStatus(id, 'trash');
        break;
      case 'delete':
        if (!id) throw new Error('Comment ID required. Usage: delete <id>');
        await deleteComment(id);
        break;
      case 'help':
      default:
        displayHelp();
    }
  } catch (error) {
    handleError(error, args.verbose);
  }
}

main();
