#!/usr/bin/env node

/**
 * WordPress Taxonomies Script
 * Manage categories and tags.
 */

import path from 'path';
import { fileURLToPath } from 'url';
import { initScript, parseArgs, apiRequest, listAll, showHelp, handleError } from './utils.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const args = parseArgs(process.argv.slice(2));

function displayHelp() {
  showHelp('WordPress Taxonomies (Categories & Tags)', {
    'Usage': 'node scripts/taxonomies.js <command> [options]',
    'Commands': [
      'categories          List all categories',
      'category <id>       Get category by ID',
      'create-category     Create a new category',
      'update-category <id> Update a category',
      'delete-category <id> Delete a category',
      '',
      'tags                List all tags',
      'tag <id>            Get tag by ID',
      'create-tag          Create a new tag',
      'update-tag <id>     Update a tag',
      'delete-tag <id>     Delete a tag',
      '',
      'help                Show this help'
    ],
    'List Options': [
      '--per-page <n>      Results per page (default: 100)',
      '--search <term>     Search by name',
      '--parent <id>       Filter categories by parent',
      '--all               Get all items (paginated)'
    ],
    'Create/Update Options': [
      '--name <name>       Term name (required for create)',
      '--slug <slug>       URL slug',
      '--description <text> Description',
      '--parent <id>       Parent category ID (categories only)'
    ],
    'Delete Options': [
      '--force             Required for deletion'
    ],
    'Examples': [
      'node scripts/taxonomies.js categories',
      'node scripts/taxonomies.js create-category --name "Tech" --description "Technology posts"',
      'node scripts/taxonomies.js tags --search "javascript"',
      'node scripts/taxonomies.js create-tag --name "React" --slug "react-js"'
    ]
  });
}

function formatTerm(term, type = 'category') {
  const lines = [
    `ID: ${term.id}`,
    `Name: ${term.name}`,
    `Slug: ${term.slug}`,
    `Count: ${term.count} post(s)`
  ];
  
  if (term.description) {
    lines.push(`Description: ${term.description}`);
  }
  
  if (type === 'category' && term.parent) {
    lines.push(`Parent: ${term.parent}`);
  }
  
  if (term.link) {
    lines.push(`Link: ${term.link}`);
  }
  
  return lines.join('\n');
}

// Categories
async function listCategories() {
  const params = {};
  
  if (args['per-page']) params.per_page = parseInt(args['per-page']);
  if (args.search) params.search = args.search;
  if (args.parent) params.parent = parseInt(args.parent);
  
  if (!params.per_page) params.per_page = 100;
  
  const items = await listAll('/categories', { all: args.all, params });
  
  if (items.length === 0) {
    console.log('No categories found.');
    return;
  }
  
  console.log(`Found ${items.length} category(s):\n`);
  for (const item of items) {
    console.log(formatTerm(item, 'category'));
    console.log('');
  }
}

async function getCategory(id) {
  const term = await apiRequest(`/categories/${id}`);
  console.log(formatTerm(term, 'category'));
}

async function createCategory() {
  const body = {};
  
  if (args.name) body.name = args.name;
  if (args.slug) body.slug = args.slug;
  if (args.description) body.description = args.description;
  if (args.parent) body.parent = parseInt(args.parent);
  
  if (!body.name) {
    console.error('Error: --name is required');
    process.exit(1);
  }
  
  const term = await apiRequest('/categories', { method: 'POST', body });
  
  console.log('Category created:\n');
  console.log(formatTerm(term, 'category'));
}

async function updateCategory(id) {
  const body = {};
  
  if (args.name) body.name = args.name;
  if (args.slug) body.slug = args.slug;
  if (args.description) body.description = args.description;
  if (args.parent) body.parent = parseInt(args.parent);
  
  if (Object.keys(body).length === 0) {
    console.error('Error: No update fields provided');
    process.exit(1);
  }
  
  const term = await apiRequest(`/categories/${id}`, { method: 'POST', body });
  
  console.log('Category updated:\n');
  console.log(formatTerm(term, 'category'));
}

async function deleteCategory(id, force = false) {
  if (!force) {
    console.error('Error: Category deletion requires --force flag');
    process.exit(1);
  }
  
  await apiRequest(`/categories/${id}`, { method: 'DELETE', params: { force: true } });
  console.log(`Category ${id} deleted.`);
}

// Tags
async function listTags() {
  const params = {};
  
  if (args['per-page']) params.per_page = parseInt(args['per-page']);
  if (args.search) params.search = args.search;
  
  if (!params.per_page) params.per_page = 100;
  
  const items = await listAll('/tags', { all: args.all, params });
  
  if (items.length === 0) {
    console.log('No tags found.');
    return;
  }
  
  console.log(`Found ${items.length} tag(s):\n`);
  for (const item of items) {
    console.log(formatTerm(item, 'tag'));
    console.log('');
  }
}

async function getTag(id) {
  const term = await apiRequest(`/tags/${id}`);
  console.log(formatTerm(term, 'tag'));
}

async function createTag() {
  const body = {};
  
  if (args.name) body.name = args.name;
  if (args.slug) body.slug = args.slug;
  if (args.description) body.description = args.description;
  
  if (!body.name) {
    console.error('Error: --name is required');
    process.exit(1);
  }
  
  const term = await apiRequest('/tags', { method: 'POST', body });
  
  console.log('Tag created:\n');
  console.log(formatTerm(term, 'tag'));
}

async function updateTag(id) {
  const body = {};
  
  if (args.name) body.name = args.name;
  if (args.slug) body.slug = args.slug;
  if (args.description) body.description = args.description;
  
  if (Object.keys(body).length === 0) {
    console.error('Error: No update fields provided');
    process.exit(1);
  }
  
  const term = await apiRequest(`/tags/${id}`, { method: 'POST', body });
  
  console.log('Tag updated:\n');
  console.log(formatTerm(term, 'tag'));
}

async function deleteTag(id, force = false) {
  if (!force) {
    console.error('Error: Tag deletion requires --force flag');
    process.exit(1);
  }
  
  await apiRequest(`/tags/${id}`, { method: 'DELETE', params: { force: true } });
  console.log(`Tag ${id} deleted.`);
}

async function main() {
  initScript(__dirname, args);
  
  const command = args._[0] || 'help';
  const id = args._[1];
  
  try {
    switch (command) {
      // Categories
      case 'categories':
        await listCategories();
        break;
      case 'category':
        if (!id) throw new Error('Category ID required. Usage: category <id>');
        await getCategory(id);
        break;
      case 'create-category':
        await createCategory();
        break;
      case 'update-category':
        if (!id) throw new Error('Category ID required. Usage: update-category <id>');
        await updateCategory(id);
        break;
      case 'delete-category':
        if (!id) throw new Error('Category ID required. Usage: delete-category <id>');
        await deleteCategory(id, args.force);
        break;
      
      // Tags
      case 'tags':
        await listTags();
        break;
      case 'tag':
        if (!id) throw new Error('Tag ID required. Usage: tag <id>');
        await getTag(id);
        break;
      case 'create-tag':
        await createTag();
        break;
      case 'update-tag':
        if (!id) throw new Error('Tag ID required. Usage: update-tag <id>');
        await updateTag(id);
        break;
      case 'delete-tag':
        if (!id) throw new Error('Tag ID required. Usage: delete-tag <id>');
        await deleteTag(id, args.force);
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
