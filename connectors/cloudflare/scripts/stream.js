#!/usr/bin/env node
/**
 * Cloudflare Stream Script
 * Manage video hosting and streaming.
 * 
 * Note: Requires Account-level API token with Stream permission.
 */

import { parseArgs, apiRequest, fetchAllPages, output, outputError, loadConfig } from './utils.js';
import fs from 'fs';
import path from 'path';

function showHelp() {
  console.log(`
Stream Script - Manage Cloudflare Stream videos

Usage: node scripts/stream.js <command> [options]

Commands:
  list                            List all videos
  upload <file>                   Upload a video
  delete <video-id>               Delete a video
  info <video-id>                 Get video details
  embed <video-id>                Get embed code
  download <video-id>             Get download URL
  clip <video-id>                 Create a clip from video
  stats                           Get storage usage stats
  help                            Show this help

Upload Options:
  --name <name>             Video name
  --require-signed-urls     Require signed URLs for playback
  --watermark <uid>         Watermark profile UID

Clip Options:
  --start <seconds>         Clip start time
  --end <seconds>           Clip end time
  --name <name>             Clip name

Examples:
  node scripts/stream.js list
  node scripts/stream.js upload ./video.mp4 --name "My Video"
  node scripts/stream.js info abc123
  node scripts/stream.js embed abc123
  node scripts/stream.js clip abc123 --start 10 --end 30 --name "highlight"
  node scripts/stream.js delete abc123

Note: Requires Account-level token with Stream Edit permission.
Note: Large uploads may take significant time.
`);
}

async function getAccountId() {
  const data = await apiRequest('/zones?per_page=1');
  const zones = data.result || [];
  if (zones.length === 0) {
    throw new Error('No zones found. Cannot determine account ID.');
  }
  return zones[0].account.id;
}

async function listVideos() {
  const accountId = await getAccountId();
  const videos = await fetchAllPages(`/accounts/${accountId}/stream`);
  
  const simplified = videos.map(v => ({
    uid: v.uid,
    name: v.meta?.name || 'Unnamed',
    status: v.status?.state,
    duration: v.duration,
    size: v.size,
    created: v.created,
    thumbnail: v.thumbnail,
    playback: v.playback?.hls
  }));
  
  output(simplified);
}

async function uploadVideo(filePath, flags) {
  if (!filePath) {
    throw new Error('File path required');
  }

  if (!fs.existsSync(filePath)) {
    throw new Error(`File not found: ${filePath}`);
  }

  const accountId = await getAccountId();
  const config = loadConfig();
  const fileSize = fs.statSync(filePath).size;
  const fileName = path.basename(filePath);

  console.log(`Uploading ${fileName} (${(fileSize / 1024 / 1024).toFixed(2)} MB)...`);
  console.log('Note: Large uploads may take several minutes.');

  // Use TUS protocol for resumable upload
  const uploadLength = fileSize;
  
  // Create upload
  const createResponse = await fetch(`https://api.cloudflare.com/client/v4/accounts/${accountId}/stream?direct_user=true`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${config.CLOUDFLARE_API_TOKEN}`,
      'Tus-Resumable': '1.0.0',
      'Upload-Length': uploadLength.toString(),
      'Upload-Metadata': `name ${Buffer.from(flags.name || fileName).toString('base64')}`
    }
  });

  if (!createResponse.ok) {
    throw new Error(`Failed to create upload: ${createResponse.status}`);
  }

  const uploadUrl = createResponse.headers.get('Location');
  const streamMediaId = createResponse.headers.get('stream-media-id');

  // Upload file in chunks
  const chunkSize = 50 * 1024 * 1024; // 50MB chunks
  const fileStream = fs.createReadStream(filePath, { highWaterMark: chunkSize });
  let offset = 0;

  for await (const chunk of fileStream) {
    const patchResponse = await fetch(uploadUrl, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${config.CLOUDFLARE_API_TOKEN}`,
        'Content-Type': 'application/offset+octet-stream',
        'Tus-Resumable': '1.0.0',
        'Upload-Offset': offset.toString()
      },
      body: chunk
    });

    if (!patchResponse.ok) {
      throw new Error(`Upload failed at offset ${offset}: ${patchResponse.status}`);
    }

    offset += chunk.length;
    console.log(`Progress: ${((offset / fileSize) * 100).toFixed(1)}%`);
  }

  console.log('Upload complete. Processing video...');
  
  // Get video info
  const data = await apiRequest(`/accounts/${accountId}/stream/${streamMediaId}`);
  output(data.result);
}

async function deleteVideo(videoId) {
  if (!videoId) {
    throw new Error('Video ID required');
  }

  const accountId = await getAccountId();
  
  await apiRequest(`/accounts/${accountId}/stream/${videoId}`, {
    method: 'DELETE'
  });

  console.log(`Deleted video: ${videoId}`);
}

async function getVideoInfo(videoId) {
  if (!videoId) {
    throw new Error('Video ID required');
  }

  const accountId = await getAccountId();
  const data = await apiRequest(`/accounts/${accountId}/stream/${videoId}`);
  output(data.result);
}

async function getEmbedCode(videoId) {
  if (!videoId) {
    throw new Error('Video ID required');
  }

  const accountId = await getAccountId();
  const data = await apiRequest(`/accounts/${accountId}/stream/${videoId}/embed`);
  
  console.log('Embed code:');
  console.log(data.result);
}

async function getDownloadUrl(videoId) {
  if (!videoId) {
    throw new Error('Video ID required');
  }

  const accountId = await getAccountId();
  const data = await apiRequest(`/accounts/${accountId}/stream/${videoId}/downloads`);
  output(data.result);
}

async function createClip(videoId, flags) {
  if (!videoId) {
    throw new Error('Video ID required');
  }
  if (flags.start === undefined || flags.end === undefined) {
    throw new Error('--start and --end required');
  }

  const accountId = await getAccountId();
  
  const data = await apiRequest(`/accounts/${accountId}/stream/clip`, {
    method: 'POST',
    body: {
      clippedFromVideoUID: videoId,
      startTimeSeconds: parseInt(flags.start),
      endTimeSeconds: parseInt(flags.end),
      meta: flags.name ? { name: flags.name } : undefined
    }
  });

  console.log('Clip created');
  output(data.result);
}

async function getStats() {
  const accountId = await getAccountId();
  const data = await apiRequest(`/accounts/${accountId}/stream/storage-usage`);
  
  const stats = {
    totalStorageMinutes: data.result.totalStorageMinutes,
    videoCount: data.result.videoCount
  };
  
  output(stats);
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const command = args._[0] || 'help';

  if (command === 'help') {
    showHelp();
    return;
  }

  try {
    switch (command) {
      case 'list':
        await listVideos();
        break;

      case 'upload':
        await uploadVideo(args._[1], args);
        break;

      case 'delete':
        await deleteVideo(args._[1]);
        break;

      case 'info':
        await getVideoInfo(args._[1]);
        break;

      case 'embed':
        await getEmbedCode(args._[1]);
        break;

      case 'download':
        await getDownloadUrl(args._[1]);
        break;

      case 'clip':
        await createClip(args._[1], args);
        break;

      case 'stats':
        await getStats();
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
