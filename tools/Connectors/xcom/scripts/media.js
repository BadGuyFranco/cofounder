#!/usr/bin/env node

/**
 * X.com Media Upload
 * Upload images and videos for use in tweets.
 */

import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import FormData from 'form-data';
import {
  parseArgs, initScript, getCredentials, generateOAuthHeader,
  handleError, showHelp
} from './utils.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const args = parseArgs(process.argv.slice(2));
initScript(path.join(__dirname, '..'), args);

const UPLOAD_URL = 'https://upload.twitter.com/1.1/media/upload.json';

// Help documentation
function printHelp() {
  showHelp('X.com Media Upload', {
    'Commands': [
      'upload <file>              Upload an image or video file',
      'status <media_id>          Check processing status (for videos)',
      'help                       Show this help'
    ],
    'Options': [
      '--alt <text>               Alt text for accessibility (images only)',
      '--category <type>          Media category: tweet_image, tweet_gif, tweet_video',
      '--verbose                  Show full API response'
    ],
    'Examples': [
      'node media.js upload ~/Pictures/photo.jpg',
      'node media.js upload ~/Pictures/photo.png --alt "A beautiful sunset"',
      'node media.js upload ~/Videos/clip.mp4',
      'node media.js status 1234567890123456789'
    ],
    'Supported Formats': [
      'Images: JPG, PNG, GIF, WEBP (max 5MB)',
      'Videos: MP4 (max 512MB, up to 140 seconds)',
      'Animated GIF: GIF (max 15MB)'
    ],
    'Notes': [
      'Upload returns a media_id to use with posts.js --media',
      'Videos require async upload and status polling',
      'Media expires after 24 hours if not attached to a tweet'
    ]
  });
}

// Simple upload for images under 5MB
async function uploadSimple(filePath, args) {
  const credentials = getCredentials();
  
  if (!fs.existsSync(filePath)) {
    console.error(`Error: File not found: ${filePath}`);
    process.exit(1);
  }
  
  const fileBuffer = fs.readFileSync(filePath);
  const fileBase64 = fileBuffer.toString('base64');
  const fileSize = fileBuffer.length;
  
  console.log(`Uploading ${path.basename(filePath)} (${(fileSize / 1024).toFixed(1)} KB)...\n`);
  
  // Determine media category from extension
  const ext = path.extname(filePath).toLowerCase();
  let mediaCategory = 'tweet_image';
  if (ext === '.gif') {
    mediaCategory = fileSize > 5 * 1024 * 1024 ? 'tweet_gif' : 'tweet_image';
  } else if (ext === '.mp4' || ext === '.mov') {
    mediaCategory = 'tweet_video';
  }
  
  // Override if specified
  if (args.category) {
    mediaCategory = args.category;
  }
  
  // For videos and large files, use chunked upload
  if (mediaCategory === 'tweet_video' || fileSize > 5 * 1024 * 1024) {
    return await uploadChunked(filePath, fileBuffer, mediaCategory, args);
  }
  
  // Use multipart/form-data for media upload
  // OAuth signature should NOT include body params for multipart
  const boundary = '----WebKitFormBoundary' + crypto.randomBytes(16).toString('hex');
  
  const bodyParts = [
    `--${boundary}`,
    'Content-Disposition: form-data; name="media_data"',
    '',
    fileBase64,
    `--${boundary}--`
  ];
  const body = bodyParts.join('\r\n');
  
  const oauthHeader = generateOAuthHeader('POST', UPLOAD_URL, {}, credentials);
  
  const response = await fetch(UPLOAD_URL, {
    method: 'POST',
    headers: {
      'Authorization': oauthHeader,
      'Content-Type': `multipart/form-data; boundary=${boundary}`
    },
    body: body
  });
  
  const data = await response.json();
  
  if (!response.ok) {
    const error = new Error(data.error || data.errors?.[0]?.message || 'Upload failed');
    error.status = response.status;
    error.data = data;
    throw error;
  }
  
  if (args.verbose) {
    console.log(JSON.stringify(data, null, 2));
    return;
  }
  
  console.log('Upload successful!\n');
  console.log(`Media ID: ${data.media_id_string}`);
  console.log(`Type: ${data.image?.image_type || 'unknown'}`);
  console.log(`Size: ${data.image?.w || '?'}x${data.image?.h || '?'}`);
  
  // Add alt text if provided
  if (args.alt) {
    await addAltText(data.media_id_string, args.alt, args);
  }
  
  console.log(`\nUse with: node posts.js create "Your text" --media ${data.media_id_string}`);
}

// Chunked upload for videos and large files
async function uploadChunked(filePath, fileBuffer, mediaCategory, args) {
  const credentials = getCredentials();
  const fileSize = fileBuffer.length;
  
  // Determine MIME type
  const ext = path.extname(filePath).toLowerCase();
  const mimeTypes = {
    '.mp4': 'video/mp4',
    '.mov': 'video/quicktime',
    '.gif': 'image/gif',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.webp': 'image/webp'
  };
  const mimeType = mimeTypes[ext] || 'application/octet-stream';
  
  console.log(`Using chunked upload for ${mediaCategory}...\n`);
  
  // Helper to create multipart body
  function createMultipartBody(fields) {
    const boundary = '----WebKitFormBoundary' + crypto.randomBytes(16).toString('hex');
    const parts = [];
    for (const [name, value] of Object.entries(fields)) {
      parts.push(`--${boundary}`);
      parts.push(`Content-Disposition: form-data; name="${name}"`);
      parts.push('');
      parts.push(value);
    }
    parts.push(`--${boundary}--`);
    return { body: parts.join('\r\n'), boundary };
  }
  
  // INIT
  console.log('Step 1/3: Initializing upload...');
  const initFields = {
    command: 'INIT',
    total_bytes: fileSize.toString(),
    media_type: mimeType,
    media_category: mediaCategory
  };
  const { body: initBody, boundary: initBoundary } = createMultipartBody(initFields);
  const initHeader = generateOAuthHeader('POST', UPLOAD_URL, {}, credentials);
  
  const initResponse = await fetch(UPLOAD_URL, {
    method: 'POST',
    headers: {
      'Authorization': initHeader,
      'Content-Type': `multipart/form-data; boundary=${initBoundary}`
    },
    body: initBody
  });
  
  const initData = await initResponse.json();
  
  if (!initResponse.ok) {
    const error = new Error(initData.error || initData.errors?.[0]?.message || 'INIT failed');
    error.data = initData;
    throw error;
  }
  
  const mediaId = initData.media_id_string;
  console.log(`  Media ID: ${mediaId}`);
  
  // APPEND (upload in chunks)
  console.log('Step 2/3: Uploading chunks...');
  const CHUNK_SIZE = 5 * 1024 * 1024; // 5MB chunks
  let segmentIndex = 0;
  let bytesUploaded = 0;
  
  while (bytesUploaded < fileSize) {
    const chunk = fileBuffer.slice(bytesUploaded, bytesUploaded + CHUNK_SIZE);
    const chunkBase64 = chunk.toString('base64');
    
    const appendFields = {
      command: 'APPEND',
      media_id: mediaId,
      media_data: chunkBase64,
      segment_index: segmentIndex.toString()
    };
    const { body: appendBody, boundary: appendBoundary } = createMultipartBody(appendFields);
    const appendHeader = generateOAuthHeader('POST', UPLOAD_URL, {}, credentials);
    
    const appendResponse = await fetch(UPLOAD_URL, {
      method: 'POST',
      headers: {
        'Authorization': appendHeader,
        'Content-Type': `multipart/form-data; boundary=${appendBoundary}`
      },
      body: appendBody
    });
    
    if (!appendResponse.ok) {
      let appendData = {};
      try { appendData = await appendResponse.json(); } catch (e) {}
      const error = new Error(appendData.error || appendData.errors?.[0]?.message || 'APPEND failed');
      error.data = appendData;
      throw error;
    }
    
    bytesUploaded += chunk.length;
    segmentIndex++;
    
    const progress = ((bytesUploaded / fileSize) * 100).toFixed(1);
    console.log(`  Uploaded ${(bytesUploaded / 1024 / 1024).toFixed(1)}MB / ${(fileSize / 1024 / 1024).toFixed(1)}MB (${progress}%)`);
  }
  
  // FINALIZE
  console.log('Step 3/3: Finalizing upload...');
  const finalizeFields = {
    command: 'FINALIZE',
    media_id: mediaId
  };
  const { body: finalizeBody, boundary: finalizeBoundary } = createMultipartBody(finalizeFields);
  const finalizeHeader = generateOAuthHeader('POST', UPLOAD_URL, {}, credentials);
  
  const finalizeResponse = await fetch(UPLOAD_URL, {
    method: 'POST',
    headers: {
      'Authorization': finalizeHeader,
      'Content-Type': `multipart/form-data; boundary=${finalizeBoundary}`
    },
    body: finalizeBody
  });
  
  const finalizeData = await finalizeResponse.json();
  
  if (!finalizeResponse.ok) {
    const error = new Error(finalizeData.error || finalizeData.errors?.[0]?.message || 'FINALIZE failed');
    error.data = finalizeData;
    throw error;
  }
  
  // Check if processing is needed (for videos)
  if (finalizeData.processing_info) {
    console.log('\nVideo is being processed...');
    await waitForProcessing(mediaId, finalizeData.processing_info, args);
  }
  
  if (args.verbose) {
    console.log(JSON.stringify(finalizeData, null, 2));
    return;
  }
  
  console.log('\nUpload successful!\n');
  console.log(`Media ID: ${mediaId}`);
  
  console.log(`\nUse with: node posts.js create "Your text" --media ${mediaId}`);
}

// Wait for video processing
async function waitForProcessing(mediaId, processingInfo, args) {
  const credentials = getCredentials();
  
  let state = processingInfo.state;
  let checkAfterSecs = processingInfo.check_after_secs || 5;
  
  while (state === 'pending' || state === 'in_progress') {
    console.log(`  Status: ${state}, checking again in ${checkAfterSecs}s...`);
    
    await new Promise(resolve => setTimeout(resolve, checkAfterSecs * 1000));
    
    const statusUrl = `${UPLOAD_URL}?command=STATUS&media_id=${mediaId}`;
    const statusHeader = generateOAuthHeader('GET', statusUrl, {}, credentials);
    
    const statusResponse = await fetch(statusUrl, {
      method: 'GET',
      headers: {
        'Authorization': statusHeader
      }
    });
    
    const statusData = await statusResponse.json();
    
    if (!statusResponse.ok) {
      const error = new Error(statusData.error || 'STATUS check failed');
      error.data = statusData;
      throw error;
    }
    
    if (!statusData.processing_info) {
      break;
    }
    
    state = statusData.processing_info.state;
    checkAfterSecs = statusData.processing_info.check_after_secs || 5;
    
    if (state === 'failed') {
      const error = new Error(`Video processing failed: ${statusData.processing_info.error?.message || 'Unknown error'}`);
      error.data = statusData;
      throw error;
    }
  }
  
  console.log('  Processing complete!');
}

// Add alt text to an image
async function addAltText(mediaId, altText, args) {
  const credentials = getCredentials();
  
  const url = 'https://upload.twitter.com/1.1/media/metadata/create.json';
  const body = {
    media_id: mediaId,
    alt_text: {
      text: altText
    }
  };
  
  const oauthHeader = generateOAuthHeader('POST', url, {}, credentials);
  
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': oauthHeader,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(body)
  });
  
  if (!response.ok) {
    console.log('Warning: Could not add alt text');
    return;
  }
  
  console.log(`Alt text added: "${altText}"`);
}

// Check media status
async function checkStatus(mediaId, args) {
  const credentials = getCredentials();
  
  const statusUrl = `${UPLOAD_URL}?command=STATUS&media_id=${mediaId}`;
  const statusHeader = generateOAuthHeader('GET', statusUrl, {}, credentials);
  
  const response = await fetch(statusUrl, {
    method: 'GET',
    headers: {
      'Authorization': statusHeader
    }
  });
  
  const data = await response.json();
  
  if (!response.ok) {
    const error = new Error(data.error || 'STATUS check failed');
    error.status = response.status;
    error.data = data;
    throw error;
  }
  
  if (args.verbose) {
    console.log(JSON.stringify(data, null, 2));
    return;
  }
  
  console.log(`Media ID: ${data.media_id_string}`);
  
  if (data.processing_info) {
    console.log(`State: ${data.processing_info.state}`);
    if (data.processing_info.progress_percent !== undefined) {
      console.log(`Progress: ${data.processing_info.progress_percent}%`);
    }
    if (data.processing_info.check_after_secs) {
      console.log(`Check again in: ${data.processing_info.check_after_secs}s`);
    }
    if (data.processing_info.error) {
      console.log(`Error: ${data.processing_info.error.message}`);
    }
  } else {
    console.log('State: ready');
  }
}

// Main
async function main() {
  const command = args._[0];
  
  try {
    switch (command) {
      case 'upload':
        if (!args._[1]) {
          console.error('Error: File path required');
          console.error('Usage: node media.js upload <file>');
          process.exit(1);
        }
        await uploadSimple(args._[1], args);
        break;
      case 'status':
        if (!args._[1]) {
          console.error('Error: Media ID required');
          console.error('Usage: node media.js status <media_id>');
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
