#!/usr/bin/env node

/**
 * Airtable Comments Script
 * Add, list, and manage comments on records.
 *
 * Usage:
 *   node comments.js list <base-id> <table-id> <record-id>
 *   node comments.js get <base-id> <table-id> <record-id> <comment-id>
 *   node comments.js create <base-id> <table-id> <record-id> --text "Comment text"
 *   node comments.js update <base-id> <table-id> <record-id> <comment-id> --text "New text"
 *   node comments.js delete <base-id> <table-id> <record-id> <comment-id> [--force]
 *   node comments.js help
 */

import { parseArgs, apiRequest } from './utils.js';
import * as readline from 'readline';

// List comments on a record
async function listComments(baseId, tableId, recordId, options, verbose) {
  const params = new URLSearchParams();

  if (options.offset) {
    params.append('offset', options.offset);
  }
  if (options.limit) {
    params.append('pageSize', options.limit);
  }

  const queryString = params.toString();
  const endpoint = `/${baseId}/${tableId}/${recordId}/comments${queryString ? '?' + queryString : ''}`;

  const data = await apiRequest(endpoint);

  const comments = data.comments || [];
  console.log(`Found ${comments.length} comment(s):\n`);

  for (const comment of comments) {
    console.log(`ID: ${comment.id}`);
    console.log(`  Author: ${comment.author?.name || comment.author?.email || 'Unknown'}`);
    console.log(`  Created: ${comment.createdTime}`);
    console.log(`  Text: ${comment.text}`);

    if (comment.mentioned) {
      const mentions = Object.values(comment.mentioned)
        .map(m => m.displayName || m.email)
        .join(', ');
      console.log(`  Mentions: ${mentions}`);
    }

    console.log('');
  }

  if (data.offset) {
    console.log(`More comments available. Use --offset "${data.offset}" to get next page.`);
  }

  if (verbose) {
    console.log('\nFull response:');
    console.log(JSON.stringify(data, null, 2));
  }

  return data;
}

// Get a specific comment
async function getComment(baseId, tableId, recordId, commentId, verbose) {
  // Airtable doesn't have a single comment endpoint, so we list and filter
  const data = await apiRequest(`/${baseId}/${tableId}/${recordId}/comments`);

  const comment = (data.comments || []).find(c => c.id === commentId);
  if (!comment) {
    console.error(`Error: Comment "${commentId}" not found`);
    process.exit(1);
  }

  console.log(`Comment: ${comment.id}`);
  console.log(`Author: ${comment.author?.name || comment.author?.email || 'Unknown'}`);
  console.log(`Created: ${comment.createdTime}`);
  console.log(`Text: ${comment.text}`);

  if (comment.mentioned) {
    console.log('\nMentions:');
    for (const [id, mention] of Object.entries(comment.mentioned)) {
      console.log(`  - ${mention.displayName || mention.email} (${id})`);
    }
  }

  if (verbose) {
    console.log('\nFull response:');
    console.log(JSON.stringify(comment, null, 2));
  }

  return comment;
}

// Create a comment
async function createComment(baseId, tableId, recordId, text, verbose) {
  const endpoint = `/${baseId}/${tableId}/${recordId}/comments`;

  const data = await apiRequest(endpoint, {
    method: 'POST',
    body: { text }
  });

  console.log('Created comment:');
  console.log(`  ID: ${data.id}`);
  console.log(`  Author: ${data.author?.name || data.author?.email || 'Unknown'}`);
  console.log(`  Text: ${data.text}`);

  if (verbose) {
    console.log('\nFull response:');
    console.log(JSON.stringify(data, null, 2));
  }

  return data;
}

// Update a comment
async function updateComment(baseId, tableId, recordId, commentId, text, verbose) {
  const endpoint = `/${baseId}/${tableId}/${recordId}/comments/${commentId}`;

  const data = await apiRequest(endpoint, {
    method: 'PATCH',
    body: { text }
  });

  console.log('Updated comment:');
  console.log(`  ID: ${data.id}`);
  console.log(`  Text: ${data.text}`);

  if (verbose) {
    console.log('\nFull response:');
    console.log(JSON.stringify(data, null, 2));
  }

  return data;
}

// Delete a comment
async function deleteComment(baseId, tableId, recordId, commentId, force, verbose) {
  if (!force) {
    const confirmed = await confirmDelete(commentId);
    if (!confirmed) {
      console.log('Delete cancelled.');
      return null;
    }
  }

  const endpoint = `/${baseId}/${tableId}/${recordId}/comments/${commentId}`;

  await apiRequest(endpoint, {
    method: 'DELETE'
  });

  console.log(`Deleted comment: ${commentId}`);

  return { deleted: true, id: commentId };
}

// Confirm deletion
async function confirmDelete(commentId) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  return new Promise((resolve) => {
    rl.question(`Are you sure you want to delete comment ${commentId}? (yes/no): `, (answer) => {
      rl.close();
      resolve(answer.toLowerCase() === 'yes' || answer.toLowerCase() === 'y');
    });
  });
}

// Show help
function showHelp() {
  console.log('Airtable Comments Script');
  console.log('');
  console.log('Commands:');
  console.log('  list <base-id> <table-id> <record-id>                    List comments');
  console.log('  get <base-id> <table-id> <record-id> <comment-id>        Get a comment');
  console.log('  create <base-id> <table-id> <record-id> --text "..."     Add a comment');
  console.log('  update <base-id> <table-id> <record-id> <cmt-id> --text  Update a comment');
  console.log('  delete <base-id> <table-id> <record-id> <comment-id>     Delete a comment');
  console.log('  help                                                     Show this help');
  console.log('');
  console.log('Options:');
  console.log('  --text <text>          Comment text (required for create/update)');
  console.log('  --offset <token>       Pagination offset');
  console.log('  --limit <n>            Max comments per page');
  console.log('  --verbose              Show full API responses');
  console.log('  --force                Skip delete confirmation');
  console.log('');
  console.log('Examples:');
  console.log('  # List comments on a record');
  console.log('  node comments.js list appXXX tblXXX recXXX');
  console.log('');
  console.log('  # Add a comment');
  console.log('  node comments.js create appXXX tblXXX recXXX --text "This looks good!"');
  console.log('');
  console.log('  # Add a comment with @mention');
  console.log('  node comments.js create appXXX tblXXX recXXX --text "Hey @[usrXXX] check this"');
  console.log('');
  console.log('  # Update a comment');
  console.log('  node comments.js update appXXX tblXXX recXXX comXXX --text "Updated text"');
  console.log('');
  console.log('  # Delete a comment');
  console.log('  node comments.js delete appXXX tblXXX recXXX comXXX');
  console.log('');
  console.log('Mentioning Users:');
  console.log('  Use @[usrXXX] syntax to mention users by their user ID.');
  console.log('  The user will receive a notification.');
  console.log('');
  console.log('Notes:');
  console.log('  - Comment IDs start with "com"');
  console.log('  - You can only edit/delete your own comments');
  console.log('  - Mentions require the user ID (usrXXX format)');
}

// Main
async function main() {
  const args = parseArgs(process.argv.slice(2));
  const command = args._[0];
  const verbose = args.verbose || false;

  try {
    switch (command) {
      case 'list': {
        const baseId = args._[1];
        const tableId = args._[2];
        const recordId = args._[3];

        if (!baseId || !tableId || !recordId) {
          console.error('Error: Base ID, Table ID, and Record ID are required');
          console.error('Usage: node comments.js list <base-id> <table-id> <record-id>');
          process.exit(1);
        }

        await listComments(baseId, tableId, recordId, {
          offset: args.offset,
          limit: args.limit
        }, verbose);
        break;
      }

      case 'get': {
        const baseId = args._[1];
        const tableId = args._[2];
        const recordId = args._[3];
        const commentId = args._[4];

        if (!baseId || !tableId || !recordId || !commentId) {
          console.error('Error: Base ID, Table ID, Record ID, and Comment ID are required');
          console.error('Usage: node comments.js get <base-id> <table-id> <record-id> <comment-id>');
          process.exit(1);
        }

        await getComment(baseId, tableId, recordId, commentId, verbose);
        break;
      }

      case 'create': {
        const baseId = args._[1];
        const tableId = args._[2];
        const recordId = args._[3];
        const text = args.text;

        if (!baseId || !tableId || !recordId) {
          console.error('Error: Base ID, Table ID, and Record ID are required');
          console.error('Usage: node comments.js create <base-id> <table-id> <record-id> --text "..."');
          process.exit(1);
        }

        if (!text) {
          console.error('Error: --text is required');
          console.error('Usage: node comments.js create <base-id> <table-id> <record-id> --text "..."');
          process.exit(1);
        }

        await createComment(baseId, tableId, recordId, text, verbose);
        break;
      }

      case 'update': {
        const baseId = args._[1];
        const tableId = args._[2];
        const recordId = args._[3];
        const commentId = args._[4];
        const text = args.text;

        if (!baseId || !tableId || !recordId || !commentId) {
          console.error('Error: Base ID, Table ID, Record ID, and Comment ID are required');
          console.error('Usage: node comments.js update <base-id> <table-id> <record-id> <comment-id> --text "..."');
          process.exit(1);
        }

        if (!text) {
          console.error('Error: --text is required');
          console.error('Usage: node comments.js update <base-id> <table-id> <record-id> <comment-id> --text "..."');
          process.exit(1);
        }

        await updateComment(baseId, tableId, recordId, commentId, text, verbose);
        break;
      }

      case 'delete': {
        const baseId = args._[1];
        const tableId = args._[2];
        const recordId = args._[3];
        const commentId = args._[4];

        if (!baseId || !tableId || !recordId || !commentId) {
          console.error('Error: Base ID, Table ID, Record ID, and Comment ID are required');
          console.error('Usage: node comments.js delete <base-id> <table-id> <record-id> <comment-id>');
          process.exit(1);
        }

        await deleteComment(baseId, tableId, recordId, commentId, args.force, verbose);
        break;
      }

      case 'help':
      default:
        showHelp();
        break;
    }
  } catch (error) {
    console.error('Error:', error.message);
    if (error.type) {
      console.error('Type:', error.type);
    }
    if (verbose && error.details) {
      console.error('Details:', JSON.stringify(error.details, null, 2));
    }
    process.exit(1);
  }
}

main();
