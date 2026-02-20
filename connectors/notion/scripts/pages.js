#!/usr/bin/env node

/**
 * Notion Pages Script
 * Create, read, update, archive, and search Notion pages.
 * 
 * Usage:
 *   node pages.js create "Title" --parent-id <id> [--content "markdown"]
 *   node pages.js read <page-id>
 *   node pages.js update <page-id> --content "content to append"
 *   node pages.js archive <page-id>
 *   node pages.js search "query"
 */

import { notion, parseArgs, handleError } from './utils.js';

// Convert markdown text to Notion blocks
function markdownToBlocks(markdown) {
  if (!markdown) return [];
  
  const lines = markdown.split('\n');
  const blocks = [];
  
  for (const line of lines) {
    if (line.trim() === '') {
      continue;
    }
    
    // Heading 1
    if (line.startsWith('# ')) {
      blocks.push({
        object: 'block',
        type: 'heading_1',
        heading_1: {
          rich_text: [{ type: 'text', text: { content: line.slice(2) } }]
        }
      });
    }
    // Heading 2
    else if (line.startsWith('## ')) {
      blocks.push({
        object: 'block',
        type: 'heading_2',
        heading_2: {
          rich_text: [{ type: 'text', text: { content: line.slice(3) } }]
        }
      });
    }
    // Heading 3
    else if (line.startsWith('### ')) {
      blocks.push({
        object: 'block',
        type: 'heading_3',
        heading_3: {
          rich_text: [{ type: 'text', text: { content: line.slice(4) } }]
        }
      });
    }
    // Bullet list
    else if (line.startsWith('- ') || line.startsWith('* ')) {
      blocks.push({
        object: 'block',
        type: 'bulleted_list_item',
        bulleted_list_item: {
          rich_text: [{ type: 'text', text: { content: line.slice(2) } }]
        }
      });
    }
    // Numbered list
    else if (/^\d+\.\s/.test(line)) {
      blocks.push({
        object: 'block',
        type: 'numbered_list_item',
        numbered_list_item: {
          rich_text: [{ type: 'text', text: { content: line.replace(/^\d+\.\s/, '') } }]
        }
      });
    }
    // Code block (simple detection)
    else if (line.startsWith('```')) {
      // Skip code fence markers for now
      continue;
    }
    // Regular paragraph
    else {
      blocks.push({
        object: 'block',
        type: 'paragraph',
        paragraph: {
          rich_text: [{ type: 'text', text: { content: line } }]
        }
      });
    }
  }
  
  return blocks;
}

// Create a new page
async function createPage(title, parentId, content, verbose) {
  const parent = parentId.includes('-') 
    ? { page_id: parentId }
    : { page_id: parentId };
  
  // Try as page first, if that fails, try as database
  let response;
  try {
    response = await notion.pages.create({
      parent,
      properties: {
        title: {
          title: [{ text: { content: title } }]
        }
      },
      children: markdownToBlocks(content)
    });
  } catch (error) {
    // If it fails, try treating parent as a database
    if (error.code === 'validation_error') {
      response = await notion.pages.create({
        parent: { database_id: parentId },
        properties: {
          Name: {
            title: [{ text: { content: title } }]
          }
        },
        children: markdownToBlocks(content)
      });
    } else {
      throw error;
    }
  }
  
  console.log(`Created page: ${title}`);
  console.log(`URL: ${response.url}`);
  console.log(`ID: ${response.id}`);
  
  if (verbose) {
    console.log('\nFull response:');
    console.log(JSON.stringify(response, null, 2));
  }
  
  return response;
}

// Read a page
async function readPage(pageId, verbose) {
  const page = await notion.pages.retrieve({ page_id: pageId });
  const blocks = await notion.blocks.children.list({ block_id: pageId });
  
  console.log('Page Properties:');
  console.log(JSON.stringify(page.properties, null, 2));
  
  console.log('\nContent Blocks:');
  console.log(JSON.stringify(blocks.results, null, 2));
  
  if (verbose) {
    console.log('\nFull page object:');
    console.log(JSON.stringify(page, null, 2));
  }
  
  return { page, blocks: blocks.results };
}

// Update a page (append content)
async function updatePage(pageId, content, verbose) {
  const blocks = markdownToBlocks(content);
  
  const response = await notion.blocks.children.append({
    block_id: pageId,
    children: blocks
  });
  
  console.log(`Updated page: ${pageId}`);
  console.log(`Added ${blocks.length} blocks`);
  
  if (verbose) {
    console.log('\nFull response:');
    console.log(JSON.stringify(response, null, 2));
  }
  
  return response;
}

// Archive a page
async function archivePage(pageId, verbose) {
  const response = await notion.pages.update({
    page_id: pageId,
    archived: true
  });
  
  console.log(`Archived page: ${pageId}`);
  
  if (verbose) {
    console.log('\nFull response:');
    console.log(JSON.stringify(response, null, 2));
  }
  
  return response;
}

// Search for pages
async function searchPages(query, verbose) {
  const response = await notion.search({
    query,
    filter: { property: 'object', value: 'page' }
  });
  
  console.log(`Found ${response.results.length} pages:\n`);
  
  for (const page of response.results) {
    const title = page.properties?.title?.title?.[0]?.plain_text 
      || page.properties?.Name?.title?.[0]?.plain_text
      || 'Untitled';
    console.log(`- ${title}`);
    console.log(`  ID: ${page.id}`);
    console.log(`  URL: ${page.url}`);
    console.log('');
  }
  
  if (verbose) {
    console.log('\nFull response:');
    console.log(JSON.stringify(response, null, 2));
  }
  
  return response.results;
}

// Main
async function main() {
  const args = parseArgs(process.argv.slice(2));
  const command = args._[0];
  const verbose = args.verbose || false;
  
  try {
    switch (command) {
      case 'create': {
        const title = args._[1];
        const parentId = args['parent-id'];
        const content = args.content || '';
        
        if (!title) {
          console.error('Error: Title is required');
          console.error('Usage: node pages.js create "Title" --parent-id <id> [--content "markdown"]');
          process.exit(1);
        }
        
        if (!parentId) {
          console.error('Error: --parent-id is required');
          console.error('Usage: node pages.js create "Title" --parent-id <id> [--content "markdown"]');
          process.exit(1);
        }
        
        await createPage(title, parentId, content, verbose);
        break;
      }
      
      case 'read': {
        const pageId = args._[1];
        
        if (!pageId) {
          console.error('Error: Page ID is required');
          console.error('Usage: node pages.js read <page-id>');
          process.exit(1);
        }
        
        await readPage(pageId, verbose);
        break;
      }
      
      case 'update': {
        const pageId = args._[1];
        const content = args.content;
        
        if (!pageId) {
          console.error('Error: Page ID is required');
          console.error('Usage: node pages.js update <page-id> --content "content"');
          process.exit(1);
        }
        
        if (!content) {
          console.error('Error: --content is required');
          console.error('Usage: node pages.js update <page-id> --content "content"');
          process.exit(1);
        }
        
        await updatePage(pageId, content, verbose);
        break;
      }
      
      case 'archive': {
        const pageId = args._[1];
        
        if (!pageId) {
          console.error('Error: Page ID is required');
          console.error('Usage: node pages.js archive <page-id>');
          process.exit(1);
        }
        
        await archivePage(pageId, verbose);
        break;
      }
      
      case 'search': {
        const query = args._[1] || '';
        await searchPages(query, verbose);
        break;
      }
      
      default:
        console.log('Notion Pages Script');
        console.log('');
        console.log('Commands:');
        console.log('  create "Title" --parent-id <id> [--content "markdown"]');
        console.log('  read <page-id>');
        console.log('  update <page-id> --content "content to append"');
        console.log('  archive <page-id>');
        console.log('  search "query"');
        console.log('');
        console.log('Options:');
        console.log('  --verbose    Show full API responses');
        process.exit(0);
    }
  } catch (error) {
    handleError(error, verbose);
  }
}

main();
