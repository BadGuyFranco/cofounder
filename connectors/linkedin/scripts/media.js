#!/usr/bin/env node

/**
 * LinkedIn Media Management
 * Upload images and videos for use in posts.
 */

import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs';
import {
  loadEnv, getToken, parseArgs, apiRequest, handleError, showHelp,
  formatDate
} from './utils.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
loadEnv(path.join(__dirname, '..'));

// Help documentation
function printHelp() {
  showHelp('LinkedIn Media', {
    'Commands': [
      'upload <file>               Upload an image or video',
      'status <asset>              Check upload status',
      'help                        Show this help'
    ],
    'Options': [
      '--owner <urn>               Owner URN (defaults to your profile)',
      '--type <type>               Media type: IMAGE or VIDEO (auto-detected)',
      '--verbose                   Show full API response'
    ],
    'Examples': [
      'node media.js upload /path/to/image.jpg',
      'node media.js upload /path/to/video.mp4 --type VIDEO',
      'node media.js status urn:li:digitalmediaAsset:123456789',
      'node media.js upload photo.png --owner urn:li:organization:12345'
    ],
    'Supported Formats': [
      'Images: JPG, JPEG, PNG, GIF, WEBP',
      'Videos: MP4 (H.264 codec recommended)',
      '',
      'Image limits:',
      '  - Max file size: 8MB',
      '  - Recommended: 1200 x 1200 for square, 1200 x 627 for landscape',
      '',
      'Video limits:',
      '  - Max file size: 200MB (5GB for some accounts)',
      '  - Max duration: 10 minutes',
      '  - Recommended: MP4, H.264, AAC audio'
    ],
    'Notes': [
      'After uploading, use the returned asset URN in posts.js create --image-asset',
      'Video uploads may take time to process; check status before using.'
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

// Detect media type from file extension
function detectMediaType(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  const imageExts = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
  const videoExts = ['.mp4', '.mov', '.avi', '.webm'];
  
  if (imageExts.includes(ext)) return 'IMAGE';
  if (videoExts.includes(ext)) return 'VIDEO';
  
  throw new Error(`Unsupported file type: ${ext}. Use --type to specify IMAGE or VIDEO.`);
}

// Get content type from file extension
function getContentType(filePath, mediaType) {
  const ext = path.extname(filePath).toLowerCase();
  
  if (mediaType === 'IMAGE') {
    const types = {
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.gif': 'image/gif',
      '.webp': 'image/webp'
    };
    return types[ext] || 'image/jpeg';
  }
  
  if (mediaType === 'VIDEO') {
    const types = {
      '.mp4': 'video/mp4',
      '.mov': 'video/quicktime',
      '.avi': 'video/x-msvideo',
      '.webm': 'video/webm'
    };
    return types[ext] || 'video/mp4';
  }
  
  return 'application/octet-stream';
}

// Upload media
async function uploadMedia(filePath, args) {
  const token = getToken();
  
  // Check file exists
  if (!fs.existsSync(filePath)) {
    console.error(`Error: File not found: ${filePath}`);
    process.exit(1);
  }
  
  const stats = fs.statSync(filePath);
  const fileSizeMB = (stats.size / (1024 * 1024)).toFixed(2);
  
  // Detect or use specified media type
  const mediaType = args.type?.toUpperCase() || detectMediaType(filePath);
  
  // Get owner URN
  let owner = args.owner;
  if (!owner) {
    console.log('Getting your profile...');
    owner = await getMyPersonUrn(token);
  }
  
  console.log(`\nUpload Details:`);
  console.log(`  File: ${path.basename(filePath)}`);
  console.log(`  Size: ${fileSizeMB} MB`);
  console.log(`  Type: ${mediaType}`);
  console.log(`  Owner: ${owner}`);
  console.log('');
  
  // Check size limits
  if (mediaType === 'IMAGE' && stats.size > 8 * 1024 * 1024) {
    console.error('Error: Image exceeds 8MB limit');
    process.exit(1);
  }
  if (mediaType === 'VIDEO' && stats.size > 200 * 1024 * 1024) {
    console.warn('Warning: Video exceeds 200MB. Upload may fail depending on account type.');
  }
  
  // Step 1: Register the upload
  console.log('Step 1: Registering upload...');
  
  const recipe = mediaType === 'VIDEO' 
    ? 'urn:li:digitalmediaRecipe:feedshare-video'
    : 'urn:li:digitalmediaRecipe:feedshare-image';
  
  const registerBody = {
    registerUploadRequest: {
      recipes: [recipe],
      owner: owner,
      serviceRelationships: [{
        relationshipType: 'OWNER',
        identifier: 'urn:li:userGeneratedContent'
      }]
    }
  };
  
  if (args.verbose) {
    console.log('Register request:');
    console.log(JSON.stringify(registerBody, null, 2));
  }
  
  const registerResponse = await apiRequest('POST', '/assets?action=registerUpload', token, registerBody);
  
  if (args.verbose) {
    console.log('Register response:');
    console.log(JSON.stringify(registerResponse, null, 2));
  }
  
  const uploadMechanism = registerResponse.value.uploadMechanism;
  const asset = registerResponse.value.asset;
  
  console.log(`  Asset URN: ${asset}`);
  
  // Handle different upload mechanisms
  if (uploadMechanism['com.linkedin.digitalmedia.uploading.MediaUploadHttpRequest']) {
    // Single-part upload (images and small videos)
    const uploadUrl = uploadMechanism['com.linkedin.digitalmedia.uploading.MediaUploadHttpRequest'].uploadUrl;
    
    console.log('\nStep 2: Uploading file...');
    
    const fileBuffer = fs.readFileSync(filePath);
    const contentType = getContentType(filePath, mediaType);
    
    const uploadResponse = await fetch(uploadUrl, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': contentType
      },
      body: fileBuffer
    });
    
    if (!uploadResponse.ok) {
      const errorText = await uploadResponse.text();
      throw new Error(`Upload failed: ${uploadResponse.status} - ${errorText}`);
    }
    
    console.log('  Upload complete!');
    
  } else if (uploadMechanism['com.linkedin.digitalmedia.uploading.MultipartUpload']) {
    // Multi-part upload (large videos)
    const multipart = uploadMechanism['com.linkedin.digitalmedia.uploading.MultipartUpload'];
    const partUploadRequests = multipart.partUploadRequests;
    
    console.log(`\nStep 2: Uploading file in ${partUploadRequests.length} parts...`);
    
    const fileBuffer = fs.readFileSync(filePath);
    const etags = [];
    
    for (let i = 0; i < partUploadRequests.length; i++) {
      const part = partUploadRequests[i];
      const start = part.byteRange.firstByte;
      const end = part.byteRange.lastByte + 1;
      const chunk = fileBuffer.slice(start, end);
      
      console.log(`  Uploading part ${i + 1}/${partUploadRequests.length} (${((end - start) / 1024 / 1024).toFixed(2)} MB)...`);
      
      const partResponse = await fetch(part.uploadUrl, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/octet-stream'
        },
        body: chunk
      });
      
      if (!partResponse.ok) {
        throw new Error(`Part ${i + 1} upload failed: ${partResponse.status}`);
      }
      
      etags.push({
        partNumber: i + 1,
        etag: partResponse.headers.get('etag')
      });
    }
    
    // Complete multipart upload
    console.log('\nStep 3: Finalizing upload...');
    
    const completeBody = {
      completeMultipartUploadRequest: {
        mediaArtifact: asset,
        metadata: multipart.metadata,
        partUploadResponses: etags
      }
    };
    
    await apiRequest('POST', '/assets?action=completeMultipartUpload', token, completeBody);
    console.log('  Upload complete!');
  }
  
  // Check status for videos
  if (mediaType === 'VIDEO') {
    console.log('\nStep 3: Checking processing status...');
    console.log('  (Videos may take a few minutes to process)');
    
    // Wait a moment then check
    await new Promise(resolve => setTimeout(resolve, 2000));
    await checkStatus(asset, args);
  }
  
  console.log('\n✓ Media upload successful!\n');
  console.log(`Asset URN: ${asset}`);
  console.log('\nTo use in a post, reference this asset URN.');
  console.log('The asset URN can be used with: node posts.js create --image-asset <urn>');
  
  return asset;
}

// Check upload status
async function checkStatus(assetUrn, args) {
  const token = getToken();
  
  // URL encode the URN
  const encodedUrn = encodeURIComponent(assetUrn);
  
  const response = await apiRequest('GET', `/assets/${encodedUrn}`, token);
  
  if (args.verbose) {
    console.log(JSON.stringify(response, null, 2));
    return;
  }
  
  console.log('\nAsset Status:');
  console.log('=============');
  console.log(`Asset: ${response.id || assetUrn}`);
  console.log(`Owner: ${response.owner}`);
  console.log(`Created: ${formatDate(response.created)}`);
  
  // Check recipes/processing status
  if (response.recipes) {
    console.log('\nProcessing Status:');
    for (const recipe of response.recipes) {
      console.log(`  Recipe: ${recipe.recipe}`);
      console.log(`  Status: ${recipe.status}`);
    }
  }
  
  // Check if available
  if (response.status) {
    console.log(`\nOverall Status: ${response.status}`);
    
    if (response.status === 'AVAILABLE') {
      console.log('✓ Asset is ready to use');
    } else if (response.status === 'PROCESSING') {
      console.log('⏳ Asset is still processing. Check again in a few moments.');
    } else if (response.status === 'FAILED') {
      console.log('✗ Asset processing failed');
    }
  }
}

// Main
async function main() {
  const args = parseArgs(process.argv.slice(2));
  const command = args._[0];
  
  try {
    switch (command) {
      case 'upload':
        if (!args._[1]) {
          console.error('Error: File path required');
          console.error('Usage: node media.js upload <file>');
          process.exit(1);
        }
        await uploadMedia(args._[1], args);
        break;
      case 'status':
        if (!args._[1]) {
          console.error('Error: Asset URN required');
          console.error('Usage: node media.js status <assetUrn>');
          process.exit(1);
        }
        await checkStatus(args._[1], args);
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
