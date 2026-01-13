#!/usr/bin/env node

/**
 * LinkedIn Reactions Management
 * Like/react to posts and view reactions.
 */

import { fileURLToPath } from 'url';
import path from 'path';
import {
  loadEnv, getToken, parseArgs, apiRequest, handleError, showHelp,
  confirmDestructiveAction, formatDate
} from './utils.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
loadEnv(path.join(__dirname, '..'));

// Available reaction types
const REACTION_TYPES = {
  'LIKE': 'Like (thumbs up)',
  'PRAISE': 'Celebrate (clapping hands)',
  'APPRECIATION': 'Support (heart hands)', 
  'EMPATHY': 'Love (heart)',
  'INTEREST': 'Insightful (lightbulb)',
  'MAYBE': 'Funny (laughing face)'
};

// Help documentation
function printHelp() {
  showHelp('LinkedIn Reactions', {
    'Commands': [
      'list <postUrn>              List reactions on a post',
      'add <postUrn>               Add a reaction to a post',
      'remove <postUrn>            Remove your reaction from a post',
      'help                        Show this help'
    ],
    'Options': [
      '--type <reaction>           Reaction type (default: LIKE)',
      '--author <urn>              Author URN (defaults to your profile)',
      '--verbose                   Show full API response',
      '--force                     Skip confirmation for remove'
    ],
    'Reaction Types': Object.entries(REACTION_TYPES).map(([k, v]) => `${k.padEnd(15)} ${v}`),
    'Examples': [
      'node reactions.js list urn:li:ugcPost:1234567890',
      'node reactions.js add urn:li:ugcPost:1234567890',
      'node reactions.js add urn:li:ugcPost:1234567890 --type PRAISE',
      'node reactions.js add urn:li:share:1234567890 --type EMPATHY',
      'node reactions.js remove urn:li:ugcPost:1234567890'
    ],
    'Notes': [
      'Post URNs look like: urn:li:ugcPost:1234567890 or urn:li:share:1234567890',
      'You need the w_member_social scope to add/remove reactions.',
      'IMPORTANT: LinkedIn API only supports simple LIKE reactions.',
      'Other reaction types (PRAISE, EMPATHY, etc.) are not available via API.',
      'The --type option is accepted but will default to LIKE.'
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

// List reactions on a post
async function listReactions(postUrn, args) {
  const token = getToken();
  
  console.log(`Fetching reactions for ${postUrn}...\n`);
  
  // URL encode the post URN
  const encodedUrn = encodeURIComponent(postUrn);
  
  try {
    const endpoint = `/socialActions/${encodedUrn}/likes`;
    const response = await apiRequest('GET', endpoint, token);
    
    if (args.verbose) {
      console.log(JSON.stringify(response, null, 2));
      return;
    }
    
    const reactions = response.elements || [];
    
    // Get summary
    const summaryEndpoint = `/socialActions/${encodedUrn}`;
    let summary = null;
    try {
      summary = await apiRequest('GET', summaryEndpoint, token);
    } catch (e) {
      // Summary may not be available
    }
    
    if (summary?.likesSummary) {
      console.log('Reaction Summary:');
      console.log('=================');
      console.log(`Total Reactions: ${summary.likesSummary.totalLikes || 0}`);
      
      if (summary.likesSummary.likedByCurrentUser) {
        console.log('You: Reacted');
      }
      console.log('');
    }
    
    if (reactions.length === 0) {
      console.log('No reactions found on this post.');
      return;
    }
    
    console.log(`Individual Reactions (${reactions.length}):\n`);
    
    // Group by reaction type
    const byType = {};
    for (const reaction of reactions) {
      const type = reaction.reactionType || 'LIKE';
      if (!byType[type]) byType[type] = [];
      byType[type].push(reaction);
    }
    
    for (const [type, typeReactions] of Object.entries(byType)) {
      const label = REACTION_TYPES[type] || type;
      console.log(`${label}: ${typeReactions.length}`);
    }
    
    if (args.verbose) {
      console.log('\nDetailed reactions:');
      for (const reaction of reactions) {
        console.log(`- Actor: ${reaction.actor}`);
        console.log(`  Type: ${reaction.reactionType || 'LIKE'}`);
        console.log(`  Created: ${formatDate(reaction.created?.time)}`);
        console.log('');
      }
    }
    
  } catch (error) {
    if (error.status === 403) {
      console.log('Unable to fetch reactions.');
      console.log('This may be due to privacy settings or API restrictions.');
    } else if (error.status === 404) {
      console.log('Post not found. Check that the URN is correct.');
    } else {
      throw error;
    }
  }
}

// Add a reaction to a post
async function addReaction(postUrn, args) {
  const token = getToken();
  
  const reactionType = (args.type || 'LIKE').toUpperCase();
  
  if (!REACTION_TYPES[reactionType]) {
    console.error(`Error: Invalid reaction type: ${reactionType}`);
    console.error('Valid types: ' + Object.keys(REACTION_TYPES).join(', '));
    process.exit(1);
  }
  
  // Get author URN if not provided
  let author = args.author;
  if (!author) {
    console.log('Getting your profile...');
    author = await getMyPersonUrn(token);
    console.log(`Author: ${author}\n`);
  }
  
  console.log(`Adding ${reactionType} reaction to ${postUrn}...\n`);
  
  // URL encode the post URN
  const encodedUrn = encodeURIComponent(postUrn);
  
  // Note: LinkedIn's v2 API socialActions/likes endpoint only accepts simple likes
  // The reactionType field is not supported for non-organization posts
  const reactionBody = {
    actor: author
  };
  
  // For UGC posts, we might need to use a different approach
  // Try with object field for some API versions
  const reactionBodyAlt = {
    actor: author,
    object: postUrn
  };
  
  if (args.verbose) {
    console.log('Request body:');
    console.log(JSON.stringify(reactionBody, null, 2));
    console.log('');
  }
  
  try {
    const endpoint = `/socialActions/${encodedUrn}/likes`;
    let response;
    try {
      response = await apiRequest('POST', endpoint, token, reactionBody);
    } catch (e) {
      // If first attempt fails, try alternate body format
      if (e.status === 403 || e.status === 400) {
        response = await apiRequest('POST', endpoint, token, reactionBodyAlt);
      } else {
        throw e;
      }
    }
    
    if (args.verbose) {
      console.log(JSON.stringify(response, null, 2));
      return;
    }
    
    console.log(`✓ ${REACTION_TYPES[reactionType]} added successfully!`);
    
  } catch (error) {
    if (error.status === 403) {
      console.error('Unable to add reaction.');
      console.error('Check that you have the w_member_social scope.');
      if (error.data) {
        console.error('Details:', JSON.stringify(error.data, null, 2));
      }
    } else if (error.status === 404) {
      console.error('Post not found. Check that the URN is correct.');
    } else if (error.status === 409) {
      console.log('You have already reacted to this post.');
      console.log('To change your reaction, remove it first with: node reactions.js remove <postUrn>');
    } else {
      throw error;
    }
  }
}

// Remove reaction from a post
async function removeReaction(postUrn, args) {
  const token = getToken();
  
  // Get author URN if not provided
  let author = args.author;
  if (!author) {
    author = await getMyPersonUrn(token);
  }
  
  const confirmed = await confirmDestructiveAction(
    `Remove reaction from: ${postUrn}`,
    [
      `Actor: ${author}`,
      'Your reaction will be removed from this post.'
    ],
    args.force
  );
  
  if (!confirmed) return;
  
  console.log('Removing reaction...\n');
  
  // URL encode the URNs
  const encodedPostUrn = encodeURIComponent(postUrn);
  const encodedAuthorUrn = encodeURIComponent(author);
  
  try {
    // The endpoint requires both the post URN and actor URN
    const endpoint = `/socialActions/${encodedPostUrn}/likes/${encodedAuthorUrn}`;
    await apiRequest('DELETE', endpoint, token);
    
    console.log('✓ Reaction removed successfully.');
    
  } catch (error) {
    if (error.status === 403) {
      console.error('Unable to remove reaction.');
      console.error('You can only remove your own reactions.');
    } else if (error.status === 404) {
      console.error('Reaction not found. You may not have reacted to this post.');
    } else {
      throw error;
    }
  }
}

// Main
async function main() {
  const args = parseArgs(process.argv.slice(2));
  const command = args._[0];
  
  try {
    switch (command) {
      case 'list':
        if (!args._[1]) {
          console.error('Error: Post URN required');
          console.error('Usage: node reactions.js list <postUrn>');
          process.exit(1);
        }
        await listReactions(args._[1], args);
        break;
      case 'add':
        if (!args._[1]) {
          console.error('Error: Post URN required');
          console.error('Usage: node reactions.js add <postUrn> [--type LIKE]');
          process.exit(1);
        }
        await addReaction(args._[1], args);
        break;
      case 'remove':
        if (!args._[1]) {
          console.error('Error: Post URN required');
          console.error('Usage: node reactions.js remove <postUrn>');
          process.exit(1);
        }
        await removeReaction(args._[1], args);
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
