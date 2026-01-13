#!/usr/bin/env node

/**
 * HeyGen Videos Script
 * Create, list, and manage AI-generated videos.
 */

import { 
  parseArgs, 
  initScript, 
  apiRequest, 
  showHelp, 
  output, 
  handleError,
  formatDate,
  truncate,
  pollVideoStatus
} from './utils.js';

function displayHelp() {
  showHelp('HeyGen Videos', {
    'Description': 'Create and manage AI avatar videos',
    'Commands': [
      'list                        List your generated videos',
      'status <video_id>           Check video generation status',
      'create                      Create a new video (see options below)',
      'create-from-template        Create video from a template',
      'download <video_id>         Get download URL for completed video',
      'delete <video_id>           Delete a video',
      'quota                       Check remaining video credits',
      'help                        Show this help'
    ],
    'Create Options': [
      '--avatar <avatar_id>        Avatar to use (required)',
      '--voice <voice_id>          Voice for text-to-speech (required)',
      '--script <text>             Script text for the avatar to speak (required)',
      '--title <text>              Video title',
      '--ratio <16:9|9:16|1:1>     Aspect ratio (default: 16:9)',
      '--test                      Test mode (faster, watermarked)',
      '--wait                      Wait for video to complete'
    ],
    'Create From Template Options': [
      '--template <template_id>    Template to use (required)',
      '--variables <json>          JSON object of template variables (required)',
      '--title <text>              Video title',
      '--wait                      Wait for video to complete'
    ],
    'Examples': [
      'node scripts/videos.js list',
      'node scripts/videos.js status abc123',
      'node scripts/videos.js quota',
      'node scripts/videos.js create --avatar avatar_id --voice voice_id --script "Hello world"',
      'node scripts/videos.js create --avatar id --voice id --script "Hi" --wait',
      'node scripts/videos.js create-from-template --template tpl_123 --variables \'{"name":"John"}\'',
      'node scripts/videos.js download abc123'
    ]
  });
}

/**
 * List generated videos
 */
async function listVideos(args) {
  const limit = args.limit ? parseInt(args.limit) : 20;
  
  const data = await apiRequest('GET', '/v1/video.list', {
    params: { limit }
  });
  
  if (!data.data?.videos || data.data.videos.length === 0) {
    console.log('No videos found.');
    return;
  }
  
  console.log(`Videos (${data.data.videos.length}):\n`);
  
  for (const video of data.data.videos) {
    console.log(`  ID: ${video.video_id}`);
    console.log(`  Title: ${video.title || '(untitled)'}`);
    console.log(`  Status: ${video.status}`);
    console.log(`  Created: ${formatDate(video.created_at)}`);
    if (video.duration) {
      console.log(`  Duration: ${video.duration}s`);
    }
    console.log('');
  }
}

/**
 * Get video status
 */
async function getStatus(videoId) {
  const data = await apiRequest('GET', '/v1/video_status.get', {
    params: { video_id: videoId }
  });
  
  const video = data.data;
  
  console.log('Video Status:\n');
  console.log(`  ID: ${video.video_id}`);
  console.log(`  Status: ${video.status}`);
  
  if (video.status === 'completed') {
    console.log(`  Video URL: ${video.video_url}`);
    if (video.thumbnail_url) {
      console.log(`  Thumbnail: ${video.thumbnail_url}`);
    }
    if (video.duration) {
      console.log(`  Duration: ${video.duration}s`);
    }
  } else if (video.status === 'processing') {
    console.log('  Progress: Video is still being generated...');
  } else if (video.status === 'failed') {
    console.log(`  Error: ${video.error || 'Unknown error'}`);
  }
  
  return video;
}

/**
 * Create a new video
 */
async function createVideo(args) {
  // Validate required fields
  if (!args.avatar) {
    console.error('Error: --avatar is required. Use "node scripts/avatars.js list" to see available avatars.');
    process.exit(1);
  }
  if (!args.voice) {
    console.error('Error: --voice is required. Use "node scripts/voices.js list" to see available voices.');
    process.exit(1);
  }
  if (!args.script) {
    console.error('Error: --script is required. Provide the text for the avatar to speak.');
    process.exit(1);
  }
  
  const videoInput = {
    character: {
      type: 'avatar',
      avatar_id: args.avatar,
      avatar_style: args.style || 'normal'
    },
    voice: {
      type: 'text',
      input_text: args.script,
      voice_id: args.voice
    }
  };
  
  const body = {
    video_inputs: [videoInput],
    dimension: getDimension(args.ratio || '16:9'),
    test: args.test === true
  };
  
  if (args.title) {
    body.title = args.title;
  }
  
  console.log('Creating video...');
  const data = await apiRequest('POST', '/v2/video/generate', { body });
  
  const videoId = data.data?.video_id;
  
  if (!videoId) {
    console.error('Error: No video ID returned');
    output(data);
    process.exit(1);
  }
  
  console.log(`Video ID: ${videoId}`);
  console.log('Status: Video generation started');
  
  if (args.wait) {
    console.log('\nWaiting for video to complete...\n');
    const result = await pollVideoStatus(videoId);
    console.log('\nVideo completed!');
    console.log(`Video URL: ${result.video_url}`);
    if (result.thumbnail_url) {
      console.log(`Thumbnail: ${result.thumbnail_url}`);
    }
  } else {
    console.log(`\nCheck status with: node scripts/videos.js status ${videoId}`);
  }
}

/**
 * Create video from template
 */
async function createFromTemplate(args) {
  if (!args.template) {
    console.error('Error: --template is required. Use "node scripts/templates.js list" to see available templates.');
    process.exit(1);
  }
  if (!args.variables) {
    console.error('Error: --variables is required. Provide a JSON object of template variables.');
    process.exit(1);
  }
  
  let variables;
  try {
    variables = JSON.parse(args.variables);
  } catch (e) {
    console.error('Error: --variables must be valid JSON');
    console.error(`Received: ${args.variables}`);
    process.exit(1);
  }
  
  const body = {
    template_id: args.template,
    variables
  };
  
  if (args.title) {
    body.title = args.title;
  }
  
  console.log('Creating video from template...');
  const data = await apiRequest('POST', '/v2/template/generate', { body });
  
  const videoId = data.data?.video_id;
  
  if (!videoId) {
    console.error('Error: No video ID returned');
    output(data);
    process.exit(1);
  }
  
  console.log(`Video ID: ${videoId}`);
  console.log('Status: Video generation started');
  
  if (args.wait) {
    console.log('\nWaiting for video to complete...\n');
    const result = await pollVideoStatus(videoId);
    console.log('\nVideo completed!');
    console.log(`Video URL: ${result.video_url}`);
  } else {
    console.log(`\nCheck status with: node scripts/videos.js status ${videoId}`);
  }
}

/**
 * Get download URL for completed video
 */
async function downloadVideo(videoId) {
  const data = await apiRequest('GET', '/v1/video_status.get', {
    params: { video_id: videoId }
  });
  
  const video = data.data;
  
  if (video.status !== 'completed') {
    console.error(`Error: Video is not completed. Current status: ${video.status}`);
    process.exit(1);
  }
  
  console.log('Download URLs:\n');
  console.log(`  Video: ${video.video_url}`);
  if (video.thumbnail_url) {
    console.log(`  Thumbnail: ${video.thumbnail_url}`);
  }
}

/**
 * Delete a video
 */
async function deleteVideo(videoId) {
  await apiRequest('DELETE', `/v1/video.delete`, {
    params: { video_id: videoId }
  });
  
  console.log(`Video ${videoId} deleted.`);
}

/**
 * Check remaining quota/credits
 */
async function checkQuota() {
  const data = await apiRequest('GET', '/v2/user/remaining_quota');
  
  console.log('Account Quota:\n');
  
  if (data.data?.remaining_quota !== undefined) {
    console.log(`  Remaining Credits: ${data.data.remaining_quota}`);
  }
  
  output(data.data);
}

/**
 * Convert aspect ratio to dimension object
 */
function getDimension(ratio) {
  switch (ratio) {
    case '9:16':
      return { width: 720, height: 1280 };
    case '1:1':
      return { width: 1080, height: 1080 };
    case '16:9':
    default:
      return { width: 1280, height: 720 };
  }
}

/**
 * Main entry point
 */
async function main() {
  const args = parseArgs(process.argv.slice(2));
  const command = args._[0];
  
  // Show help if no command or help requested
  if (!command || command === 'help' || args.help) {
    displayHelp();
    return;
  }
  
  // Initialize (loads credentials, handles accounts)
  const ready = initScript(args);
  if (!ready) {
    displayHelp();
    return;
  }
  
  try {
    switch (command) {
      case 'list':
        await listVideos(args);
        break;
        
      case 'status':
        if (!args._[1]) {
          console.error('Error: Video ID required. Usage: status <video_id>');
          process.exit(1);
        }
        await getStatus(args._[1]);
        break;
        
      case 'create':
        await createVideo(args);
        break;
        
      case 'create-from-template':
        await createFromTemplate(args);
        break;
        
      case 'download':
        if (!args._[1]) {
          console.error('Error: Video ID required. Usage: download <video_id>');
          process.exit(1);
        }
        await downloadVideo(args._[1]);
        break;
        
      case 'delete':
        if (!args._[1]) {
          console.error('Error: Video ID required. Usage: delete <video_id>');
          process.exit(1);
        }
        await deleteVideo(args._[1]);
        break;
        
      case 'quota':
        await checkQuota();
        break;
        
      default:
        console.error(`Unknown command: ${command}`);
        displayHelp();
        process.exit(1);
    }
  } catch (error) {
    handleError(error, args.verbose);
  }
}

main();
