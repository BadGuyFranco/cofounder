#!/usr/bin/env node

/**
 * X.com Direct Messages
 * Send, receive, and manage direct messages.
 * Note: Requires elevated API access for full functionality.
 */

import { fileURLToPath } from 'url';
import path from 'path';
import {
  parseArgs, initScript, apiRequest, apiRequestPaginated,
  formatDate, handleError, showHelp, getAuthenticatedUserId
} from './utils.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const args = parseArgs(process.argv.slice(2));
initScript(path.join(__dirname, '..'), args);

// Help documentation
function printHelp() {
  showHelp('X.com Direct Messages', {
    'Commands': [
      'conversations             List DM conversations',
      'messages <conv_id>        Get messages in a conversation',
      'send <user_id> <text>     Send a DM to a user',
      'help                      Show this help'
    ],
    'Options': [
      '--limit <n>               Max results (default: 20, max: 100)',
      '--all                     Fetch all pages',
      '--verbose                 Show full API response'
    ],
    'Examples': [
      'node dm.js conversations',
      'node dm.js messages 1234567890123456789',
      'node dm.js send 1234567890123456789 "Hello!"'
    ],
    'Notes': [
      'Requires "Read and write and Direct message" app permissions',
      'DM endpoints may require elevated API access',
      'Some features are only available on paid tiers'
    ]
  });
}

const DM_FIELDS = 'id,text,created_at,sender_id,dm_conversation_id,attachments,referenced_tweets';
const USER_FIELDS = 'name,username';

// List DM conversations
async function listConversations(args) {
  const userId = await getAuthenticatedUserId();
  const limit = parseInt(args.limit) || 20;
  
  const params = {
    'dm_event.fields': DM_FIELDS,
    'user.fields': USER_FIELDS,
    'expansions': 'sender_id,participant_ids',
    max_results: Math.min(limit, 100)
  };
  
  console.log('Fetching DM conversations...\n');
  
  const data = await apiRequest('GET', `/dm_conversations`, { params });
  
  if (args.verbose) {
    console.log(JSON.stringify(data, null, 2));
    return;
  }
  
  const conversations = data.data || [];
  console.log(`Found ${conversations.length} conversations:\n`);
  
  for (const conv of conversations) {
    console.log(`Conversation ID: ${conv.id}`);
    console.log(`  Type: ${conv.type || 'unknown'}`);
    if (conv.name) console.log(`  Name: ${conv.name}`);
    console.log('');
  }
}

// Get messages in a conversation
async function getMessages(conversationId, args) {
  const limit = parseInt(args.limit) || 20;
  
  const params = {
    'dm_event.fields': DM_FIELDS,
    'user.fields': USER_FIELDS,
    'expansions': 'sender_id',
    max_results: Math.min(limit, 100)
  };
  
  console.log(`Fetching messages from conversation ${conversationId}...\n`);
  
  if (args.all) {
    const { data, meta } = await apiRequestPaginated(`/dm_conversations/${conversationId}/dm_events`, {
      all: true,
      maxResults: Math.min(limit, 100),
      params
    });
    
    if (args.verbose) {
      console.log(JSON.stringify({ data, meta }, null, 2));
      return;
    }
    
    console.log(`Found ${meta.total} messages:\n`);
    for (const msg of data) {
      displayMessage(msg, {});
    }
  } else {
    const data = await apiRequest('GET', `/dm_conversations/${conversationId}/dm_events`, { params });
    
    if (args.verbose) {
      console.log(JSON.stringify(data, null, 2));
      return;
    }
    
    const messages = data.data || [];
    console.log(`Found ${messages.length} messages:\n`);
    
    for (const msg of messages) {
      displayMessage(msg, data.includes || {});
    }
  }
}

// Display message
function displayMessage(msg, includes) {
  const sender = includes.users?.find(u => u.id === msg.sender_id);
  const senderName = sender ? `${sender.name} (@${sender.username})` : msg.sender_id;
  
  console.log(`${senderName} - ${formatDate(msg.created_at)}`);
  console.log(`  ${msg.text || '[No text]'}`);
  console.log(`  ID: ${msg.id}`);
  console.log('');
}

// Send a DM
async function sendMessage(userId, text, args) {
  console.log('Sending direct message...\n');
  
  const data = await apiRequest('POST', '/dm_conversations/with/:participant_id/messages'.replace(':participant_id', userId), {
    body: { text }
  });
  
  if (args.verbose) {
    console.log(JSON.stringify(data, null, 2));
    return;
  }
  
  if (data.data?.dm_event_id) {
    console.log('Message sent successfully!');
    console.log(`Event ID: ${data.data.dm_event_id}`);
    console.log(`Conversation ID: ${data.data.dm_conversation_id}`);
  } else {
    console.log('Message may have failed. Check the response.');
  }
}

// Main
async function main() {
  const command = args._[0];
  
  try {
    switch (command) {
      case 'conversations':
        await listConversations(args);
        break;
      case 'messages':
        if (!args._[1]) {
          console.error('Error: Conversation ID required');
          console.error('Usage: node dm.js messages <conversation_id>');
          process.exit(1);
        }
        await getMessages(args._[1], args);
        break;
      case 'send':
        if (!args._[1] || !args._[2]) {
          console.error('Error: User ID and message text required');
          console.error('Usage: node dm.js send <user_id> "Your message"');
          process.exit(1);
        }
        await sendMessage(args._[1], args._[2], args);
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
