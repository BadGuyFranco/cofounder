#!/usr/bin/env node
/**
 * YouTube Operations
 * Upload, manage videos, playlists, and captions.
 * 
 * Usage:
 *   node youtube.js videos --account user@example.com
 *   node youtube.js upload ./video.mp4 --title "My Video" --account user@example.com
 *   node youtube.js playlists --account user@example.com
 */

// Dependency check (must be first, before any npm imports)
import { ensureDeps } from '../../../system/shared/ensure-deps.js';
ensureDeps(import.meta.url);

// npm packages (dynamic import after dependency check)
const { google } = await import('googleapis');

// Built-in Node.js modules
import { createReadStream, readFileSync, existsSync, statSync } from 'fs';
import { basename, extname } from 'path';

// Local modules
import { getAuthClient } from './auth.js';
import {
  parseArgs,
  output,
  outputError,
  showHelp,
  requireApi
} from './utils.js';

/**
 * Get YouTube API instance
 */
async function getYouTubeApi(email) {
  const auth = await getAuthClient(email);
  return google.youtube({ version: 'v3', auth });
}

/**
 * Get my channel info
 */
async function getMyChannel(email) {
  const youtube = await getYouTubeApi(email);
  
  const response = await youtube.channels.list({
    part: ['snippet', 'statistics', 'contentDetails'],
    mine: true
  });
  
  if (!response.data.items || response.data.items.length === 0) {
    throw new Error('No YouTube channel found for this account');
  }
  
  const channel = response.data.items[0];
  return {
    id: channel.id,
    title: channel.snippet.title,
    description: channel.snippet.description,
    subscriberCount: channel.statistics.subscriberCount,
    videoCount: channel.statistics.videoCount,
    viewCount: channel.statistics.viewCount,
    uploadsPlaylistId: channel.contentDetails.relatedPlaylists.uploads
  };
}

/**
 * List my videos
 */
async function listVideos(email, maxResults = 20) {
  const youtube = await getYouTubeApi(email);
  
  // First get the uploads playlist ID
  const channel = await getMyChannel(email);
  
  const response = await youtube.playlistItems.list({
    part: ['snippet', 'contentDetails'],
    playlistId: channel.uploadsPlaylistId,
    maxResults
  });
  
  return (response.data.items || []).map(item => ({
    videoId: item.contentDetails.videoId,
    title: item.snippet.title,
    description: item.snippet.description,
    publishedAt: item.snippet.publishedAt,
    thumbnails: item.snippet.thumbnails
  }));
}

/**
 * Get video details
 */
async function getVideoDetails(email, videoId) {
  const youtube = await getYouTubeApi(email);
  
  const response = await youtube.videos.list({
    part: ['snippet', 'statistics', 'status', 'contentDetails'],
    id: [videoId]
  });
  
  if (!response.data.items || response.data.items.length === 0) {
    throw new Error(`Video not found: ${videoId}`);
  }
  
  const video = response.data.items[0];
  return {
    id: video.id,
    title: video.snippet.title,
    description: video.snippet.description,
    publishedAt: video.snippet.publishedAt,
    channelTitle: video.snippet.channelTitle,
    tags: video.snippet.tags,
    category: video.snippet.categoryId,
    duration: video.contentDetails.duration,
    privacy: video.status.privacyStatus,
    views: video.statistics.viewCount,
    likes: video.statistics.likeCount,
    comments: video.statistics.commentCount,
    url: `https://youtube.com/watch?v=${video.id}`
  };
}

/**
 * Upload a video
 */
async function uploadVideo(email, filePath, options = {}) {
  const youtube = await getYouTubeApi(email);
  
  if (!existsSync(filePath)) {
    throw new Error(`File not found: ${filePath}`);
  }
  
  const fileSize = statSync(filePath).size;
  const fileName = basename(filePath);
  
  console.log(`Uploading ${fileName} (${formatSize(fileSize)})...`);
  console.log('This may take a while for large files.');
  
  const response = await youtube.videos.insert({
    part: ['snippet', 'status'],
    requestBody: {
      snippet: {
        title: options.title || fileName.replace(extname(fileName), ''),
        description: options.description || '',
        tags: options.tags ? options.tags.split(',').map(t => t.trim()) : [],
        categoryId: options.category || '22' // People & Blogs
      },
      status: {
        privacyStatus: options.privacy || 'private',
        selfDeclaredMadeForKids: false,
        publishAt: options.publishAt || undefined
      }
    },
    media: {
      body: createReadStream(filePath)
    }
  });
  
  return {
    id: response.data.id,
    title: response.data.snippet.title,
    privacy: response.data.status.privacyStatus,
    url: `https://youtube.com/watch?v=${response.data.id}`
  };
}

/**
 * Update video metadata
 */
async function updateVideo(email, videoId, updates = {}) {
  const youtube = await getYouTubeApi(email);
  
  // First get current video details
  const current = await youtube.videos.list({
    part: ['snippet', 'status'],
    id: [videoId]
  });
  
  if (!current.data.items || current.data.items.length === 0) {
    throw new Error(`Video not found: ${videoId}`);
  }
  
  const video = current.data.items[0];
  
  // Build update request
  const updateBody = {
    id: videoId,
    snippet: {
      title: updates.title || video.snippet.title,
      description: updates.description !== undefined ? updates.description : video.snippet.description,
      tags: updates.tags ? updates.tags.split(',').map(t => t.trim()) : video.snippet.tags,
      categoryId: updates.category || video.snippet.categoryId
    }
  };
  
  const parts = ['snippet'];
  
  if (updates.privacy) {
    updateBody.status = {
      privacyStatus: updates.privacy
    };
    parts.push('status');
  }
  
  const response = await youtube.videos.update({
    part: parts,
    requestBody: updateBody
  });
  
  return {
    id: response.data.id,
    title: response.data.snippet.title,
    updated: true
  };
}

/**
 * Set video privacy
 */
async function setPrivacy(email, videoId, privacy) {
  const youtube = await getYouTubeApi(email);
  
  // Get current video to preserve snippet
  const current = await youtube.videos.list({
    part: ['snippet'],
    id: [videoId]
  });
  
  if (!current.data.items || current.data.items.length === 0) {
    throw new Error(`Video not found: ${videoId}`);
  }
  
  const response = await youtube.videos.update({
    part: ['status'],
    requestBody: {
      id: videoId,
      status: {
        privacyStatus: privacy
      }
    }
  });
  
  return {
    id: videoId,
    privacy: response.data.status.privacyStatus
  };
}

/**
 * Upload custom thumbnail
 */
async function uploadThumbnail(email, videoId, imagePath) {
  const youtube = await getYouTubeApi(email);
  
  if (!existsSync(imagePath)) {
    throw new Error(`Image not found: ${imagePath}`);
  }
  
  const response = await youtube.thumbnails.set({
    videoId,
    media: {
      body: createReadStream(imagePath)
    }
  });
  
  return {
    videoId,
    thumbnails: response.data.items[0]
  };
}

/**
 * Delete a video
 */
async function deleteVideo(email, videoId) {
  const youtube = await getYouTubeApi(email);
  
  await youtube.videos.delete({
    id: videoId
  });
  
  return { videoId, deleted: true };
}

/**
 * List playlists
 */
async function listPlaylists(email, maxResults = 25) {
  const youtube = await getYouTubeApi(email);
  
  const response = await youtube.playlists.list({
    part: ['snippet', 'contentDetails'],
    mine: true,
    maxResults
  });
  
  return (response.data.items || []).map(playlist => ({
    id: playlist.id,
    title: playlist.snippet.title,
    description: playlist.snippet.description,
    itemCount: playlist.contentDetails.itemCount,
    privacy: playlist.status?.privacyStatus,
    url: `https://youtube.com/playlist?list=${playlist.id}`
  }));
}

/**
 * Create a playlist
 */
async function createPlaylist(email, title, description = '', privacy = 'private') {
  const youtube = await getYouTubeApi(email);
  
  const response = await youtube.playlists.insert({
    part: ['snippet', 'status'],
    requestBody: {
      snippet: {
        title,
        description
      },
      status: {
        privacyStatus: privacy
      }
    }
  });
  
  return {
    id: response.data.id,
    title: response.data.snippet.title,
    url: `https://youtube.com/playlist?list=${response.data.id}`
  };
}

/**
 * Add video to playlist
 */
async function addToPlaylist(email, playlistId, videoId) {
  const youtube = await getYouTubeApi(email);
  
  const response = await youtube.playlistItems.insert({
    part: ['snippet'],
    requestBody: {
      snippet: {
        playlistId,
        resourceId: {
          kind: 'youtube#video',
          videoId
        }
      }
    }
  });
  
  return {
    playlistItemId: response.data.id,
    playlistId,
    videoId
  };
}

/**
 * Remove video from playlist
 */
async function removeFromPlaylist(email, playlistItemId) {
  const youtube = await getYouTubeApi(email);
  
  await youtube.playlistItems.delete({
    id: playlistItemId
  });
  
  return { playlistItemId, removed: true };
}

/**
 * Delete playlist
 */
async function deletePlaylist(email, playlistId) {
  const youtube = await getYouTubeApi(email);
  
  await youtube.playlists.delete({
    id: playlistId
  });
  
  return { playlistId, deleted: true };
}

/**
 * List captions for a video
 */
async function listCaptions(email, videoId) {
  const youtube = await getYouTubeApi(email);
  
  const response = await youtube.captions.list({
    part: ['snippet'],
    videoId
  });
  
  return (response.data.items || []).map(caption => ({
    id: caption.id,
    language: caption.snippet.language,
    name: caption.snippet.name,
    trackKind: caption.snippet.trackKind,
    isDraft: caption.snippet.isDraft
  }));
}

/**
 * Upload captions
 */
async function uploadCaptions(email, videoId, filePath, language = 'en', name = '') {
  const youtube = await getYouTubeApi(email);
  
  if (!existsSync(filePath)) {
    throw new Error(`Caption file not found: ${filePath}`);
  }
  
  const response = await youtube.captions.insert({
    part: ['snippet'],
    requestBody: {
      snippet: {
        videoId,
        language,
        name: name || `${language} captions`
      }
    },
    media: {
      body: createReadStream(filePath)
    }
  });
  
  return {
    id: response.data.id,
    videoId,
    language: response.data.snippet.language
  };
}

/**
 * List comments on a video
 */
async function listComments(email, videoId, maxResults = 20) {
  const youtube = await getYouTubeApi(email);
  
  const response = await youtube.commentThreads.list({
    part: ['snippet'],
    videoId,
    maxResults,
    order: 'time'
  });
  
  return (response.data.items || []).map(thread => ({
    id: thread.id,
    author: thread.snippet.topLevelComment.snippet.authorDisplayName,
    text: thread.snippet.topLevelComment.snippet.textDisplay,
    publishedAt: thread.snippet.topLevelComment.snippet.publishedAt,
    likeCount: thread.snippet.topLevelComment.snippet.likeCount,
    replyCount: thread.snippet.totalReplyCount
  }));
}

/**
 * Format file size
 */
function formatSize(bytes) {
  const units = ['B', 'KB', 'MB', 'GB'];
  let i = 0;
  let size = bytes;
  while (size >= 1024 && i < units.length - 1) {
    size /= 1024;
    i++;
  }
  return `${size.toFixed(1)} ${units[i]}`;
}

// CLI
function printHelp() {
  showHelp('YouTube Operations', {
    'Video Commands': [
      'videos                     List my videos',
      'video VIDEO_ID             Get video details',
      'upload FILE_PATH           Upload a video',
      'update VIDEO_ID            Update video metadata',
      'privacy VIDEO_ID STATUS    Set video privacy (public/unlisted/private)',
      'thumbnail VIDEO_ID IMG     Upload custom thumbnail',
      'delete-video VIDEO_ID      Delete a video'
    ],
    'Playlist Commands': [
      'playlists                  List my playlists',
      'create-playlist            Create a new playlist',
      'add-to-playlist PL_ID VID  Add video to playlist',
      'remove-from-playlist ITEM_ID  Remove item from playlist',
      'delete-playlist PL_ID      Delete a playlist'
    ],
    'Caption Commands': [
      'captions VIDEO_ID          List captions for video',
      'upload-captions VIDEO_ID FILE  Upload caption file'
    ],
    'Other Commands': [
      'channel                    Get my channel info',
      'comments VIDEO_ID          List comments on video',
      'help                       Show this help'
    ],
    'Options': [
      '--account EMAIL            Google account (required)',
      '--title TEXT               Video/playlist title',
      '--description TEXT         Video/playlist description',
      '--tags TEXT                Comma-separated tags',
      '--privacy STATUS           public, unlisted, or private',
      '--category ID              YouTube category ID',
      '--language CODE            Caption language (e.g., en)',
      '--limit N                  Max results',
      '--json                     Output as JSON'
    ],
    'Examples': [
      'node youtube.js channel --account user@example.com',
      'node youtube.js videos --account user@example.com',
      'node youtube.js upload ./video.mp4 --title "My Video" --privacy unlisted --account user@example.com',
      'node youtube.js update VIDEO_ID --title "New Title" --account user@example.com',
      'node youtube.js create-playlist --title "Favorites" --account user@example.com',
      'node youtube.js add-to-playlist PLAYLIST_ID VIDEO_ID --account user@example.com'
    ]
  });
}

async function main() {
  const { command, args, flags } = parseArgs();
  
  const email = flags.account;
  
  if (command !== 'help' && !email) {
    console.error('Error: --account is required');
    process.exit(1);
  }
  
  // Check API is enabled
  if (command !== 'help') {
    requireApi(email, 'youtube', 'youtube.js');
  }
  
  try {
    switch (command) {
      case 'channel': {
        const channel = await getMyChannel(email);
        output(channel);
        break;
      }
      
      case 'videos': {
        const videos = await listVideos(email, parseInt(flags.limit) || 20);
        if (flags.json) {
          output(videos);
        } else {
          console.log(`\nMy Videos (${videos.length}):\n`);
          for (const video of videos) {
            console.log(`📹 ${video.title}`);
            console.log(`   ID: ${video.videoId}`);
            console.log(`   Published: ${video.publishedAt}`);
            console.log('');
          }
        }
        break;
      }
      
      case 'video': {
        if (!args[0]) throw new Error('VIDEO_ID required');
        const video = await getVideoDetails(email, args[0]);
        output(video);
        break;
      }
      
      case 'upload': {
        if (!args[0]) throw new Error('File path required');
        const result = await uploadVideo(email, args[0], {
          title: flags.title,
          description: flags.description,
          tags: flags.tags,
          privacy: flags.privacy,
          category: flags.category
        });
        console.log(`\n✓ Video uploaded: ${result.title}`);
        console.log(`  ID: ${result.id}`);
        console.log(`  Privacy: ${result.privacy}`);
        console.log(`  URL: ${result.url}`);
        break;
      }
      
      case 'update': {
        if (!args[0]) throw new Error('VIDEO_ID required');
        const result = await updateVideo(email, args[0], {
          title: flags.title,
          description: flags.description,
          tags: flags.tags,
          category: flags.category,
          privacy: flags.privacy
        });
        console.log(`\n✓ Video updated: ${result.title}`);
        break;
      }
      
      case 'privacy': {
        if (!args[0]) throw new Error('VIDEO_ID required');
        if (!args[1]) throw new Error('Privacy status required (public/unlisted/private)');
        const result = await setPrivacy(email, args[0], args[1]);
        console.log(`\n✓ Video privacy set to: ${result.privacy}`);
        break;
      }
      
      case 'thumbnail': {
        if (!args[0]) throw new Error('VIDEO_ID required');
        if (!args[1]) throw new Error('Image path required');
        await uploadThumbnail(email, args[0], args[1]);
        console.log(`\n✓ Thumbnail uploaded for video ${args[0]}`);
        break;
      }
      
      case 'delete-video': {
        if (!args[0]) throw new Error('VIDEO_ID required');
        await deleteVideo(email, args[0]);
        console.log(`\n✓ Video deleted: ${args[0]}`);
        break;
      }
      
      case 'playlists': {
        const playlists = await listPlaylists(email, parseInt(flags.limit) || 25);
        if (flags.json) {
          output(playlists);
        } else {
          console.log(`\nMy Playlists (${playlists.length}):\n`);
          for (const pl of playlists) {
            console.log(`📋 ${pl.title} (${pl.itemCount} videos)`);
            console.log(`   ID: ${pl.id}`);
            console.log(`   URL: ${pl.url}`);
            console.log('');
          }
        }
        break;
      }
      
      case 'create-playlist': {
        if (!flags.title) throw new Error('--title required');
        const result = await createPlaylist(
          email,
          flags.title,
          flags.description || '',
          flags.privacy || 'private'
        );
        console.log(`\n✓ Playlist created: ${result.title}`);
        console.log(`  ID: ${result.id}`);
        console.log(`  URL: ${result.url}`);
        break;
      }
      
      case 'add-to-playlist': {
        if (!args[0]) throw new Error('PLAYLIST_ID required');
        if (!args[1]) throw new Error('VIDEO_ID required');
        const result = await addToPlaylist(email, args[0], args[1]);
        console.log(`\n✓ Video added to playlist`);
        console.log(`  Playlist Item ID: ${result.playlistItemId}`);
        break;
      }
      
      case 'remove-from-playlist': {
        if (!args[0]) throw new Error('PLAYLIST_ITEM_ID required');
        await removeFromPlaylist(email, args[0]);
        console.log(`\n✓ Item removed from playlist`);
        break;
      }
      
      case 'delete-playlist': {
        if (!args[0]) throw new Error('PLAYLIST_ID required');
        await deletePlaylist(email, args[0]);
        console.log(`\n✓ Playlist deleted`);
        break;
      }
      
      case 'captions': {
        if (!args[0]) throw new Error('VIDEO_ID required');
        const captions = await listCaptions(email, args[0]);
        output(captions);
        break;
      }
      
      case 'upload-captions': {
        if (!args[0]) throw new Error('VIDEO_ID required');
        if (!args[1]) throw new Error('Caption file path required');
        const result = await uploadCaptions(
          email,
          args[0],
          args[1],
          flags.language || 'en',
          flags.name || ''
        );
        console.log(`\n✓ Captions uploaded`);
        console.log(`  ID: ${result.id}`);
        console.log(`  Language: ${result.language}`);
        break;
      }
      
      case 'comments': {
        if (!args[0]) throw new Error('VIDEO_ID required');
        const comments = await listComments(email, args[0], parseInt(flags.limit) || 20);
        if (flags.json) {
          output(comments);
        } else {
          console.log(`\nComments (${comments.length}):\n`);
          for (const comment of comments) {
            console.log(`${comment.author} (${comment.likeCount} likes)`);
            console.log(`  ${comment.text}`);
            console.log(`  ${comment.replyCount} replies`);
            console.log('');
          }
        }
        break;
      }
      
      case 'help':
      default:
        printHelp();
    }
  } catch (error) {
    outputError(error);
  }
}

main();
