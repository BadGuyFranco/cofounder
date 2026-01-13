#!/usr/bin/env node

/**
 * LinkedIn Posts Management
 * Create, list, and delete posts on LinkedIn.
 */

import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs';
import {
  loadEnv, getToken, parseArgs, apiRequest, handleError, showHelp,
  confirmDestructiveAction, formatDate, extractIdFromUrn
} from './utils.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
loadEnv(path.join(__dirname, '..'));

// Help documentation
function printHelp() {
  showHelp('LinkedIn Posts', {
    'Commands': [
      'create                      Create a new post',
      'list                        List recent posts (your posts)',
      'get <shareUrn>              Get a specific post by URN',
      'delete <shareUrn>           Delete a post (destructive)',
      'help                        Show this help'
    ],
    'Options for create': [
      '--text <content>            Post text content (required)',
      '--author <urn>              Author URN (defaults to your profile)',
      '--visibility <level>        PUBLIC, CONNECTIONS, or LOGGED_IN (default: PUBLIC)',
      '--image <path>              Attach an image file',
      '--article-url <url>         Share an article/link',
      '--article-title <title>     Title for shared article',
      '--article-desc <desc>       Description for shared article',
      '--mention <urn>             Mention a person/org (use @Name in text)',
      '--hashtags <tags>           Comma-separated hashtags to append'
    ],
    'Options for list': [
      '--author <urn>              Author URN (defaults to your profile)',
      '--count <n>                 Number of posts to fetch (default: 10)',
      '--verbose                   Show full API response'
    ],
    'Global Options': [
      '--verbose                   Show full API response',
      '--force                     Skip confirmation for destructive actions'
    ],
    'Examples': [
      'node posts.js create --text "Hello LinkedIn!"',
      'node posts.js create --text "Check this out!" --visibility CONNECTIONS',
      'node posts.js create --text "New article" --article-url "https://example.com"',
      'node posts.js create --text "Photo post" --image "/path/to/image.jpg"',
      'node posts.js create --text "Thanks @John!" --mention urn:li:person:abc123',
      'node posts.js create --text "AI thoughts" --hashtags "AI,MachineLearning,Tech"',
      'node posts.js list',
      'node posts.js list --count 20',
      'node posts.js delete urn:li:share:1234567890'
    ],
    'Visibility Levels': [
      'PUBLIC      - Visible to everyone',
      'CONNECTIONS - Visible to 1st-degree connections only',
      'LOGGED_IN   - Visible to logged-in LinkedIn members'
    ],
    'Notes': [
      'You need the "w_member_social" scope to create posts.',
      'For organization posts, use --author with org URN and need "w_organization_social" scope.',
      'Post URNs look like: urn:li:share:1234567890 or urn:li:ugcPost:1234567890',
      'Image uploads require the image to be accessible locally.',
      'Mentions: Use @Name in text and --mention with URN to tag someone.',
      'Hashtags: Will be appended to your post text automatically.'
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

// Create a text post using UGC Post API
async function createPost(args) {
  const token = getToken();
  
  if (!args.text) {
    console.error('Error: --text is required');
    console.error('Usage: node posts.js create --text "Your post content"');
    process.exit(1);
  }
  
  // Get author URN
  let author = args.author;
  if (!author) {
    console.log('Getting your profile...');
    author = await getMyPersonUrn(token);
    console.log(`Author: ${author}\n`);
  }
  
  // Build the post body
  const visibility = (args.visibility || 'PUBLIC').toUpperCase();
  const validVisibilities = ['PUBLIC', 'CONNECTIONS', 'LOGGED_IN'];
  if (!validVisibilities.includes(visibility)) {
    console.error(`Error: Invalid visibility. Use: ${validVisibilities.join(', ')}`);
    process.exit(1);
  }
  
  // Build post text with optional hashtags
  let postText = args.text;
  if (args.hashtags) {
    const tags = args.hashtags.split(',').map(t => t.trim()).filter(t => t);
    const hashtagStr = tags.map(t => t.startsWith('#') ? t : `#${t}`).join(' ');
    postText = `${postText}\n\n${hashtagStr}`;
  }
  
  // Build share commentary with optional mentions
  const shareCommentary = {
    text: postText
  };
  
  // Handle mentions - LinkedIn uses attributes for mentions
  if (args.mention) {
    const mentionUrn = args.mention;
    // Find @Name pattern in text to determine mention position
    const atMatch = postText.match(/@(\w+)/);
    if (atMatch) {
      const start = atMatch.index;
      const length = atMatch[0].length;
      shareCommentary.attributes = [{
        length: length,
        start: start,
        value: {
          'com.linkedin.common.MemberAttributedEntity': {
            member: mentionUrn
          }
        }
      }];
    }
  }
  
  // Build media content if provided
  let specificContent = {
    'com.linkedin.ugc.ShareContent': {
      shareCommentary: shareCommentary,
      shareMediaCategory: 'NONE'
    }
  };
  
  // Handle article/link sharing
  if (args['article-url']) {
    specificContent['com.linkedin.ugc.ShareContent'].shareMediaCategory = 'ARTICLE';
    specificContent['com.linkedin.ugc.ShareContent'].media = [{
      status: 'READY',
      originalUrl: args['article-url'],
      title: {
        text: args['article-title'] || args['article-url']
      },
      description: {
        text: args['article-desc'] || ''
      }
    }];
  }
  
  // Handle image upload
  if (args.image) {
    console.log('Uploading image...');
    const imageAsset = await uploadImage(token, args.image, author);
    console.log(`Image uploaded: ${imageAsset}\n`);
    
    specificContent['com.linkedin.ugc.ShareContent'].shareMediaCategory = 'IMAGE';
    specificContent['com.linkedin.ugc.ShareContent'].media = [{
      status: 'READY',
      media: imageAsset
    }];
  }
  
  const postBody = {
    author: author,
    lifecycleState: 'PUBLISHED',
    specificContent: specificContent,
    visibility: {
      'com.linkedin.ugc.MemberNetworkVisibility': visibility
    }
  };
  
  if (args.verbose) {
    console.log('Request body:');
    console.log(JSON.stringify(postBody, null, 2));
    console.log('');
  }
  
  console.log('Creating post...\n');
  
  const response = await apiRequest('POST', '/ugcPosts', token, postBody);
  
  if (args.verbose) {
    console.log(JSON.stringify(response, null, 2));
    return;
  }
  
  console.log('✓ Post created successfully!\n');
  console.log(`Post ID: ${response.id}`);
  
  // Extract share ID for URL
  const shareId = extractIdFromUrn(response.id);
  if (shareId) {
    // Note: The actual URL format depends on whether it's a share or ugcPost
    console.log(`\nView at: https://www.linkedin.com/feed/update/${response.id}/`);
  }
}

// Upload an image and return the asset URN
async function uploadImage(token, imagePath, ownerUrn) {
  // Check file exists
  if (!fs.existsSync(imagePath)) {
    throw new Error(`Image file not found: ${imagePath}`);
  }
  
  // Step 1: Register the upload
  const registerBody = {
    registerUploadRequest: {
      recipes: ['urn:li:digitalmediaRecipe:feedshare-image'],
      owner: ownerUrn,
      serviceRelationships: [{
        relationshipType: 'OWNER',
        identifier: 'urn:li:userGeneratedContent'
      }]
    }
  };
  
  const registerResponse = await apiRequest('POST', '/assets?action=registerUpload', token, registerBody);
  
  const uploadUrl = registerResponse.value.uploadMechanism['com.linkedin.digitalmedia.uploading.MediaUploadHttpRequest'].uploadUrl;
  const asset = registerResponse.value.asset;
  
  // Step 2: Upload the actual image
  const imageBuffer = fs.readFileSync(imagePath);
  const ext = path.extname(imagePath).toLowerCase();
  const contentType = ext === '.png' ? 'image/png' : 
                      ext === '.gif' ? 'image/gif' : 
                      ext === '.webp' ? 'image/webp' : 'image/jpeg';
  
  const uploadResponse = await fetch(uploadUrl, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': contentType
    },
    body: imageBuffer
  });
  
  if (!uploadResponse.ok) {
    const errorText = await uploadResponse.text();
    throw new Error(`Image upload failed: ${uploadResponse.status} - ${errorText}`);
  }
  
  return asset;
}

// List posts
async function listPosts(args) {
  const token = getToken();
  
  // Get author URN
  let author = args.author;
  if (!author) {
    author = await getMyPersonUrn(token);
  }
  
  const count = parseInt(args.count) || 10;
  const authorId = extractIdFromUrn(author);
  
  console.log(`Fetching posts for ${author}...\n`);
  
  // Use the shares API to get posts
  const endpoint = `/ugcPosts?q=authors&authors=List(${encodeURIComponent(author)})&count=${count}`;
  
  try {
    const response = await apiRequest('GET', endpoint, token);
    
    if (args.verbose) {
      console.log(JSON.stringify(response, null, 2));
      return;
    }
    
    const posts = response.elements || [];
    
    console.log(`Found ${posts.length} posts:\n`);
    
    for (const post of posts) {
      const shareContent = post.specificContent?.['com.linkedin.ugc.ShareContent'];
      const text = shareContent?.shareCommentary?.text || '[No text]';
      const truncatedText = text.length > 100 ? text.substring(0, 100) + '...' : text;
      const mediaCategory = shareContent?.shareMediaCategory || 'NONE';
      
      console.log(`- ${truncatedText}`);
      console.log(`  ID: ${post.id}`);
      console.log(`  Type: ${mediaCategory}`);
      console.log(`  Created: ${formatDate(post.created?.time)}`);
      console.log(`  Visibility: ${post.visibility?.['com.linkedin.ugc.MemberNetworkVisibility'] || 'N/A'}`);
      console.log('');
    }
  } catch (error) {
    // If the ugcPosts endpoint fails, try the shares endpoint
    if (error.status === 403 || error.status === 401) {
      console.log('Note: Unable to list posts. This may require additional API permissions.');
      console.log('LinkedIn has restricted the ability to list posts in recent API versions.');
      console.log('\nYou can still create and delete posts if you know the post URN.');
    } else {
      throw error;
    }
  }
}

// Get a specific post
async function getPost(shareUrn, args) {
  const token = getToken();
  
  console.log(`Fetching post ${shareUrn}...\n`);
  
  const endpoint = `/ugcPosts/${encodeURIComponent(shareUrn)}`;
  const response = await apiRequest('GET', endpoint, token);
  
  if (args.verbose) {
    console.log(JSON.stringify(response, null, 2));
    return;
  }
  
  const shareContent = response.specificContent?.['com.linkedin.ugc.ShareContent'];
  const text = shareContent?.shareCommentary?.text || '[No text]';
  const mediaCategory = shareContent?.shareMediaCategory || 'NONE';
  
  console.log('Post Details:');
  console.log('=============');
  console.log(`ID: ${response.id}`);
  console.log(`Author: ${response.author}`);
  console.log(`Type: ${mediaCategory}`);
  console.log(`Visibility: ${response.visibility?.['com.linkedin.ugc.MemberNetworkVisibility'] || 'N/A'}`);
  console.log(`Created: ${formatDate(response.created?.time)}`);
  console.log(`\nContent:\n${text}`);
  
  if (shareContent?.media?.length > 0) {
    console.log('\nMedia:');
    for (const media of shareContent.media) {
      if (media.originalUrl) {
        console.log(`  URL: ${media.originalUrl}`);
      }
      if (media.media) {
        console.log(`  Asset: ${media.media}`);
      }
    }
  }
}

// Delete a post
async function deletePost(shareUrn, args) {
  const token = getToken();
  
  // Try to get post details first
  let postDetails = '';
  try {
    const endpoint = `/ugcPosts/${encodeURIComponent(shareUrn)}`;
    const response = await apiRequest('GET', endpoint, token);
    const text = response.specificContent?.['com.linkedin.ugc.ShareContent']?.shareCommentary?.text || '';
    postDetails = text.substring(0, 50) + (text.length > 50 ? '...' : '');
  } catch (e) {
    postDetails = '(unable to fetch details)';
  }
  
  const confirmed = await confirmDestructiveAction(
    `Delete post: ${shareUrn}`,
    [
      `Preview: ${postDetails}`,
      'The post will be permanently removed from LinkedIn.'
    ],
    args.force
  );
  
  if (!confirmed) return;
  
  console.log('Deleting post...\n');
  
  const endpoint = `/ugcPosts/${encodeURIComponent(shareUrn)}`;
  await apiRequest('DELETE', endpoint, token);
  
  console.log('✓ Post deleted successfully.');
}

// Main
async function main() {
  const args = parseArgs(process.argv.slice(2));
  const command = args._[0];
  
  try {
    switch (command) {
      case 'create':
        await createPost(args);
        break;
      case 'list':
        await listPosts(args);
        break;
      case 'get':
        if (!args._[1]) {
          console.error('Error: Post URN required');
          console.error('Usage: node posts.js get <shareUrn>');
          process.exit(1);
        }
        await getPost(args._[1], args);
        break;
      case 'delete':
        if (!args._[1]) {
          console.error('Error: Post URN required');
          console.error('Usage: node posts.js delete <shareUrn>');
          process.exit(1);
        }
        await deletePost(args._[1], args);
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
