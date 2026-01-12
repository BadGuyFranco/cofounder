#!/usr/bin/env node

/**
 * LinkedIn Comments Management
 * Create, list, and delete comments on posts.
 */

import { fileURLToPath } from 'url';
import path from 'path';
import {
  loadEnv, getToken, parseArgs, apiRequest, handleError, showHelp,
  confirmDestructiveAction, formatDate, extractIdFromUrn
} from './utils.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
loadEnv(path.join(__dirname, '..'));

// Help documentation
function printHelp() {
  showHelp('LinkedIn Comments', {
    'Commands': [
      'list <postUrn>              List comments on a post',
      'create <postUrn>            Add a comment to a post',
      'delete <commentUrn>         Delete a comment (destructive)',
      'help                        Show this help'
    ],
    'Options': [
      '--text <content>            Comment text (required for create)',
      '--author <urn>              Author URN (defaults to your profile)',
      '--verbose                   Show full API response',
      '--force                     Skip confirmation for destructive actions'
    ],
    'Examples': [
      'node comments.js list urn:li:ugcPost:1234567890',
      'node comments.js list urn:li:share:1234567890',
      'node comments.js create urn:li:ugcPost:1234567890 --text "Great post!"',
      'node comments.js delete urn:li:comment:(urn:li:ugcPost:123,456)'
    ],
    'Notes': [
      'Post URNs look like: urn:li:ugcPost:1234567890 or urn:li:share:1234567890',
      'Comment URNs look like: urn:li:comment:(urn:li:ugcPost:123,456)',
      'You need the w_member_social scope to create/delete comments.',
      'You can only delete comments you authored.'
    ]
  });
}

// Get current user's person URN
async function getMyPersonUrn(token) {
  const response = await fetch('https://api.linkedin.com/v2/userinfo', {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });
  
  if (!response.ok) {
    throw new Error('Failed to get user profile');
  }
  
  const profile = await response.json();
  return `urn:li:person:${profile.sub}`;
}

// List comments on a post
async function listComments(postUrn, args) {
  const token = getToken();
  
  console.log(`Fetching comments for ${postUrn}...\n`);
  
  // URL encode the post URN
  const encodedUrn = encodeURIComponent(postUrn);
  
  try {
    const endpoint = `/socialActions/${encodedUrn}/comments`;
    const response = await apiRequest('GET', endpoint, token);
    
    if (args.verbose) {
      console.log(JSON.stringify(response, null, 2));
      return;
    }
    
    const comments = response.elements || [];
    
    if (comments.length === 0) {
      console.log('No comments found on this post.');
      return;
    }
    
    console.log(`Found ${comments.length} comment(s):\n`);
    
    for (const comment of comments) {
      const text = comment.message?.text || '[No text]';
      const truncatedText = text.length > 150 ? text.substring(0, 150) + '...' : text;
      
      console.log(`- ${truncatedText}`);
      console.log(`  Comment URN: ${comment['$URN'] || comment.commentUrn || 'N/A'}`);
      console.log(`  Author: ${comment.actor}`);
      console.log(`  Created: ${formatDate(comment.created?.time)}`);
      
      // Show engagement if available
      if (comment.likesSummary) {
        console.log(`  Likes: ${comment.likesSummary.totalLikes || 0}`);
      }
      console.log('');
    }
    
  } catch (error) {
    if (error.status === 403) {
      console.log('Unable to fetch comments.');
      console.log('This may be due to privacy settings or API restrictions.');
    } else if (error.status === 404) {
      console.log('Post not found. Check that the URN is correct.');
    } else {
      throw error;
    }
  }
}

// Create a comment on a post
async function createComment(postUrn, args) {
  const token = getToken();
  
  if (!args.text) {
    console.error('Error: --text is required');
    console.error('Usage: node comments.js create <postUrn> --text "Your comment"');
    process.exit(1);
  }
  
  // Get author URN if not provided
  let author = args.author;
  if (!author) {
    console.log('Getting your profile...');
    author = await getMyPersonUrn(token);
    console.log(`Author: ${author}\n`);
  }
  
  console.log(`Adding comment to ${postUrn}...\n`);
  
  // URL encode the post URN
  const encodedUrn = encodeURIComponent(postUrn);
  
  const commentBody = {
    actor: author,
    message: {
      text: args.text
    }
  };
  
  if (args.verbose) {
    console.log('Request body:');
    console.log(JSON.stringify(commentBody, null, 2));
    console.log('');
  }
  
  try {
    const endpoint = `/socialActions/${encodedUrn}/comments`;
    const response = await apiRequest('POST', endpoint, token, commentBody);
    
    if (args.verbose) {
      console.log(JSON.stringify(response, null, 2));
      return;
    }
    
    console.log('✓ Comment created successfully!\n');
    console.log(`Comment URN: ${response['$URN'] || response.commentUrn || 'N/A'}`);
    console.log(`Text: ${args.text.substring(0, 100)}${args.text.length > 100 ? '...' : ''}`);
    
  } catch (error) {
    if (error.status === 403) {
      console.error('Unable to create comment.');
      console.error('Check that you have the w_member_social scope and can comment on this post.');
    } else if (error.status === 404) {
      console.error('Post not found. Check that the URN is correct.');
    } else {
      throw error;
    }
  }
}

// Delete a comment
async function deleteComment(commentUrn, args) {
  const token = getToken();
  
  const confirmed = await confirmDestructiveAction(
    `Delete comment: ${commentUrn}`,
    [
      'The comment will be permanently removed.'
    ],
    args.force
  );
  
  if (!confirmed) return;
  
  console.log('Deleting comment...\n');
  
  // URL encode the comment URN
  const encodedUrn = encodeURIComponent(commentUrn);
  
  try {
    // The comment URN format is: urn:li:comment:(urn:li:ugcPost:123,456)
    // We need to extract the post URN and comment ID to delete
    const endpoint = `/socialActions/${encodedUrn}`;
    await apiRequest('DELETE', endpoint, token);
    
    console.log('✓ Comment deleted successfully.');
    
  } catch (error) {
    if (error.status === 403) {
      console.error('Unable to delete comment.');
      console.error('You can only delete comments you authored.');
    } else if (error.status === 404) {
      console.error('Comment not found. Check that the URN is correct.');
    } else {
      throw error;
    }
  }
}

// Main
async function main() {
  const args = parseArgs(process.argv.slice(2));
  const command = args._[0];
  
  try {
    switch (command) {
      case 'list':
        if (!args._[1]) {
          console.error('Error: Post URN required');
          console.error('Usage: node comments.js list <postUrn>');
          process.exit(1);
        }
        await listComments(args._[1], args);
        break;
      case 'create':
        if (!args._[1]) {
          console.error('Error: Post URN required');
          console.error('Usage: node comments.js create <postUrn> --text "Your comment"');
          process.exit(1);
        }
        await createComment(args._[1], args);
        break;
      case 'delete':
        if (!args._[1]) {
          console.error('Error: Comment URN required');
          console.error('Usage: node comments.js delete <commentUrn>');
          process.exit(1);
        }
        await deleteComment(args._[1], args);
        break;
      case 'help':
      default:
        printHelp();
    }
  } catch (error) {
    handleError(error, args.verbose);
  }
}

main();
