#!/usr/bin/env node
/**
 * Figma Comments Script
 * Manage comments and reactions on Figma files.
 */

import { parseArgs, apiRequest, parseFigmaUrl, output, outputError } from './utils.js';

function showHelp() {
  console.log(`
Figma Comments - Manage comments and reactions

Usage: node scripts/comments.js <command> <file_key_or_url> [options]

Commands:
  list <file>             List all comments on a file
  post <file>             Post a new comment
  delete <file>           Delete a comment
  reactions <file>        Get reactions on a comment
  react <file>            Add reaction to a comment
  unreact <file>          Remove reaction from a comment
  help                    Show this help

Options:
  --message <text>        Comment text (for post)
  --comment-id <id>       Comment ID (for reply, delete, reactions)
  --emoji <shortcode>     Emoji shortcode like :heart: or :+1: (for react/unreact)
  --node-id <id>          Node to attach comment to
  --x <number>            X coordinate for comment position
  --y <number>            Y coordinate for comment position
  --as-md                 Return comments as markdown (for list)

Examples:
  # List all comments
  node scripts/comments.js list ABC123

  # Post a comment on the canvas
  node scripts/comments.js post ABC123 --message "Great work!"

  # Post a comment on a specific node
  node scripts/comments.js post ABC123 --message "Check this" --node-id "1:23"

  # Reply to a comment
  node scripts/comments.js post ABC123 --message "Thanks!" --comment-id "12345"

  # Delete a comment
  node scripts/comments.js delete ABC123 --comment-id "12345"

  # Add a reaction
  node scripts/comments.js react ABC123 --comment-id "12345" --emoji ":+1:"

  # Remove a reaction
  node scripts/comments.js unreact ABC123 --comment-id "12345" --emoji ":+1:"
`);
}

/**
 * List comments on a file
 */
async function listComments(fileKey, flags) {
  let endpoint = `/v1/files/${fileKey}/comments`;
  if (flags['as-md']) {
    endpoint += '?as_md=true';
  }
  
  const data = await apiRequest(endpoint);
  
  if (!data.comments || data.comments.length === 0) {
    console.log('No comments found.');
    return;
  }

  console.log(`Found ${data.comments.length} comment(s):\n`);
  
  for (const comment of data.comments) {
    console.log(`ID: ${comment.id}`);
    console.log(`Author: ${comment.user?.handle || comment.user?.email || 'Unknown'}`);
    console.log(`Created: ${comment.created_at}`);
    console.log(`Message: ${comment.message}`);
    if (comment.resolved_at) {
      console.log(`Resolved: ${comment.resolved_at}`);
    }
    if (comment.client_meta) {
      console.log(`Position: ${JSON.stringify(comment.client_meta)}`);
    }
    console.log('---');
  }
}

/**
 * Post a comment
 */
async function postComment(fileKey, flags) {
  if (!flags.message) {
    throw new Error('--message required. Usage: post <file> --message "Your comment"');
  }

  const body = {
    message: flags.message
  };

  // If replying to a comment
  if (flags['comment-id']) {
    body.comment_id = flags['comment-id'];
  }

  // Position the comment
  if (flags['node-id']) {
    // Comment on a specific node
    body.client_meta = {
      node_id: flags['node-id'],
      node_offset: {
        x: parseFloat(flags.x) || 0,
        y: parseFloat(flags.y) || 0
      }
    };
  } else if (flags.x !== undefined && flags.y !== undefined) {
    // Comment at absolute position
    body.client_meta = {
      x: parseFloat(flags.x),
      y: parseFloat(flags.y)
    };
  }

  const endpoint = `/v1/files/${fileKey}/comments`;
  const data = await apiRequest(endpoint, {
    method: 'POST',
    body
  });

  console.log('Comment posted successfully:');
  console.log(`  ID: ${data.id}`);
  console.log(`  Message: ${data.message}`);
  console.log(`  Created: ${data.created_at}`);
}

/**
 * Delete a comment
 */
async function deleteComment(fileKey, flags) {
  if (!flags['comment-id']) {
    throw new Error('--comment-id required. Usage: delete <file> --comment-id "12345"');
  }

  const endpoint = `/v1/files/${fileKey}/comments/${flags['comment-id']}`;
  await apiRequest(endpoint, { method: 'DELETE' });

  console.log(`Comment ${flags['comment-id']} deleted.`);
}

/**
 * Get reactions on a comment
 */
async function getReactions(fileKey, flags) {
  if (!flags['comment-id']) {
    throw new Error('--comment-id required. Usage: reactions <file> --comment-id "12345"');
  }

  const endpoint = `/v1/files/${fileKey}/comments/${flags['comment-id']}/reactions`;
  const data = await apiRequest(endpoint);
  
  if (!data.reactions || data.reactions.length === 0) {
    console.log('No reactions found.');
    return;
  }

  console.log(`Reactions on comment ${flags['comment-id']}:`);
  for (const reaction of data.reactions) {
    console.log(`  ${reaction.emoji} by ${reaction.user?.handle || reaction.user?.email || 'Unknown'}`);
  }
}

/**
 * Add reaction to a comment
 */
async function addReaction(fileKey, flags) {
  if (!flags['comment-id']) {
    throw new Error('--comment-id required');
  }
  if (!flags.emoji) {
    throw new Error('--emoji required. Example: --emoji ":+1:"');
  }

  const endpoint = `/v1/files/${fileKey}/comments/${flags['comment-id']}/reactions`;
  await apiRequest(endpoint, {
    method: 'POST',
    body: { emoji: flags.emoji }
  });

  console.log(`Added ${flags.emoji} reaction to comment ${flags['comment-id']}`);
}

/**
 * Remove reaction from a comment
 */
async function removeReaction(fileKey, flags) {
  if (!flags['comment-id']) {
    throw new Error('--comment-id required');
  }
  if (!flags.emoji) {
    throw new Error('--emoji required. Example: --emoji ":+1:"');
  }

  const endpoint = `/v1/files/${fileKey}/comments/${flags['comment-id']}/reactions?emoji=${encodeURIComponent(flags.emoji)}`;
  await apiRequest(endpoint, { method: 'DELETE' });

  console.log(`Removed ${flags.emoji} reaction from comment ${flags['comment-id']}`);
}

async function main() {
  const { command, args, flags } = parseArgs();

  if (command === 'help' || !command) {
    showHelp();
    return;
  }

  const fileKeyOrUrl = args[0];
  if (!fileKeyOrUrl) {
    console.error('Error: File key or URL required.');
    showHelp();
    process.exit(1);
  }

  const { fileKey } = parseFigmaUrl(fileKeyOrUrl);
  if (!fileKey) {
    console.error('Error: Could not parse file key from input.');
    process.exit(1);
  }

  try {
    switch (command) {
      case 'list':
        await listComments(fileKey, flags);
        break;
      case 'post':
        await postComment(fileKey, flags);
        break;
      case 'delete':
        await deleteComment(fileKey, flags);
        break;
      case 'reactions':
        await getReactions(fileKey, flags);
        break;
      case 'react':
        await addReaction(fileKey, flags);
        break;
      case 'unreact':
        await removeReaction(fileKey, flags);
        break;
      default:
        console.error(`Unknown command: ${command}`);
        showHelp();
        process.exit(1);
    }
  } catch (error) {
    outputError(error);
  }
}

main();
