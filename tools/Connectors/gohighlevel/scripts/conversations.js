#!/usr/bin/env node

/**
 * Go High Level Conversations Script
 * Manage conversations and send SMS/email messages.
 * 
 * Usage:
 *   node conversations.js list --contact-id <id> --location "Name"
 *   node conversations.js get <conversation-id> --location "Name"
 *   node conversations.js messages <conversation-id> --location "Name"
 *   node conversations.js send-sms --contact-id <id> --message "text" --location "Name"
 *   node conversations.js send-email --contact-id <id> --subject "sub" --body "text" --location "Name"
 *   node conversations.js locations
 */

import path from 'path';
import { fileURLToPath } from 'url';
import {
  loadEnv,
  loadLocations,
  resolveLocation,
  parseArgs,
  confirmDestructiveAction,
  listLocations,
  formatDate,
  handleError
} from './utils.js';

const LOCAL_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const BASE_URL = 'https://services.leadconnectorhq.com';

// Load environment
loadEnv(LOCAL_DIR);

// API request wrapper
async function apiRequest(method, endpoint, apiKey, body = null) {
  const url = `${BASE_URL}${endpoint}`;
  const options = {
    method,
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'Version': '2021-07-28'
    }
  };
  
  if (body) {
    options.body = JSON.stringify(body);
  }
  
  const response = await fetch(url, options);
  const data = await response.json();
  
  if (!response.ok) {
    const error = new Error(data.message || data.error || 'API request failed');
    error.status = response.status;
    error.data = data;
    throw error;
  }
  
  return data;
}

// List conversations for a contact
async function listConversations(contactId, location, verbose) {
  const params = new URLSearchParams({
    locationId: location.id,
    contactId: contactId
  });
  
  const data = await apiRequest('GET', `/conversations/search?${params}`, location.key);
  
  const conversations = data.conversations || [];
  console.log(`Found ${conversations.length} conversations:\n`);
  
  for (const conv of conversations) {
    console.log(`- Conversation: ${conv.id}`);
    console.log(`  Type: ${conv.type || 'N/A'}`);
    console.log(`  Last Message: ${formatDate(conv.lastMessageDate)}`);
    console.log(`  Unread: ${conv.unreadCount || 0}`);
    console.log('');
  }
  
  if (verbose) {
    console.log('\nFull response:');
    console.log(JSON.stringify(data, null, 2));
  }
  
  return conversations;
}

// Get conversation details
async function getConversation(conversationId, location, verbose) {
  const data = await apiRequest('GET', `/conversations/${conversationId}`, location.key);
  
  const conv = data.conversation || data;
  console.log(`Conversation: ${conv.id}`);
  console.log(`Type: ${conv.type || 'N/A'}`);
  console.log(`Contact ID: ${conv.contactId || 'N/A'}`);
  console.log(`Last Message: ${formatDate(conv.lastMessageDate)}`);
  console.log(`Unread Count: ${conv.unreadCount || 0}`);
  
  if (verbose) {
    console.log('\nFull response:');
    console.log(JSON.stringify(data, null, 2));
  }
  
  return conv;
}

// Get messages in a conversation
async function getMessages(conversationId, location, verbose) {
  const data = await apiRequest('GET', `/conversations/${conversationId}/messages`, location.key);
  
  const messages = data.messages || [];
  console.log(`Found ${messages.length} messages:\n`);
  
  for (const msg of messages) {
    const direction = msg.direction === 'inbound' ? '←' : '→';
    console.log(`${direction} [${formatDate(msg.dateAdded)}]`);
    console.log(`  Type: ${msg.type || 'N/A'}`);
    console.log(`  ${msg.body || msg.text || '(no content)'}`);
    if (msg.status) console.log(`  Status: ${msg.status}`);
    console.log('');
  }
  
  if (verbose) {
    console.log('\nFull response:');
    console.log(JSON.stringify(data, null, 2));
  }
  
  return messages;
}

// Send SMS message
async function sendSMS(contactId, message, location, verbose, force = false) {
  // Confirm before sending (SMS costs money)
  const confirmed = await confirmDestructiveAction(
    'You are about to SEND an SMS message.',
    [
      `Contact ID: ${contactId}`,
      `Message: "${message.substring(0, 50)}${message.length > 50 ? '...' : ''}"`,
      '',
      'SMS messages may incur costs.',
      'This action cannot be undone.'
    ],
    force
  );
  
  if (!confirmed) {
    process.exit(0);
  }
  
  const body = {
    type: 'SMS',
    contactId: contactId,
    message: message
  };
  
  const data = await apiRequest('POST', '/conversations/messages', location.key, body);
  
  console.log('SMS sent successfully!');
  console.log(`Message ID: ${data.messageId || data.id || 'N/A'}`);
  console.log(`Conversation ID: ${data.conversationId || 'N/A'}`);
  
  if (verbose) {
    console.log('\nFull response:');
    console.log(JSON.stringify(data, null, 2));
  }
  
  return data;
}

// Send Email message
async function sendEmail(contactId, subject, htmlBody, location, verbose, force = false) {
  // Confirm before sending
  const confirmed = await confirmDestructiveAction(
    'You are about to SEND an email.',
    [
      `Contact ID: ${contactId}`,
      `Subject: "${subject}"`,
      '',
      'This action cannot be undone.'
    ],
    force
  );
  
  if (!confirmed) {
    process.exit(0);
  }
  
  const body = {
    type: 'Email',
    contactId: contactId,
    subject: subject,
    html: htmlBody,
    emailFrom: 'noreply' // Uses default location email
  };
  
  const data = await apiRequest('POST', '/conversations/messages', location.key, body);
  
  console.log('Email sent successfully!');
  console.log(`Message ID: ${data.messageId || data.id || 'N/A'}`);
  console.log(`Conversation ID: ${data.conversationId || 'N/A'}`);
  
  if (verbose) {
    console.log('\nFull response:');
    console.log(JSON.stringify(data, null, 2));
  }
  
  return data;
}

// Create or get conversation for a contact
async function createConversation(contactId, location, verbose) {
  const body = {
    locationId: location.id,
    contactId: contactId
  };
  
  const data = await apiRequest('POST', '/conversations/', location.key, body);
  
  console.log('Conversation created/retrieved:');
  console.log(`Conversation ID: ${data.conversation?.id || data.id || 'N/A'}`);
  
  if (verbose) {
    console.log('\nFull response:');
    console.log(JSON.stringify(data, null, 2));
  }
  
  return data;
}

// Mark messages as read
async function markAsRead(conversationId, location, verbose) {
  const data = await apiRequest('PUT', `/conversations/${conversationId}/messages/status`, location.key, {
    status: 'read'
  });
  
  console.log(`Marked conversation ${conversationId} as read.`);
  
  if (verbose) {
    console.log('\nFull response:');
    console.log(JSON.stringify(data, null, 2));
  }
  
  return data;
}

// Main
async function main() {
  const args = parseArgs(process.argv.slice(2));
  const command = args._[0];
  const verbose = args.verbose || false;
  const locationsConfig = loadLocations();
  
  if (command === 'locations') {
    listLocations(locationsConfig);
    return;
  }
  
  try {
    switch (command) {
      case 'list': {
        const location = resolveLocation(args.location, locationsConfig);
        const contactId = args['contact-id'];
        
        if (!contactId) {
          console.error('Error: --contact-id is required');
          console.error('Usage: node conversations.js list --contact-id <id> --location "Name"');
          process.exit(1);
        }
        
        await listConversations(contactId, location, verbose);
        break;
      }
      
      case 'get': {
        const location = resolveLocation(args.location, locationsConfig);
        const conversationId = args._[1];
        
        if (!conversationId) {
          console.error('Error: Conversation ID is required');
          console.error('Usage: node conversations.js get <conversation-id> --location "Name"');
          process.exit(1);
        }
        
        await getConversation(conversationId, location, verbose);
        break;
      }
      
      case 'messages': {
        const location = resolveLocation(args.location, locationsConfig);
        const conversationId = args._[1];
        
        if (!conversationId) {
          console.error('Error: Conversation ID is required');
          console.error('Usage: node conversations.js messages <conversation-id> --location "Name"');
          process.exit(1);
        }
        
        await getMessages(conversationId, location, verbose);
        break;
      }
      
      case 'send-sms': {
        const location = resolveLocation(args.location, locationsConfig);
        const contactId = args['contact-id'];
        const message = args.message;
        
        if (!contactId || !message) {
          console.error('Error: --contact-id and --message are required');
          console.error('Usage: node conversations.js send-sms --contact-id <id> --message "text" --location "Name"');
          process.exit(1);
        }
        
        await sendSMS(contactId, message, location, verbose, args.force);
        break;
      }
      
      case 'send-email': {
        const location = resolveLocation(args.location, locationsConfig);
        const contactId = args['contact-id'];
        const subject = args.subject;
        const body = args.body || args.html;
        
        if (!contactId || !subject || !body) {
          console.error('Error: --contact-id, --subject, and --body are required');
          console.error('Usage: node conversations.js send-email --contact-id <id> --subject "sub" --body "text" --location "Name"');
          process.exit(1);
        }
        
        await sendEmail(contactId, subject, body, location, verbose, args.force);
        break;
      }
      
      case 'create': {
        const location = resolveLocation(args.location, locationsConfig);
        const contactId = args['contact-id'];
        
        if (!contactId) {
          console.error('Error: --contact-id is required');
          console.error('Usage: node conversations.js create --contact-id <id> --location "Name"');
          process.exit(1);
        }
        
        await createConversation(contactId, location, verbose);
        break;
      }
      
      case 'mark-read': {
        const location = resolveLocation(args.location, locationsConfig);
        const conversationId = args._[1];
        
        if (!conversationId) {
          console.error('Error: Conversation ID is required');
          console.error('Usage: node conversations.js mark-read <conversation-id> --location "Name"');
          process.exit(1);
        }
        
        await markAsRead(conversationId, location, verbose);
        break;
      }
      
      default:
        console.log('Go High Level Conversations Script');
        console.log('');
        console.log('Commands:');
        console.log('  list --contact-id <id> --location     List conversations for a contact');
        console.log('  get <conversation-id> --location      Get conversation details');
        console.log('  messages <conversation-id> --location Get messages in a conversation');
        console.log('  send-sms --contact-id <id> --message  Send SMS message');
        console.log('  send-email --contact-id <id> ...      Send email message');
        console.log('  create --contact-id <id> --location   Create/get conversation');
        console.log('  mark-read <conversation-id>           Mark messages as read');
        console.log('  locations                             List available locations');
        console.log('');
        console.log('Location Options:');
        console.log('  --location "Name"             Specify which GHL account to use');
        console.log('');
        console.log('Send SMS Options:');
        console.log('  --contact-id <id>             Contact ID (required)');
        console.log('  --message "text"              Message content (required)');
        console.log('');
        console.log('Send Email Options:');
        console.log('  --contact-id <id>             Contact ID (required)');
        console.log('  --subject "Subject"           Email subject (required)');
        console.log('  --body "HTML content"         Email body/HTML (required)');
        console.log('');
        console.log('Global Options:');
        console.log('  --verbose                     Show full API responses');
        console.log('  --force                       Skip confirmation for send operations');
        process.exit(0);
    }
  } catch (error) {
    console.error('Error:', error.message);
    if (error.status) {
      console.error('Status:', error.status);
    }
    if (verbose && error.data) {
      console.error('Details:', JSON.stringify(error.data, null, 2));
    }
    process.exit(1);
  }
}

main();
