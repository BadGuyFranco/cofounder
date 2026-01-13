#!/usr/bin/env node

/**
 * WordPress Posts Script
 * Create, read, update, delete, and schedule posts.
 */

import path from 'path';
import { fileURLToPath } from 'url';
import { initScript, parseArgs, apiRequest, listAll, showHelp, handleError, formatDate, formatStatus, truncate } from './utils.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const args = parseArgs(process.argv.slice(2));

function displayHelp() {
  showHelp('WordPress Posts', {
    'Usage': 'node scripts/posts.js <command> [options]',
    'Commands': [
      'list                List posts',
      'get <id>            Get post by ID',
      'create              Create a new post',
      'update <id>         Update a post',
      'delete <id>         Move post to trash',
      'trash <id>          Move post to trash (alias)',
      'restore <id>        Restore post from trash',
      'help                Show this help'
    ],
    'List Options': [
      '--status <status>   Filter by status (publish, draft, pending, private, future, trash)',
      '--per-page <n>      Results per page (default: 10, max: 100)',
      '--page <n>          Page number',
      '--search <term>     Search posts',
      '--author <id>       Filter by author ID',
      '--category <id>     Filter by category ID',
      '--tag <id>          Filter by tag ID',
      '--all               Get all posts (paginated)'
    ],
    'Create/Update Options': [
      '--title <title>     Post title',
      '--content <html>    Post content (HTML)',
      '--excerpt <text>    Post excerpt',
      '--status <status>   Post status (draft, publish, pending, private, future)',
      '--date <datetime>   Publish date (ISO 8601, e.g., 2025-01-15T10:00:00)',
      '--slug <slug>       URL slug',
      '--author <id>       Author user ID',
      '--categories <ids>  Category IDs (comma-separated)',
      '--tags <ids>        Tag IDs (comma-separated)',
      '--featured <id>     Featured image media ID'
    ],
    'Delete Options': [
      '--force             Permanently delete (skip trash)'
    ],
    'Examples': [
      'node scripts/posts.js list --status draft',
      'node scripts/posts.js create --title "Hello World" --content "<p>My first post</p>" --status publish',
      'node scripts/posts.js update 123 --title "Updated Title"',
      'node scripts/posts.js create --title "Scheduled" --status future --date "2025-02-01T09:00:00"'
    ]
  });
}

function formatPost(post, detailed = false) {
  const lines = [
    `ID: ${post.id}`,
    `Title: ${post.title?.rendered || 'Untitled'}`,
    `Status: ${formatStatus(post.status)}`,
    `Date: ${formatDate(post.date)}`,
    `Author: ${post.author}`,
    `Link: ${post.link}`
  ];
  
  if (detailed) {
    lines.push(`Slug: ${post.slug}`);
    lines.push(`Modified: ${formatDate(post.modified)}`);
    if (post.excerpt?.rendered) {
      lines.push(`Excerpt: ${truncate(post.excerpt.rendered, 100)}`);
    }
    if (post.categories?.length) {
      lines.push(`Categories: ${post.categories.join(', ')}`);
    }
    if (post.tags?.length) {
      lines.push(`Tags: ${post.tags.join(', ')}`);
    }
    if (post.featured_media) {
      lines.push(`Featured Media: ${post.featured_media}`);
    }
  }
  
  return lines.join('\n');
}

async function list() {
  const params = {};
  
  if (args.status) params.status = args.status;
  if (args['per-page']) params.per_page = parseInt(args['per-page']);
  if (args.page) params.page = parseInt(args.page);
  if (args.search) params.search = args.search;
  if (args.author) params.author = parseInt(args.author);
  if (args.category) params.categories = args.category;
  if (args.tag) params.tags = args.tag;
  
  // Default to 10 per page unless getting all
  if (!params.per_page && !args.all) {
    params.per_page = 10;
  }
  
  const posts = await listAll('/posts', { all: args.all, params });
  
  if (posts.length === 0) {
    console.log('No posts found.');
    return;
  }
  
  console.log(`Found ${posts.length} post(s):\n`);
  for (const post of posts) {
    console.log(formatPost(post));
    console.log('');
  }
}

async function get(id) {
  const post = await apiRequest(`/posts/${id}`, {
    params: { context: 'edit' }
  });
  
  console.log(formatPost(post, true));
  console.log('\nContent:');
  console.log(post.content?.raw || post.content?.rendered || '(empty)');
}

async function create() {
  const body = {};
  
  if (args.title) body.title = args.title;
  if (args.content) body.content = args.content;
  if (args.excerpt) body.excerpt = args.excerpt;
  if (args.status) body.status = args.status;
  if (args.date) body.date = args.date;
  if (args.slug) body.slug = args.slug;
  if (args.author) body.author = parseInt(args.author);
  if (args.featured) body.featured_media = parseInt(args.featured);
  
  if (args.categories) {
    body.categories = args.categories.split(',').map(id => parseInt(id.trim()));
  }
  if (args.tags) {
    body.tags = args.tags.split(',').map(id => parseInt(id.trim()));
  }
  
  if (!body.title) {
    console.error('Error: --title is required');
    process.exit(1);
  }
  
  // Default to draft if not specified
  if (!body.status) {
    body.status = 'draft';
  }
  
  const post = await apiRequest('/posts', { method: 'POST', body });
  
  console.log('Post created:\n');
  console.log(formatPost(post, true));
}

async function update(id) {
  const body = {};
  
  if (args.title) body.title = args.title;
  if (args.content) body.content = args.content;
  if (args.excerpt) body.excerpt = args.excerpt;
  if (args.status) body.status = args.status;
  if (args.date) body.date = args.date;
  if (args.slug) body.slug = args.slug;
  if (args.author) body.author = parseInt(args.author);
  if (args.featured) body.featured_media = parseInt(args.featured);
  
  if (args.categories) {
    body.categories = args.categories.split(',').map(id => parseInt(id.trim()));
  }
  if (args.tags) {
    body.tags = args.tags.split(',').map(id => parseInt(id.trim()));
  }
  
  if (Object.keys(body).length === 0) {
    console.error('Error: No update fields provided');
    process.exit(1);
  }
  
  const post = await apiRequest(`/posts/${id}`, { method: 'POST', body });
  
  console.log('Post updated:\n');
  console.log(formatPost(post, true));
}

async function deletePost(id, force = false) {
  const params = {};
  if (force) params.force = true;
  
  await apiRequest(`/posts/${id}`, { method: 'DELETE', params });
  
  if (force) {
    console.log(`Post ${id} permanently deleted.`);
  } else {
    console.log(`Post ${id} moved to trash.`);
  }
}

async function restore(id) {
  const post = await apiRequest(`/posts/${id}`, {
    method: 'POST',
    body: { status: 'draft' }
  });
  
  console.log('Post restored:\n');
  console.log(formatPost(post));
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
        if (!id) throw new Error('Post ID required. Usage: get <id>');
        await get(id);
        break;
      case 'create':
        await create();
        break;
      case 'update':
        if (!id) throw new Error('Post ID required. Usage: update <id>');
        await update(id);
        break;
      case 'delete':
      case 'trash':
        if (!id) throw new Error('Post ID required. Usage: delete <id>');
        await deletePost(id, args.force);
        break;
      case 'restore':
        if (!id) throw new Error('Post ID required. Usage: restore <id>');
        await restore(id);
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
