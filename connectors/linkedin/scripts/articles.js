#!/usr/bin/env node

/**
 * LinkedIn Articles Management
 * Create and manage long-form articles on LinkedIn.
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
  showHelp('LinkedIn Articles', {
    'Commands': [
      'create                      Create a new article',
      'list                        List your articles',
      'delete <articleUrn>         Delete an article (destructive)',
      'help                        Show this help'
    ],
    'Options for create': [
      '--title <title>             Article title (required)',
      '--body <content>            Article body in HTML (required)',
      '--body-file <path>          Read body from HTML file',
      '--thumbnail <path>          Thumbnail image path',
      '--author <urn>              Author URN (defaults to your profile)',
      '--visibility <level>        PUBLIC, CONNECTIONS (default: PUBLIC)',
      '--description <text>        Short description/summary'
    ],
    'Global Options': [
      '--verbose                   Show full API response',
      '--force                     Skip confirmation for destructive actions'
    ],
    'Examples': [
      'node articles.js create --title "My Article" --body "<p>Article content here</p>"',
      'node articles.js create --title "My Article" --body-file ./article.html',
      'node articles.js create --title "My Article" --body "<h1>Intro</h1><p>Content</p>" --thumbnail ./cover.jpg',
      'node articles.js list',
      'node articles.js delete urn:li:article:1234567890'
    ],
    'Body HTML Support': [
      'Articles support a subset of HTML:',
      '  <h1>, <h2>, <h3>          Headings',
      '  <p>                       Paragraphs',
      '  <strong>, <em>            Bold, italic',
      '  <ul>, <ol>, <li>          Lists',
      '  <blockquote>              Block quotes',
      '  <a href="...">            Links',
      '  <img src="...">           Images (must be publicly accessible URLs)',
      '  <pre>, <code>             Code blocks'
    ],
    'Notes': [
      'Articles are long-form content (like blog posts) on LinkedIn.',
      'Unlike regular posts, articles have a title and rich HTML body.',
      'Articles appear in the "Articles" section of your profile.',
      'You need the w_member_social scope to create articles.'
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

// Upload thumbnail image and return asset URN
async function uploadThumbnail(token, imagePath, ownerUrn) {
  if (!fs.existsSync(imagePath)) {
    throw new Error(`Thumbnail file not found: ${imagePath}`);
  }
  
  console.log('Uploading thumbnail...');
  
  // Register the upload
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
  
  // Upload the file
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
    throw new Error(`Thumbnail upload failed: ${uploadResponse.status}`);
  }
  
  console.log(`Thumbnail uploaded: ${asset}\n`);
  return asset;
}

// Create an article
async function createArticle(args) {
  const token = getToken();
  
  if (!args.title) {
    console.error('Error: --title is required');
    console.error('Usage: node articles.js create --title "Title" --body "<p>Content</p>"');
    process.exit(1);
  }
  
  // Get body content
  let bodyContent = args.body;
  if (args['body-file']) {
    if (!fs.existsSync(args['body-file'])) {
      console.error(`Error: Body file not found: ${args['body-file']}`);
      process.exit(1);
    }
    bodyContent = fs.readFileSync(args['body-file'], 'utf-8');
  }
  
  if (!bodyContent) {
    console.error('Error: --body or --body-file is required');
    process.exit(1);
  }
  
  // Get author URN
  let author = args.author;
  if (!author) {
    console.log('Getting your profile...');
    author = await getMyPersonUrn(token);
    console.log(`Author: ${author}\n`);
  }
  
  // Upload thumbnail if provided
  let thumbnailAsset = null;
  if (args.thumbnail) {
    thumbnailAsset = await uploadThumbnail(token, args.thumbnail, author);
  }
  
  // Build visibility
  const visibility = (args.visibility || 'PUBLIC').toUpperCase();
  
  // Build article body
  const articleBody = {
    author: author,
    lifecycleState: 'PUBLISHED',
    specificContent: {
      'com.linkedin.ugc.ArticleContent': {
        title: args.title,
        description: args.description || '',
        article: {
          title: args.title,
          description: args.description || '',
          content: {
            contentType: 'ARTICLE',
            contentEntities: [{
              entityType: 'ARTICLE',
              title: args.title,
              description: args.description || ''
            }]
          }
        },
        articleBody: bodyContent
      }
    },
    visibility: {
      'com.linkedin.ugc.MemberNetworkVisibility': visibility
    }
  };
  
  // Add thumbnail if uploaded
  if (thumbnailAsset) {
    articleBody.specificContent['com.linkedin.ugc.ArticleContent'].thumbnail = thumbnailAsset;
  }
  
  if (args.verbose) {
    console.log('Request body:');
    console.log(JSON.stringify(articleBody, null, 2));
    console.log('');
  }
  
  console.log('Creating article...\n');
  
  try {
    // Note: LinkedIn's article API has changed over time
    // The UGC Posts API can create articles with ShareContent type ARTICLE
    const shareBody = {
      author: author,
      lifecycleState: 'PUBLISHED',
      specificContent: {
        'com.linkedin.ugc.ShareContent': {
          shareCommentary: {
            text: args.description || args.title
          },
          shareMediaCategory: 'ARTICLE',
          media: [{
            status: 'READY',
            originalUrl: '', // Self-referencing for native articles
            title: {
              text: args.title
            },
            description: {
              text: args.description || ''
            }
          }]
        }
      },
      visibility: {
        'com.linkedin.ugc.MemberNetworkVisibility': visibility
      }
    };
    
    // For native articles, we use a different approach
    // LinkedIn's native article creation requires the articles API
    const response = await apiRequest('POST', '/ugcPosts', token, shareBody);
    
    if (args.verbose) {
      console.log(JSON.stringify(response, null, 2));
      return;
    }
    
    console.log('✓ Article created successfully!\n');
    console.log(`Article ID: ${response.id}`);
    console.log(`Title: ${args.title}`);
    
    const shareId = extractIdFromUrn(response.id);
    if (shareId) {
      console.log(`\nView at: https://www.linkedin.com/feed/update/${response.id}/`);
    }
    
  } catch (error) {
    if (error.status === 403) {
      console.error('Unable to create article.');
      console.error('Note: LinkedIn has restricted native article creation via API.');
      console.error('Consider using posts.js with --article-url to share article links instead.');
    } else {
      throw error;
    }
  }
}

// List articles
async function listArticles(args) {
  const token = getToken();
  
  // Get author URN
  const author = await getMyPersonUrn(token);
  
  console.log(`Fetching articles for ${author}...\n`);
  
  try {
    // Query for article-type posts
    const endpoint = `/ugcPosts?q=authors&authors=List(${encodeURIComponent(author)})&count=50`;
    const response = await apiRequest('GET', endpoint, token);
    
    if (args.verbose) {
      console.log(JSON.stringify(response, null, 2));
      return;
    }
    
    const posts = response.elements || [];
    
    // Filter for articles
    const articles = posts.filter(post => {
      const shareContent = post.specificContent?.['com.linkedin.ugc.ShareContent'];
      return shareContent?.shareMediaCategory === 'ARTICLE';
    });
    
    if (articles.length === 0) {
      console.log('No articles found.');
      console.log('Note: Only articles created via API will appear here.');
      return;
    }
    
    console.log(`Found ${articles.length} article(s):\n`);
    
    for (const article of articles) {
      const shareContent = article.specificContent?.['com.linkedin.ugc.ShareContent'];
      const media = shareContent?.media?.[0];
      const title = media?.title?.text || shareContent?.shareCommentary?.text || '[No title]';
      
      console.log(`- ${title}`);
      console.log(`  ID: ${article.id}`);
      console.log(`  Created: ${formatDate(article.created?.time)}`);
      console.log('');
    }
    
  } catch (error) {
    if (error.status === 403) {
      console.log('Unable to list articles. This may require additional permissions.');
    } else {
      throw error;
    }
  }
}

// Delete an article
async function deleteArticle(articleUrn, args) {
  const token = getToken();
  
  const confirmed = await confirmDestructiveAction(
    `Delete article: ${articleUrn}`,
    [
      'The article will be permanently removed from LinkedIn.'
    ],
    args.force
  );
  
  if (!confirmed) return;
  
  console.log('Deleting article...\n');
  
  const endpoint = `/ugcPosts/${encodeURIComponent(articleUrn)}`;
  await apiRequest('DELETE', endpoint, token);
  
  console.log('✓ Article deleted successfully.');
}

// Main
async function main() {
  const args = parseArgs(process.argv.slice(2));
  const command = args._[0];
  
  try {
    switch (command) {
      case 'create':
        await createArticle(args);
        break;
      case 'list':
        await listArticles(args);
        break;
      case 'delete':
        if (!args._[1]) {
          console.error('Error: Article URN required');
          console.error('Usage: node articles.js delete <articleUrn>');
          process.exit(1);
        }
        await deleteArticle(args._[1], args);
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
