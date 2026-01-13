#!/usr/bin/env node

/**
 * ClickUp Comments Script
 * List, create, update, and delete comments on tasks.
 *
 * Usage:
 *   node comments.js list <task-id>
 *   node comments.js create <task-id> --text "Comment text"
 *   node comments.js update <comment-id> --text "New text"
 *   node comments.js delete <comment-id> [--force]
 *   node comments.js help
 */

import { parseArgs, apiRequest, parseJSON } from './utils.js';
import * as readline from 'readline';

/**
 * Format comment for display
 */
function formatComment(comment) {
  const output = [];

  output.push(`Comment ID: ${comment.id}`);

  if (comment.user) {
    output.push(`  By: ${comment.user.username || comment.user.email}`);
  }

  if (comment.date) {
    const date = new Date(parseInt(comment.date));
    output.push(`  Date: ${date.toISOString()}`);
  }

  // Comment text can be in different formats
  const text = comment.comment_text || comment.text_content || '';
  if (text) {
    output.push(`  Text: ${text.substring(0, 200)}${text.length > 200 ? '...' : ''}`);
  }

  if (comment.resolved) {
    output.push(`  Resolved: ${comment.resolved}`);
  }

  return output.join('\n');
}

/**
 * List comments on a task
 */
async function listComments(taskId, options, verbose) {
  const params = new URLSearchParams();
  if (options.start) params.append('start', options.start);
  if (options.startId) params.append('start_id', options.startId);

  const queryString = params.toString();
  const endpoint = `/task/${taskId}/comment${queryString ? '?' + queryString : ''}`;

  const data = await apiRequest(endpoint);

  const comments = data.comments || [];
  console.log(`Found ${comments.length} comment(s):\n`);

  for (const comment of comments) {
    console.log(formatComment(comment));
    console.log('');
  }

  if (verbose) {
    console.log('\nFull response:');
    console.log(JSON.stringify(data, null, 2));
  }

  return comments;
}

/**
 * Create a comment on a task
 */
async function createComment(taskId, text, options, verbose) {
  const body = {
    comment_text: text
  };

  // Optionally notify all assignees
  if (options.notifyAll) {
    body.notify_all = true;
  }

  // Optionally assign the comment (creates an assigned comment)
  if (options.assignee) {
    body.assignee = parseInt(options.assignee);
  }

  const comment = await apiRequest(`/task/${taskId}/comment`, {
    method: 'POST',
    body
  });

  console.log('Created comment:');
  console.log(formatComment(comment));

  if (verbose) {
    console.log('\nFull response:');
    console.log(JSON.stringify(comment, null, 2));
  }

  return comment;
}

/**
 * Update a comment
 */
async function updateComment(commentId, text, options, verbose) {
  const body = {
    comment_text: text
  };

  if (options.resolved !== undefined) {
    body.resolved = options.resolved === 'true';
  }

  if (options.assignee) {
    body.assignee = parseInt(options.assignee);
  }

  const comment = await apiRequest(`/comment/${commentId}`, {
    method: 'PUT',
    body
  });

  console.log('Updated comment:');
  if (comment.id) {
    console.log(formatComment(comment));
  } else {
    console.log(`Comment ${commentId} updated successfully.`);
  }

  if (verbose) {
    console.log('\nFull response:');
    console.log(JSON.stringify(comment, null, 2));
  }

  return comment;
}

/**
 * Delete a comment
 */
async function deleteComment(commentId, force, verbose) {
  if (!force) {
    const confirmed = await confirmDelete(commentId);
    if (!confirmed) {
      console.log('Delete cancelled.');
      return null;
    }
  }

  await apiRequest(`/comment/${commentId}`, {
    method: 'DELETE'
  });

  console.log(`Deleted comment: ${commentId}`);
  return { success: true, id: commentId };
}

/**
 * List comments on a list (all comments in the list)
 */
async function listListComments(listId, options, verbose) {
  const params = new URLSearchParams();
  if (options.start) params.append('start', options.start);
  if (options.startId) params.append('start_id', options.startId);

  const queryString = params.toString();
  const endpoint = `/list/${listId}/comment${queryString ? '?' + queryString : ''}`;

  const data = await apiRequest(endpoint);

  const comments = data.comments || [];
  console.log(`Found ${comments.length} comment(s) on list:\n`);

  for (const comment of comments) {
    console.log(formatComment(comment));
    console.log('');
  }

  if (verbose) {
    console.log('\nFull response:');
    console.log(JSON.stringify(data, null, 2));
  }

  return comments;
}

/**
 * Create a comment on a list
 */
async function createListComment(listId, text, options, verbose) {
  const body = {
    comment_text: text
  };

  if (options.notifyAll) {
    body.notify_all = true;
  }

  if (options.assignee) {
    body.assignee = parseInt(options.assignee);
  }

  const comment = await apiRequest(`/list/${listId}/comment`, {
    method: 'POST',
    body
  });

  console.log('Created list comment:');
  console.log(formatComment(comment));

  if (verbose) {
    console.log('\nFull response:');
    console.log(JSON.stringify(comment, null, 2));
  }

  return comment;
}

/**
 * Confirm deletion
 */
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

/**
 * Show help
 */
function showHelp() {
  console.log('ClickUp Comments Script');
  console.log('');
  console.log('Commands:');
  console.log('  list <task-id>                     List comments on a task');
  console.log('  list-on-list <list-id>             List comments on a list');
  console.log('  create <task-id> --text "..."      Create a comment on a task');
  console.log('  create-on-list <list-id> --text    Create a comment on a list');
  console.log('  update <comment-id> --text "..."   Update a comment');
  console.log('  delete <comment-id>                Delete a comment');
  console.log('  help                               Show this help');
  console.log('');
  console.log('Options:');
  console.log('  --verbose                Show full API responses');
  console.log('  --force                  Skip delete confirmation');
  console.log('  --text "..."             Comment text');
  console.log('  --notify-all             Notify all assignees');
  console.log('  --assignee <user-id>     Assign comment to user');
  console.log('  --resolved true/false    Mark comment as resolved');
  console.log('  --start <timestamp>      Pagination: start from timestamp');
  console.log('  --start-id <comment-id>  Pagination: start from comment ID');
  console.log('');
  console.log('Examples:');
  console.log('  # List comments on a task');
  console.log('  node comments.js list abc123');
  console.log('');
  console.log('  # Create a comment');
  console.log('  node comments.js create abc123 --text "This looks good!"');
  console.log('');
  console.log('  # Create a comment and notify assignees');
  console.log('  node comments.js create abc123 --text "Please review" --notify-all');
  console.log('');
  console.log('  # Create an assigned comment');
  console.log('  node comments.js create abc123 --text "Can you check this?" --assignee 123456');
  console.log('');
  console.log('  # Update a comment');
  console.log('  node comments.js update 456789 --text "Updated comment text"');
  console.log('');
  console.log('  # Resolve a comment');
  console.log('  node comments.js update 456789 --text "Done" --resolved true');
  console.log('');
  console.log('  # Delete a comment');
  console.log('  node comments.js delete 456789');
}

/**
 * Main entry point
 */
async function main() {
  const args = parseArgs(process.argv.slice(2));
  const command = args._[0];
  const verbose = args.verbose || false;

  try {
    switch (command) {
      case 'list': {
        const taskId = args._[1];
        if (!taskId) {
          console.error('Error: Task ID is required');
          console.error('Usage: node comments.js list <task-id>');
          process.exit(1);
        }
        await listComments(taskId, {
          start: args.start,
          startId: args['start-id']
        }, verbose);
        break;
      }

      case 'list-on-list': {
        const listId = args._[1];
        if (!listId) {
          console.error('Error: List ID is required');
          console.error('Usage: node comments.js list-on-list <list-id>');
          process.exit(1);
        }
        await listListComments(listId, {
          start: args.start,
          startId: args['start-id']
        }, verbose);
        break;
      }

      case 'create': {
        const taskId = args._[1];
        if (!taskId) {
          console.error('Error: Task ID is required');
          console.error('Usage: node comments.js create <task-id> --text "..."');
          process.exit(1);
        }
        if (!args.text) {
          console.error('Error: --text is required');
          console.error('Usage: node comments.js create <task-id> --text "..."');
          process.exit(1);
        }
        await createComment(taskId, args.text, {
          notifyAll: args['notify-all'],
          assignee: args.assignee
        }, verbose);
        break;
      }

      case 'create-on-list': {
        const listId = args._[1];
        if (!listId) {
          console.error('Error: List ID is required');
          console.error('Usage: node comments.js create-on-list <list-id> --text "..."');
          process.exit(1);
        }
        if (!args.text) {
          console.error('Error: --text is required');
          console.error('Usage: node comments.js create-on-list <list-id> --text "..."');
          process.exit(1);
        }
        await createListComment(listId, args.text, {
          notifyAll: args['notify-all'],
          assignee: args.assignee
        }, verbose);
        break;
      }

      case 'update': {
        const commentId = args._[1];
        if (!commentId) {
          console.error('Error: Comment ID is required');
          console.error('Usage: node comments.js update <comment-id> --text "..."');
          process.exit(1);
        }
        if (!args.text) {
          console.error('Error: --text is required');
          console.error('Usage: node comments.js update <comment-id> --text "..."');
          process.exit(1);
        }
        await updateComment(commentId, args.text, {
          resolved: args.resolved,
          assignee: args.assignee
        }, verbose);
        break;
      }

      case 'delete': {
        const commentId = args._[1];
        if (!commentId) {
          console.error('Error: Comment ID is required');
          console.error('Usage: node comments.js delete <comment-id>');
          process.exit(1);
        }
        await deleteComment(commentId, args.force, verbose);
        break;
      }

      case 'help':
      default:
        showHelp();
        break;
    }
  } catch (error) {
    console.error('Error:', error.message);
    if (error.code) {
      console.error('Code:', error.code);
    }
    if (verbose && error.details) {
      console.error('Details:', JSON.stringify(error.details, null, 2));
    }
    process.exit(1);
  }
}

main();
