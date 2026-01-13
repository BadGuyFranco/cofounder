#!/usr/bin/env node

/**
 * Publer Posts Script
 * Create, schedule, and manage social media posts.
 *
 * API Reference: https://publer.com/docs
 * 
 * Usage:
 *   node posts.js list
 *   node posts.js get <id>
 *   node posts.js create --text "Hello world" --accounts acc1,acc2 --schedule "2025-01-15T10:00:00"
 *   node posts.js update <id> --text "Updated text"
 *   node posts.js delete <id>
 *   node posts.js help
 */

import { parseArgs, apiRequest, formatPost, parseDate, formatDate, parseJSON } from './utils.js';

/**
 * List posts with optional filters
 */
async function listPosts(flags, verbose) {
  const params = new URLSearchParams();
  
  if (flags.status) {
    params.append('status', flags.status);
  }
  if (flags.limit) {
    params.append('limit', flags.limit);
  }
  if (flags.page) {
    params.append('page', flags.page);
  }
  if (flags.account) {
    params.append('account_id', flags.account);
  }
  if (flags.from) {
    params.append('from', flags.from);
  }
  if (flags.to) {
    params.append('to', flags.to);
  }
  
  const queryString = params.toString();
  const endpoint = `/posts${queryString ? '?' + queryString : ''}`;
  
  const data = await apiRequest(endpoint);
  
  const posts = Array.isArray(data) ? data : (data.posts || data.data || []);
  
  console.log(`Found ${posts.length} post(s):\n`);
  
  for (const post of posts) {
    console.log(formatPost(post));
    console.log('');
  }
  
  if (verbose) {
    console.log('\nFull response:');
    console.log(JSON.stringify(data, null, 2));
  }
  
  return posts;
}

/**
 * Get a specific post
 */
async function getPost(postId, verbose) {
  const data = await apiRequest(`/posts/${postId}`);
  
  console.log(formatPost(data));
  
  if (verbose) {
    console.log('\nFull response:');
    console.log(JSON.stringify(data, null, 2));
  }
  
  return data;
}

/**
 * Create a new post
 * Supports: text, images, videos, links, polls, carousels, PDFs
 */
async function createPost(flags, verbose) {
  if (!flags.text && !flags.media && !flags.link) {
    console.error('Error: At least one of --text, --media, or --link is required');
    process.exit(1);
  }
  
  if (!flags.accounts) {
    console.error('Error: --accounts is required (comma-separated account IDs)');
    process.exit(1);
  }
  
  const accountIds = flags.accounts.split(',').map(id => id.trim());
  
  const postData = {
    text: flags.text || '',
    account_ids: accountIds
  };
  
  // Schedule or publish immediately
  if (flags.schedule) {
    postData.scheduled_at = formatDate(parseDate(flags.schedule));
    postData.status = 'scheduled';
  } else if (flags.draft) {
    postData.status = 'draft';
  } else if (flags.now) {
    postData.status = 'publish_now';
  } else {
    // Default to draft for safety
    postData.status = 'draft';
  }
  
  // Add media if specified
  if (flags.media) {
    postData.media_ids = flags.media.split(',').map(id => id.trim());
  }
  
  // Add link if specified
  if (flags.link) {
    postData.link = {
      url: flags.link
    };
    if (flags['link-title']) {
      postData.link.title = flags['link-title'];
    }
    if (flags['link-description']) {
      postData.link.description = flags['link-description'];
    }
  }
  
  // Add location if specified
  if (flags.location) {
    postData.location = flags.location;
  }
  
  // Add first comment if specified (Instagram)
  if (flags['first-comment']) {
    postData.first_comment = flags['first-comment'];
  }
  
  // Platform-specific customizations
  if (flags.customizations) {
    postData.customizations = parseJSON(flags.customizations, 'customizations');
  }
  
  // Labels/tags for organization
  if (flags.labels) {
    postData.labels = flags.labels.split(',').map(l => l.trim());
  }
  
  const data = await apiRequest('/posts', {
    method: 'POST',
    body: postData
  });
  
  console.log('Post created successfully!\n');
  console.log(formatPost(data));
  
  if (verbose) {
    console.log('\nFull response:');
    console.log(JSON.stringify(data, null, 2));
  }
  
  return data;
}

/**
 * Update an existing post
 */
async function updatePost(postId, flags, verbose) {
  const updateData = {};
  
  if (flags.text !== undefined) {
    updateData.text = flags.text;
  }
  
  if (flags.schedule) {
    updateData.scheduled_at = formatDate(parseDate(flags.schedule));
    updateData.status = 'scheduled';
  }
  
  if (flags.status) {
    updateData.status = flags.status;
  }
  
  if (flags.media) {
    updateData.media_ids = flags.media.split(',').map(id => id.trim());
  }
  
  if (flags.link) {
    updateData.link = { url: flags.link };
  }
  
  if (flags.location) {
    updateData.location = flags.location;
  }
  
  if (flags['first-comment']) {
    updateData.first_comment = flags['first-comment'];
  }
  
  if (flags.labels) {
    updateData.labels = flags.labels.split(',').map(l => l.trim());
  }
  
  if (Object.keys(updateData).length === 0) {
    console.error('Error: No update fields provided');
    console.error('Use --text, --schedule, --status, --media, --link, --location, --labels');
    process.exit(1);
  }
  
  const data = await apiRequest(`/posts/${postId}`, {
    method: 'PUT',
    body: updateData
  });
  
  console.log('Post updated successfully!\n');
  console.log(formatPost(data));
  
  if (verbose) {
    console.log('\nFull response:');
    console.log(JSON.stringify(data, null, 2));
  }
  
  return data;
}

/**
 * Delete a post
 */
async function deletePost(postId, verbose) {
  await apiRequest(`/posts/${postId}`, {
    method: 'DELETE'
  });
  
  console.log(`Post ${postId} deleted successfully.`);
}

/**
 * Duplicate a post
 */
async function duplicatePost(postId, flags, verbose) {
  const data = await apiRequest(`/posts/${postId}/duplicate`, {
    method: 'POST'
  });
  
  console.log('Post duplicated successfully!\n');
  console.log(formatPost(data));
  
  if (verbose) {
    console.log('\nFull response:');
    console.log(JSON.stringify(data, null, 2));
  }
  
  return data;
}

/**
 * Reschedule a post
 */
async function reschedulePost(postId, newTime, verbose) {
  const data = await apiRequest(`/posts/${postId}`, {
    method: 'PUT',
    body: {
      scheduled_at: formatDate(parseDate(newTime)),
      status: 'scheduled'
    }
  });
  
  console.log('Post rescheduled successfully!\n');
  console.log(formatPost(data));
  
  if (verbose) {
    console.log('\nFull response:');
    console.log(JSON.stringify(data, null, 2));
  }
  
  return data;
}

/**
 * Show help
 */
function showHelp() {
  console.log('Publer Posts Script');
  console.log('');
  console.log('Commands:');
  console.log('  list                     List posts');
  console.log('  get <id>                 Get post by ID');
  console.log('  create                   Create new post');
  console.log('  update <id>              Update existing post');
  console.log('  delete <id>              Delete post');
  console.log('  duplicate <id>           Duplicate post');
  console.log('  reschedule <id> <time>   Reschedule post to new time');
  console.log('  help                     Show this help');
  console.log('');
  console.log('List Options:');
  console.log('  --status <status>        Filter by status (scheduled, draft, published, failed)');
  console.log('  --account <id>           Filter by social account ID');
  console.log('  --from <date>            Filter posts from date (YYYY-MM-DD)');
  console.log('  --to <date>              Filter posts to date (YYYY-MM-DD)');
  console.log('  --limit <n>              Number of posts to return');
  console.log('  --page <n>               Page number for pagination');
  console.log('');
  console.log('Create Options:');
  console.log('  --text <text>            Post text content');
  console.log('  --accounts <ids>         Comma-separated social account IDs (required)');
  console.log('  --schedule <datetime>    Schedule time (ISO 8601 or common formats)');
  console.log('  --draft                  Create as draft (default)');
  console.log('  --now                    Publish immediately');
  console.log('  --media <ids>            Comma-separated media IDs');
  console.log('  --link <url>             Link URL to include');
  console.log('  --link-title <title>     Link preview title');
  console.log('  --link-description <d>   Link preview description');
  console.log('  --location <location>    Location tag');
  console.log('  --first-comment <text>   First comment (Instagram)');
  console.log('  --labels <labels>        Comma-separated labels for organization');
  console.log('  --customizations <json>  Platform-specific customizations (JSON)');
  console.log('');
  console.log('Update Options:');
  console.log('  --text <text>            Update text content');
  console.log('  --schedule <datetime>    Update schedule time');
  console.log('  --status <status>        Update status');
  console.log('  --media <ids>            Update media IDs');
  console.log('  --link <url>             Update link');
  console.log('  --location <location>    Update location');
  console.log('  --labels <labels>        Update labels');
  console.log('');
  console.log('General Options:');
  console.log('  --verbose                Show full API responses');
  console.log('');
  console.log('Examples:');
  console.log('  # List scheduled posts');
  console.log('  node posts.js list --status scheduled');
  console.log('');
  console.log('  # List posts for date range');
  console.log('  node posts.js list --from 2025-01-01 --to 2025-01-31');
  console.log('');
  console.log('  # Create a draft');
  console.log('  node posts.js create --text "Draft post" --accounts acc1,acc2');
  console.log('');
  console.log('  # Create and schedule a post');
  console.log('  node posts.js create --text "Hello!" --accounts acc1 --schedule "2025-01-15T10:00:00"');
  console.log('');
  console.log('  # Create with media');
  console.log('  node posts.js create --text "Check this out!" --accounts acc1 --media media123');
  console.log('');
  console.log('  # Update post text');
  console.log('  node posts.js update post123 --text "Updated content"');
  console.log('');
  console.log('  # Reschedule a post');
  console.log('  node posts.js reschedule post123 "2025-01-20T14:00:00"');
  console.log('');
  console.log('  # Delete a post');
  console.log('  node posts.js delete post123');
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
      case 'list':
        await listPosts(args, verbose);
        break;

      case 'get': {
        const postId = args._[1];
        if (!postId) {
          console.error('Error: Post ID is required');
          console.error('Usage: node posts.js get <id>');
          process.exit(1);
        }
        await getPost(postId, verbose);
        break;
      }

      case 'create':
        await createPost(args, verbose);
        break;

      case 'update': {
        const postId = args._[1];
        if (!postId) {
          console.error('Error: Post ID is required');
          console.error('Usage: node posts.js update <id> [options]');
          process.exit(1);
        }
        await updatePost(postId, args, verbose);
        break;
      }

      case 'delete': {
        const postId = args._[1];
        if (!postId) {
          console.error('Error: Post ID is required');
          console.error('Usage: node posts.js delete <id>');
          process.exit(1);
        }
        await deletePost(postId, verbose);
        break;
      }

      case 'duplicate': {
        const postId = args._[1];
        if (!postId) {
          console.error('Error: Post ID is required');
          console.error('Usage: node posts.js duplicate <id>');
          process.exit(1);
        }
        await duplicatePost(postId, args, verbose);
        break;
      }

      case 'reschedule': {
        const postId = args._[1];
        const newTime = args._[2];
        if (!postId || !newTime) {
          console.error('Error: Post ID and new time are required');
          console.error('Usage: node posts.js reschedule <id> <datetime>');
          process.exit(1);
        }
        await reschedulePost(postId, newTime, verbose);
        break;
      }

      case 'help':
      default:
        showHelp();
        break;
    }
  } catch (error) {
    console.error('Error:', error.message);
    if (error.status) {
      console.error('Status:', error.status);
    }
    if (verbose && error.details) {
      console.error('Details:', JSON.stringify(error.details, null, 2));
    }
    process.exit(1);
  }
}

main();
