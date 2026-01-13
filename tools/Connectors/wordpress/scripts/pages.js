#!/usr/bin/env node

/**
 * WordPress Pages Script
 * Create, read, update, and delete pages.
 */

import path from 'path';
import { fileURLToPath } from 'url';
import { initScript, parseArgs, apiRequest, listAll, showHelp, handleError, formatDate, formatStatus, truncate } from './utils.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const args = parseArgs(process.argv.slice(2));

function displayHelp() {
  showHelp('WordPress Pages', {
    'Usage': 'node scripts/pages.js <command> [options]',
    'Commands': [
      'list                List pages',
      'get <id>            Get page by ID',
      'create              Create a new page',
      'update <id>         Update a page',
      'delete <id>         Move page to trash',
      'restore <id>        Restore page from trash',
      'help                Show this help'
    ],
    'List Options': [
      '--status <status>   Filter by status (publish, draft, pending, private, trash)',
      '--per-page <n>      Results per page (default: 10, max: 100)',
      '--page <n>          Page number',
      '--search <term>     Search pages',
      '--parent <id>       Filter by parent page ID',
      '--all               Get all pages (paginated)'
    ],
    'Create/Update Options': [
      '--title <title>     Page title',
      '--content <html>    Page content (HTML)',
      '--excerpt <text>    Page excerpt',
      '--status <status>   Page status (draft, publish, pending, private)',
      '--slug <slug>       URL slug',
      '--parent <id>       Parent page ID (for hierarchical pages)',
      '--menu-order <n>    Menu order (for sorting)',
      '--author <id>       Author user ID',
      '--featured <id>     Featured image media ID',
      '--template <name>   Page template file name'
    ],
    'Delete Options': [
      '--force             Permanently delete (skip trash)'
    ],
    'Examples': [
      'node scripts/pages.js list',
      'node scripts/pages.js create --title "About Us" --content "<p>About our company</p>" --status publish',
      'node scripts/pages.js update 45 --title "Updated About" --template "page-full-width.php"'
    ]
  });
}

function formatPage(page, detailed = false) {
  const lines = [
    `ID: ${page.id}`,
    `Title: ${page.title?.rendered || 'Untitled'}`,
    `Status: ${formatStatus(page.status)}`,
    `Date: ${formatDate(page.date)}`,
    `Link: ${page.link}`
  ];
  
  if (detailed) {
    lines.push(`Slug: ${page.slug}`);
    lines.push(`Author: ${page.author}`);
    lines.push(`Modified: ${formatDate(page.modified)}`);
    if (page.parent) {
      lines.push(`Parent: ${page.parent}`);
    }
    if (page.menu_order) {
      lines.push(`Menu Order: ${page.menu_order}`);
    }
    if (page.template) {
      lines.push(`Template: ${page.template}`);
    }
    if (page.featured_media) {
      lines.push(`Featured Media: ${page.featured_media}`);
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
  if (args.parent) params.parent = parseInt(args.parent);
  
  if (!params.per_page && !args.all) {
    params.per_page = 10;
  }
  
  const pages = await listAll('/pages', { all: args.all, params });
  
  if (pages.length === 0) {
    console.log('No pages found.');
    return;
  }
  
  console.log(`Found ${pages.length} page(s):\n`);
  for (const page of pages) {
    console.log(formatPage(page));
    console.log('');
  }
}

async function get(id) {
  const page = await apiRequest(`/pages/${id}`, {
    params: { context: 'edit' }
  });
  
  console.log(formatPage(page, true));
  console.log('\nContent:');
  console.log(page.content?.raw || page.content?.rendered || '(empty)');
}

async function create() {
  const body = {};
  
  if (args.title) body.title = args.title;
  if (args.content) body.content = args.content;
  if (args.excerpt) body.excerpt = args.excerpt;
  if (args.status) body.status = args.status;
  if (args.slug) body.slug = args.slug;
  if (args.parent) body.parent = parseInt(args.parent);
  if (args['menu-order']) body.menu_order = parseInt(args['menu-order']);
  if (args.author) body.author = parseInt(args.author);
  if (args.featured) body.featured_media = parseInt(args.featured);
  if (args.template) body.template = args.template;
  
  if (!body.title) {
    console.error('Error: --title is required');
    process.exit(1);
  }
  
  if (!body.status) {
    body.status = 'draft';
  }
  
  const page = await apiRequest('/pages', { method: 'POST', body });
  
  console.log('Page created:\n');
  console.log(formatPage(page, true));
}

async function update(id) {
  const body = {};
  
  if (args.title) body.title = args.title;
  if (args.content) body.content = args.content;
  if (args.excerpt) body.excerpt = args.excerpt;
  if (args.status) body.status = args.status;
  if (args.slug) body.slug = args.slug;
  if (args.parent) body.parent = parseInt(args.parent);
  if (args['menu-order']) body.menu_order = parseInt(args['menu-order']);
  if (args.author) body.author = parseInt(args.author);
  if (args.featured) body.featured_media = parseInt(args.featured);
  if (args.template) body.template = args.template;
  
  if (Object.keys(body).length === 0) {
    console.error('Error: No update fields provided');
    process.exit(1);
  }
  
  const page = await apiRequest(`/pages/${id}`, { method: 'POST', body });
  
  console.log('Page updated:\n');
  console.log(formatPage(page, true));
}

async function deletePage(id, force = false) {
  const params = {};
  if (force) params.force = true;
  
  await apiRequest(`/pages/${id}`, { method: 'DELETE', params });
  
  if (force) {
    console.log(`Page ${id} permanently deleted.`);
  } else {
    console.log(`Page ${id} moved to trash.`);
  }
}

async function restore(id) {
  const page = await apiRequest(`/pages/${id}`, {
    method: 'POST',
    body: { status: 'draft' }
  });
  
  console.log('Page restored:\n');
  console.log(formatPage(page));
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
        if (!id) throw new Error('Page ID required. Usage: get <id>');
        await get(id);
        break;
      case 'create':
        await create();
        break;
      case 'update':
        if (!id) throw new Error('Page ID required. Usage: update <id>');
        await update(id);
        break;
      case 'delete':
      case 'trash':
        if (!id) throw new Error('Page ID required. Usage: delete <id>');
        await deletePage(id, args.force);
        break;
      case 'restore':
        if (!id) throw new Error('Page ID required. Usage: restore <id>');
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
