#!/usr/bin/env node

/**
 * Go High Level Social Media Planner
 * 
 * Commands:
 *   accounts               List connected social accounts
 *   posts                  List scheduled/published posts
 *   get <id>              Get post details
 *   create                 Create/schedule a post
 *   update <id>            Update a scheduled post
 *   delete <id>            Delete a post (DESTRUCTIVE)
 *   categories             List post categories
 *   create-category        Create a category
 */

import path from 'path';
import { fileURLToPath } from 'url';
import {
  loadEnv,
  loadLocations,
  resolveLocation,
  parseArgs,
  apiRequest,
  apiRequestPaginated,
  confirmDestructiveAction,
  listLocations,
  formatDate,
  handleError
} from './utils.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment
loadEnv(__dirname);
const locationsConfig = loadLocations();

// Parse arguments
const args = parseArgs(process.argv.slice(2));
const command = args._[0];
const verbose = args.verbose || false;
const force = args.force || false;

async function listAccounts(locationConfig) {
  try {
    // Try different social media platforms
    const platforms = ['google', 'facebook', 'instagram', 'twitter', 'linkedin'];
    let foundAccounts = false;
    
    console.log('Connected Social Accounts:\n');
    
    for (const platform of platforms) {
      try {
        const data = await apiRequest(
          'GET',
          `/social-media-posting/oauth/${platform}/accounts?locationId=${locationConfig.id}`,
          locationConfig.key
        );
        
        const accounts = data.accounts || data.data || [];
        if (accounts.length > 0) {
          foundAccounts = true;
          console.log(`${platform.charAt(0).toUpperCase() + platform.slice(1)}:`);
          for (const account of accounts) {
            console.log(`  - ${account.name || account.username || account.id}`);
            console.log(`    ID: ${account._id || account.id}`);
            if (account.type) console.log(`    Type: ${account.type}`);
            console.log('');
          }
        }
      } catch (e) {
        // Platform might not be connected or endpoint different
        if (verbose) console.log(`  ${platform}: Not configured or error`);
      }
    }
    
    if (!foundAccounts) {
      console.log('No social accounts connected.');
      console.log('\nConnect accounts in Go High Level → Marketing → Social Planner → Settings');
    }
  } catch (error) {
    handleError(error, verbose);
  }
}

async function listPosts(locationConfig) {
  try {
    const params = new URLSearchParams();
    params.append('locationId', locationConfig.id);
    
    if (args.status) params.append('status', args.status);
    if (args.type) params.append('type', args.type);
    if (args['account-id']) params.append('accountId', args['account-id']);
    if (args.limit) params.append('limit', args.limit);
    
    const endpoint = `/social-media-posting/posts?${params.toString()}`;
    
    if (args.all) {
      const { results, meta } = await apiRequestPaginated(endpoint, locationConfig.key, { 
        all: true, 
        limit: args.limit || 50 
      });
      console.log(`Found ${meta.total} posts (${meta.pages} pages):\n`);
      displayPosts(results);
    } else {
      const data = await apiRequest('GET', endpoint, locationConfig.key);
      const posts = data.posts || data.data || [];
      console.log(`Found ${posts.length} posts:\n`);
      displayPosts(posts);
    }
  } catch (error) {
    handleError(error, verbose);
  }
}

function displayPosts(posts) {
  if (posts.length === 0) {
    console.log('No posts found.');
    return;
  }
  
  for (const post of posts) {
    const content = post.content || post.text || '';
    const preview = content.length > 60 ? content.substring(0, 60) + '...' : content;
    
    console.log(`- ${preview || 'No content'}`);
    console.log(`  ID: ${post._id || post.id}`);
    console.log(`  Status: ${post.status || 'unknown'}`);
    if (post.platform) console.log(`  Platform: ${post.platform}`);
    if (post.scheduledAt) console.log(`  Scheduled: ${formatDate(post.scheduledAt)}`);
    if (post.publishedAt) console.log(`  Published: ${formatDate(post.publishedAt)}`);
    console.log('');
  }
}

async function getPost(postId, locationConfig) {
  try {
    const data = await apiRequest(
      'GET',
      `/social-media-posting/posts/${postId}?locationId=${locationConfig.id}`,
      locationConfig.key
    );
    
    console.log('Post Details:\n');
    const post = data.post || data;
    console.log(`ID: ${post._id || post.id}`);
    console.log(`Status: ${post.status}`);
    if (post.platform) console.log(`Platform: ${post.platform}`);
    
    console.log('\nContent:');
    console.log(post.content || post.text || 'No content');
    
    if (post.media && post.media.length > 0) {
      console.log('\nMedia:');
      for (const m of post.media) {
        console.log(`  - ${m.type || 'file'}: ${m.url || m.id}`);
      }
    }
    
    if (post.scheduledAt) console.log(`\nScheduled: ${formatDate(post.scheduledAt)}`);
    if (post.publishedAt) console.log(`Published: ${formatDate(post.publishedAt)}`);
    if (post.createdAt) console.log(`Created: ${formatDate(post.createdAt)}`);
    
    if (verbose) {
      console.log('\nFull Response:');
      console.log(JSON.stringify(data, null, 2));
    }
  } catch (error) {
    handleError(error, verbose);
  }
}

async function createPost(locationConfig) {
  try {
    const content = args.content;
    const accountIds = args['account-ids'];
    
    if (!content) {
      console.error('Error: --content is required');
      process.exit(1);
    }
    
    if (!accountIds) {
      console.error('Error: --account-ids is required');
      console.error('Run "node social-planner.js accounts" to see available accounts');
      process.exit(1);
    }
    
    const body = {
      locationId: locationConfig.id,
      content,
      accountIds: accountIds.split(',').map(id => id.trim())
    };
    
    // Handle scheduling
    if (args.schedule) {
      body.scheduledAt = args.schedule;
      body.status = 'scheduled';
    } else {
      // If not scheduled, warn about immediate publishing
      const confirmed = await confirmDestructiveAction(
        'You are about to PUBLISH a post immediately',
        [
          `Content: ${content.substring(0, 50)}...`,
          `Accounts: ${body.accountIds.length} account(s)`,
          '',
          'Once published, the post cannot be unpublished.',
          'Use --schedule "YYYY-MM-DDTHH:mm:ss" to schedule instead.'
        ],
        force
      );
      
      if (!confirmed) return;
      body.status = 'published';
    }
    
    if (args.media) body.media = args.media.split(',');
    if (args.category) body.categoryId = args.category;
    
    const data = await apiRequest('POST', '/social-media-posting/posts', locationConfig.key, body);
    
    console.log('Post created successfully!\n');
    const post = data.post || data;
    console.log(`ID: ${post._id || post.id}`);
    console.log(`Status: ${post.status}`);
    if (post.scheduledAt) console.log(`Scheduled for: ${formatDate(post.scheduledAt)}`);
    
  } catch (error) {
    handleError(error, verbose);
  }
}

async function updatePost(postId, locationConfig) {
  try {
    // Get current post first
    const currentData = await apiRequest(
      'GET',
      `/social-media-posting/posts/${postId}?locationId=${locationConfig.id}`,
      locationConfig.key
    );
    const currentPost = currentData.post || currentData;
    
    // Can only update scheduled posts
    if (currentPost.status === 'published') {
      console.error('Error: Cannot update a published post');
      process.exit(1);
    }
    
    const body = {
      locationId: locationConfig.id
    };
    
    if (args.content) body.content = args.content;
    if (args.schedule) body.scheduledAt = args.schedule;
    if (args.media) body.media = args.media.split(',');
    
    if (Object.keys(body).length <= 1) {
      console.error('Error: No fields to update');
      console.error('Use --content, --schedule, or --media');
      process.exit(1);
    }
    
    const data = await apiRequest('PUT', `/social-media-posting/posts/${postId}`, locationConfig.key, body);
    
    console.log('Post updated successfully!\n');
    const post = data.post || data;
    console.log(`ID: ${post._id || post.id}`);
    console.log(`Status: ${post.status}`);
    
  } catch (error) {
    handleError(error, verbose);
  }
}

async function deletePost(postId, locationConfig) {
  try {
    // Get post details first
    const postData = await apiRequest(
      'GET',
      `/social-media-posting/posts/${postId}?locationId=${locationConfig.id}`,
      locationConfig.key
    );
    const post = postData.post || postData;
    const content = post.content || post.text || '';
    
    const confirmed = await confirmDestructiveAction(
      'You are about to DELETE a social media post',
      [
        `Content: ${content.substring(0, 50)}${content.length > 50 ? '...' : ''}`,
        `Status: ${post.status}`,
        '',
        post.status === 'published' 
          ? 'WARNING: This will NOT delete the post from the social platform.'
          : 'The scheduled post will be cancelled.'
      ],
      force
    );
    
    if (!confirmed) return;
    
    await apiRequest(
      'DELETE',
      `/social-media-posting/posts/${postId}?locationId=${locationConfig.id}`,
      locationConfig.key
    );
    
    console.log('Post deleted successfully.');
    
  } catch (error) {
    handleError(error, verbose);
  }
}

async function listCategories(locationConfig) {
  try {
    const data = await apiRequest(
      'GET',
      `/social-media-posting/categories?locationId=${locationConfig.id}`,
      locationConfig.key
    );
    
    const categories = data.categories || data.data || [];
    console.log(`Found ${categories.length} categories:\n`);
    
    if (categories.length === 0) {
      console.log('No categories found.');
      return;
    }
    
    for (const cat of categories) {
      console.log(`- ${cat.name}`);
      console.log(`  ID: ${cat._id || cat.id}`);
      if (cat.description) console.log(`  Description: ${cat.description}`);
      console.log('');
    }
  } catch (error) {
    handleError(error, verbose);
  }
}

async function createCategory(locationConfig) {
  try {
    const name = args.name;
    
    if (!name) {
      console.error('Error: --name is required');
      process.exit(1);
    }
    
    const body = {
      locationId: locationConfig.id,
      name
    };
    
    if (args.description) body.description = args.description;
    
    const data = await apiRequest('POST', '/social-media-posting/categories', locationConfig.key, body);
    
    console.log('Category created successfully!\n');
    const cat = data.category || data;
    console.log(`ID: ${cat._id || cat.id}`);
    console.log(`Name: ${cat.name}`);
    
  } catch (error) {
    handleError(error, verbose);
  }
}

function showHelp() {
  console.log(`
Go High Level Social Media Planner

Usage:
  node social-planner.js <command> [options]

Commands:
  accounts               List connected social accounts
  posts                  List scheduled/published posts
  get <id>              Get post details
  create                Create/schedule a post
  update <id>           Update a scheduled post
  delete <id>           Delete a post (DESTRUCTIVE)
  categories            List post categories
  create-category       Create a category
  locations             List configured locations

Options:
  --location "Name"       Specify GHL sub-account
  --content "Text"        Post content
  --account-ids "id1,id2" Social account IDs (comma-separated)
  --schedule "ISO-date"   Schedule time (YYYY-MM-DDTHH:mm:ss)
  --media "url1,url2"     Media URLs (comma-separated)
  --category "id"         Category ID
  --status "status"       Filter by status
  --name "Name"           Category name
  --description "Desc"    Category description
  --all                   Fetch all pages
  --limit <n>             Results per page
  --verbose               Show full API response
  --force                 Skip confirmation prompts

Examples:
  node social-planner.js accounts --location "WISER"
  node social-planner.js posts --status scheduled --location "WISER"
  node social-planner.js create --content "Hello world!" --account-ids "acc1,acc2" --schedule "2024-01-15T10:00:00" --location "WISER"
  node social-planner.js delete post123 --location "WISER"

Post Statuses: draft, scheduled, publishing, published, failed

IMPORTANT: 
- Immediate publishing cannot be undone
- Deleting a published post only removes it from GHL, not from the social platform
`);
}

// Main execution
async function main() {
  if (!command || command === 'help' || command === '--help' || command === '-h') {
    showHelp();
    return;
  }
  
  if (command === 'locations') {
    listLocations(locationsConfig);
    return;
  }
  
  const locationConfig = resolveLocation(args.location, locationsConfig);
  
  switch (command) {
    case 'accounts':
      await listAccounts(locationConfig);
      break;
    case 'posts':
      await listPosts(locationConfig);
      break;
    case 'get':
      if (!args._[1]) {
        console.error('Error: Post ID required');
        process.exit(1);
      }
      await getPost(args._[1], locationConfig);
      break;
    case 'create':
      await createPost(locationConfig);
      break;
    case 'update':
      if (!args._[1]) {
        console.error('Error: Post ID required');
        process.exit(1);
      }
      await updatePost(args._[1], locationConfig);
      break;
    case 'delete':
      if (!args._[1]) {
        console.error('Error: Post ID required');
        process.exit(1);
      }
      await deletePost(args._[1], locationConfig);
      break;
    case 'categories':
      await listCategories(locationConfig);
      break;
    case 'create-category':
      await createCategory(locationConfig);
      break;
    default:
      console.error(`Unknown command: ${command}`);
      console.error('Run "node social-planner.js help" for usage');
      process.exit(1);
  }
}

main();
