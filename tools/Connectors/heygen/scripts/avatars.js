#!/usr/bin/env node

/**
 * HeyGen Avatars Script
 * List and manage available avatars.
 */

import { 
  parseArgs, 
  initScript, 
  apiRequest, 
  showHelp, 
  output, 
  handleError,
  truncate
} from './utils.js';

function displayHelp() {
  showHelp('HeyGen Avatars', {
    'Description': 'List and view available AI avatars',
    'Commands': [
      'list                        List all available avatars',
      'list-public                 List public/stock avatars',
      'list-private                List your custom/trained avatars',
      'get <avatar_id>             Get details for a specific avatar',
      'help                        Show this help'
    ],
    'List Options': [
      '--limit <n>                 Number of results (default: 100)'
    ],
    'Examples': [
      'node scripts/avatars.js list',
      'node scripts/avatars.js list-public --limit 20',
      'node scripts/avatars.js list-private',
      'node scripts/avatars.js get avatar_abc123'
    ]
  });
}

/**
 * List all avatars (public and private)
 */
async function listAvatars(args) {
  // Get both public and private avatars
  const [publicData, privateData] = await Promise.all([
    apiRequest('GET', '/v2/avatars').catch(() => ({ data: { avatars: [] } })),
    apiRequest('GET', '/v2/avatars', { params: { is_public: 'false' } }).catch(() => ({ data: { avatars: [] } }))
  ]);
  
  const publicAvatars = publicData.data?.avatars || [];
  const privateAvatars = privateData.data?.avatars || [];
  
  if (privateAvatars.length > 0) {
    console.log('Your Custom Avatars:\n');
    displayAvatarList(privateAvatars, args.limit);
    console.log('');
  }
  
  if (publicAvatars.length > 0) {
    console.log('Public Avatars:\n');
    displayAvatarList(publicAvatars, args.limit);
  }
  
  if (publicAvatars.length === 0 && privateAvatars.length === 0) {
    console.log('No avatars found.');
  }
}

/**
 * List public/stock avatars
 */
async function listPublicAvatars(args) {
  const limit = args.limit ? parseInt(args.limit) : 100;
  
  const data = await apiRequest('GET', '/v2/avatars');
  
  const avatars = data.data?.avatars || [];
  
  if (avatars.length === 0) {
    console.log('No public avatars found.');
    return;
  }
  
  console.log(`Public Avatars (${avatars.length}):\n`);
  displayAvatarList(avatars, limit);
}

/**
 * List private/custom avatars
 */
async function listPrivateAvatars(args) {
  const limit = args.limit ? parseInt(args.limit) : 100;
  
  const data = await apiRequest('GET', '/v2/avatars', {
    params: { is_public: 'false' }
  });
  
  const avatars = data.data?.avatars || [];
  
  if (avatars.length === 0) {
    console.log('No custom avatars found.');
    console.log('Custom avatars require a Business plan or higher.');
    return;
  }
  
  console.log(`Your Custom Avatars (${avatars.length}):\n`);
  displayAvatarList(avatars, limit);
}

/**
 * Get specific avatar details
 */
async function getAvatar(avatarId) {
  // HeyGen doesn't have a direct get-by-id, so we search in the list
  const data = await apiRequest('GET', '/v2/avatars');
  
  const avatar = data.data?.avatars?.find(a => a.avatar_id === avatarId);
  
  if (!avatar) {
    // Try private avatars
    const privateData = await apiRequest('GET', '/v2/avatars', {
      params: { is_public: 'false' }
    });
    
    const privateAvatar = privateData.data?.avatars?.find(a => a.avatar_id === avatarId);
    
    if (!privateAvatar) {
      console.error(`Avatar not found: ${avatarId}`);
      process.exit(1);
    }
    
    displayAvatarDetails(privateAvatar);
    return;
  }
  
  displayAvatarDetails(avatar);
}

/**
 * Display list of avatars
 */
function displayAvatarList(avatars, limit = 100) {
  const displayAvatars = avatars.slice(0, limit);
  
  for (const avatar of displayAvatars) {
    console.log(`  ID: ${avatar.avatar_id}`);
    console.log(`  Name: ${avatar.avatar_name || '(unnamed)'}`);
    if (avatar.gender) {
      console.log(`  Gender: ${avatar.gender}`);
    }
    if (avatar.preview_image_url) {
      console.log(`  Preview: ${truncate(avatar.preview_image_url, 60)}`);
    }
    console.log('');
  }
  
  if (avatars.length > limit) {
    console.log(`  ... and ${avatars.length - limit} more. Use --limit to see more.`);
  }
}

/**
 * Display detailed avatar information
 */
function displayAvatarDetails(avatar) {
  console.log('Avatar Details:\n');
  console.log(`  ID: ${avatar.avatar_id}`);
  console.log(`  Name: ${avatar.avatar_name || '(unnamed)'}`);
  
  if (avatar.gender) {
    console.log(`  Gender: ${avatar.gender}`);
  }
  
  if (avatar.preview_image_url) {
    console.log(`  Preview Image: ${avatar.preview_image_url}`);
  }
  
  if (avatar.preview_video_url) {
    console.log(`  Preview Video: ${avatar.preview_video_url}`);
  }
  
  // Show available poses if present
  if (avatar.poses && avatar.poses.length > 0) {
    console.log(`  Available Poses: ${avatar.poses.join(', ')}`);
  }
  
  // Show any additional properties
  const knownProps = ['avatar_id', 'avatar_name', 'gender', 'preview_image_url', 'preview_video_url', 'poses'];
  const otherProps = Object.keys(avatar).filter(k => !knownProps.includes(k));
  
  if (otherProps.length > 0) {
    console.log('\n  Additional Properties:');
    for (const prop of otherProps) {
      const value = avatar[prop];
      if (value !== null && value !== undefined) {
        console.log(`    ${prop}: ${JSON.stringify(value)}`);
      }
    }
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
        await listAvatars(args);
        break;
        
      case 'list-public':
        await listPublicAvatars(args);
        break;
        
      case 'list-private':
        await listPrivateAvatars(args);
        break;
        
      case 'get':
        if (!args._[1]) {
          console.error('Error: Avatar ID required. Usage: get <avatar_id>');
          process.exit(1);
        }
        await getAvatar(args._[1]);
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
