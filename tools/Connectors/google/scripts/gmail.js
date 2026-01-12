#!/usr/bin/env node
/**
 * Gmail Operations
 * Send, read, and manage emails.
 * 
 * Usage:
 *   node gmail.js send --to recipient@example.com --subject "Hello" --body "Message" --account user@example.com
 *   node gmail.js list --account user@example.com
 *   node gmail.js read MESSAGE_ID --account user@example.com
 */

import { google } from 'googleapis';
import { readFileSync, existsSync } from 'fs';
import { basename } from 'path';
import { getAuthClient } from './auth.js';
import {
  parseArgs,
  output,
  outputError,
  showHelp,
  requireApi
} from './utils.js';

/**
 * Get Gmail API instance
 */
async function getGmailApi(email) {
  const auth = await getAuthClient(email);
  return google.gmail({ version: 'v1', auth });
}

/**
 * Encode string to base64url format
 */
function base64url(str) {
  return Buffer.from(str)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

/**
 * Build a MIME email message
 */
function buildEmail(to, subject, body, from = null, attachments = []) {
  const boundary = '----=_Part_' + Math.random().toString(36).substring(2);
  
  let message = '';
  message += `To: ${to}\n`;
  if (from) message += `From: ${from}\n`;
  message += `Subject: ${subject}\n`;
  message += `MIME-Version: 1.0\n`;
  
  if (attachments.length > 0) {
    message += `Content-Type: multipart/mixed; boundary="${boundary}"\n\n`;
    
    // Text body
    message += `--${boundary}\n`;
    message += `Content-Type: text/plain; charset="UTF-8"\n\n`;
    message += `${body}\n\n`;
    
    // Attachments
    for (const attachment of attachments) {
      const filename = basename(attachment);
      const content = readFileSync(attachment);
      const base64Content = content.toString('base64');
      
      message += `--${boundary}\n`;
      message += `Content-Type: application/octet-stream; name="${filename}"\n`;
      message += `Content-Disposition: attachment; filename="${filename}"\n`;
      message += `Content-Transfer-Encoding: base64\n\n`;
      message += `${base64Content}\n\n`;
    }
    
    message += `--${boundary}--`;
  } else {
    message += `Content-Type: text/plain; charset="UTF-8"\n\n`;
    message += body;
  }
  
  return base64url(message);
}

/**
 * Send an email
 */
async function sendEmail(email, to, subject, body, attachments = []) {
  const gmail = await getGmailApi(email);
  
  const raw = buildEmail(to, subject, body, email, attachments);
  
  const response = await gmail.users.messages.send({
    userId: 'me',
    requestBody: { raw }
  });
  
  return {
    id: response.data.id,
    threadId: response.data.threadId,
    sent: true
  };
}

/**
 * List emails
 */
async function listEmails(email, flags = {}) {
  const gmail = await getGmailApi(email);
  
  // Build query
  let q = '';
  if (flags.from) q += `from:${flags.from} `;
  if (flags.to) q += `to:${flags.to} `;
  if (flags.subject) q += `subject:${flags.subject} `;
  if (flags.after) q += `after:${flags.after} `;
  if (flags.before) q += `before:${flags.before} `;
  if (flags.unread) q += 'is:unread ';
  if (flags.label) q += `label:${flags.label} `;
  
  const response = await gmail.users.messages.list({
    userId: 'me',
    q: q.trim() || undefined,
    maxResults: parseInt(flags.limit) || 20,
    labelIds: flags.inbox ? ['INBOX'] : undefined
  });
  
  const messages = response.data.messages || [];
  
  // Fetch details for each message
  const detailed = [];
  for (const msg of messages.slice(0, parseInt(flags.limit) || 20)) {
    const detail = await gmail.users.messages.get({
      userId: 'me',
      id: msg.id,
      format: 'metadata',
      metadataHeaders: ['From', 'To', 'Subject', 'Date']
    });
    
    const headers = detail.data.payload.headers;
    detailed.push({
      id: msg.id,
      threadId: msg.threadId,
      from: headers.find(h => h.name === 'From')?.value,
      to: headers.find(h => h.name === 'To')?.value,
      subject: headers.find(h => h.name === 'Subject')?.value,
      date: headers.find(h => h.name === 'Date')?.value,
      snippet: detail.data.snippet,
      labels: detail.data.labelIds
    });
  }
  
  return detailed;
}

/**
 * Read a specific email
 */
async function readEmail(email, messageId) {
  const gmail = await getGmailApi(email);
  
  const response = await gmail.users.messages.get({
    userId: 'me',
    id: messageId,
    format: 'full'
  });
  
  const msg = response.data;
  const headers = msg.payload.headers;
  
  // Extract body
  let body = '';
  if (msg.payload.body && msg.payload.body.data) {
    body = Buffer.from(msg.payload.body.data, 'base64').toString('utf-8');
  } else if (msg.payload.parts) {
    for (const part of msg.payload.parts) {
      if (part.mimeType === 'text/plain' && part.body && part.body.data) {
        body = Buffer.from(part.body.data, 'base64').toString('utf-8');
        break;
      }
    }
  }
  
  // Extract attachments info
  const attachments = [];
  if (msg.payload.parts) {
    for (const part of msg.payload.parts) {
      if (part.filename && part.body && part.body.attachmentId) {
        attachments.push({
          filename: part.filename,
          mimeType: part.mimeType,
          size: part.body.size,
          attachmentId: part.body.attachmentId
        });
      }
    }
  }
  
  return {
    id: msg.id,
    threadId: msg.threadId,
    from: headers.find(h => h.name === 'From')?.value,
    to: headers.find(h => h.name === 'To')?.value,
    subject: headers.find(h => h.name === 'Subject')?.value,
    date: headers.find(h => h.name === 'Date')?.value,
    body,
    attachments,
    labels: msg.labelIds
  };
}

/**
 * Search emails
 */
async function searchEmails(email, query, limit = 20) {
  const gmail = await getGmailApi(email);
  
  const response = await gmail.users.messages.list({
    userId: 'me',
    q: query,
    maxResults: limit
  });
  
  const messages = response.data.messages || [];
  
  const detailed = [];
  for (const msg of messages) {
    const detail = await gmail.users.messages.get({
      userId: 'me',
      id: msg.id,
      format: 'metadata',
      metadataHeaders: ['From', 'Subject', 'Date']
    });
    
    const headers = detail.data.payload.headers;
    detailed.push({
      id: msg.id,
      from: headers.find(h => h.name === 'From')?.value,
      subject: headers.find(h => h.name === 'Subject')?.value,
      date: headers.find(h => h.name === 'Date')?.value,
      snippet: detail.data.snippet
    });
  }
  
  return detailed;
}

/**
 * List labels
 */
async function listLabels(email) {
  const gmail = await getGmailApi(email);
  
  const response = await gmail.users.labels.list({
    userId: 'me'
  });
  
  return response.data.labels || [];
}

/**
 * Apply label to message
 */
async function applyLabel(email, messageId, labelName) {
  const gmail = await getGmailApi(email);
  
  // Find label ID by name
  const labels = await listLabels(email);
  const label = labels.find(l => l.name.toLowerCase() === labelName.toLowerCase());
  
  if (!label) {
    throw new Error(`Label not found: ${labelName}`);
  }
  
  await gmail.users.messages.modify({
    userId: 'me',
    id: messageId,
    requestBody: {
      addLabelIds: [label.id]
    }
  });
  
  return { messageId, label: labelName, applied: true };
}

/**
 * Mark as read
 */
async function markAsRead(email, messageId) {
  const gmail = await getGmailApi(email);
  
  await gmail.users.messages.modify({
    userId: 'me',
    id: messageId,
    requestBody: {
      removeLabelIds: ['UNREAD']
    }
  });
  
  return { messageId, markedRead: true };
}

/**
 * Mark as unread
 */
async function markAsUnread(email, messageId) {
  const gmail = await getGmailApi(email);
  
  await gmail.users.messages.modify({
    userId: 'me',
    id: messageId,
    requestBody: {
      addLabelIds: ['UNREAD']
    }
  });
  
  return { messageId, markedUnread: true };
}

/**
 * Move to trash
 */
async function trashEmail(email, messageId) {
  const gmail = await getGmailApi(email);
  
  await gmail.users.messages.trash({
    userId: 'me',
    id: messageId
  });
  
  return { messageId, trashed: true };
}

/**
 * Create a draft
 */
async function createDraft(email, to, subject, body) {
  const gmail = await getGmailApi(email);
  
  const raw = buildEmail(to, subject, body, email);
  
  const response = await gmail.users.drafts.create({
    userId: 'me',
    requestBody: {
      message: { raw }
    }
  });
  
  return {
    id: response.data.id,
    messageId: response.data.message.id
  };
}

/**
 * Get thread
 */
async function getThread(email, threadId) {
  const gmail = await getGmailApi(email);
  
  const response = await gmail.users.threads.get({
    userId: 'me',
    id: threadId,
    format: 'metadata',
    metadataHeaders: ['From', 'Subject', 'Date']
  });
  
  return {
    id: response.data.id,
    messages: response.data.messages.map(msg => ({
      id: msg.id,
      from: msg.payload.headers.find(h => h.name === 'From')?.value,
      subject: msg.payload.headers.find(h => h.name === 'Subject')?.value,
      date: msg.payload.headers.find(h => h.name === 'Date')?.value,
      snippet: msg.snippet
    }))
  };
}

// CLI
function printHelp() {
  showHelp('Gmail Operations', {
    'Commands': [
      'send                       Send an email',
      'list                       List emails from inbox',
      'read MESSAGE_ID            Read a specific email',
      'search QUERY               Search emails',
      'labels                     List all labels',
      'label MESSAGE_ID LABEL     Apply label to message',
      'mark-read MESSAGE_ID       Mark email as read',
      'mark-unread MESSAGE_ID     Mark email as unread',
      'trash MESSAGE_ID           Move email to trash',
      'draft                      Create a draft email',
      'thread THREAD_ID           Get email thread',
      'help                       Show this help'
    ],
    'Options': [
      '--account EMAIL            Google account (required)',
      '--to EMAIL                 Recipient email address',
      '--subject TEXT             Email subject',
      '--body TEXT                Email body',
      '--attach PATH              File to attach (can use multiple)',
      '--from EMAIL               Filter by sender',
      '--after DATE               Filter emails after date (YYYY-MM-DD)',
      '--before DATE              Filter emails before date',
      '--unread                   Show only unread emails',
      '--limit N                  Max results (default: 20)',
      '--json                     Output as JSON'
    ],
    'Examples': [
      'node gmail.js send --to user@example.com --subject "Hello" --body "Hi there!" --account me@gmail.com',
      'node gmail.js send --to user@example.com --subject "Report" --body "See attached" --attach ./report.pdf --account me@gmail.com',
      'node gmail.js list --account me@gmail.com',
      'node gmail.js list --from boss@company.com --unread --account me@gmail.com',
      'node gmail.js read MESSAGE_ID --account me@gmail.com',
      'node gmail.js search "quarterly report" --account me@gmail.com'
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
    requireApi(email, 'gmail', 'gmail.js');
  }
  
  try {
    switch (command) {
      case 'send': {
        if (!flags.to) throw new Error('--to required');
        if (!flags.subject) throw new Error('--subject required');
        if (!flags.body) throw new Error('--body required');
        
        // Handle multiple attachments
        const attachments = [];
        for (const arg of process.argv) {
          if (arg.startsWith('--attach=')) {
            attachments.push(arg.slice(9));
          }
        }
        if (flags.attach) attachments.push(flags.attach);
        
        // Verify attachments exist
        for (const att of attachments) {
          if (!existsSync(att)) {
            throw new Error(`Attachment not found: ${att}`);
          }
        }
        
        const result = await sendEmail(email, flags.to, flags.subject, flags.body, attachments);
        console.log(`\n✓ Email sent to ${flags.to}`);
        console.log(`  Message ID: ${result.id}`);
        break;
      }
      
      case 'list': {
        const emails = await listEmails(email, flags);
        if (flags.json) {
          output(emails);
        } else {
          console.log(`\nInbox (${emails.length} emails):\n`);
          for (const msg of emails) {
            const unread = msg.labels?.includes('UNREAD') ? '●' : ' ';
            console.log(`${unread} From: ${msg.from}`);
            console.log(`  Subject: ${msg.subject}`);
            console.log(`  Date: ${msg.date}`);
            console.log(`  ID: ${msg.id}`);
            console.log('');
          }
        }
        break;
      }
      
      case 'read': {
        if (!args[0]) throw new Error('MESSAGE_ID required');
        const msg = await readEmail(email, args[0]);
        if (flags.json) {
          output(msg);
        } else {
          console.log(`\nFrom: ${msg.from}`);
          console.log(`To: ${msg.to}`);
          console.log(`Subject: ${msg.subject}`);
          console.log(`Date: ${msg.date}`);
          if (msg.attachments.length > 0) {
            console.log(`Attachments: ${msg.attachments.map(a => a.filename).join(', ')}`);
          }
          console.log(`\n--- Body ---\n`);
          console.log(msg.body);
        }
        break;
      }
      
      case 'search': {
        if (!args[0]) throw new Error('Search query required');
        const results = await searchEmails(email, args[0], parseInt(flags.limit) || 20);
        if (flags.json) {
          output(results);
        } else {
          console.log(`\nSearch results for "${args[0]}" (${results.length}):\n`);
          for (const msg of results) {
            console.log(`From: ${msg.from}`);
            console.log(`Subject: ${msg.subject}`);
            console.log(`Date: ${msg.date}`);
            console.log(`ID: ${msg.id}`);
            console.log('');
          }
        }
        break;
      }
      
      case 'labels': {
        const labels = await listLabels(email);
        if (flags.json) {
          output(labels);
        } else {
          console.log('\nLabels:\n');
          for (const label of labels) {
            console.log(`  ${label.name} (${label.type})`);
          }
        }
        break;
      }
      
      case 'label': {
        if (!args[0]) throw new Error('MESSAGE_ID required');
        if (!args[1]) throw new Error('Label name required');
        await applyLabel(email, args[0], args[1]);
        console.log(`\n✓ Label "${args[1]}" applied to message`);
        break;
      }
      
      case 'mark-read': {
        if (!args[0]) throw new Error('MESSAGE_ID required');
        await markAsRead(email, args[0]);
        console.log(`\n✓ Message marked as read`);
        break;
      }
      
      case 'mark-unread': {
        if (!args[0]) throw new Error('MESSAGE_ID required');
        await markAsUnread(email, args[0]);
        console.log(`\n✓ Message marked as unread`);
        break;
      }
      
      case 'trash': {
        if (!args[0]) throw new Error('MESSAGE_ID required');
        await trashEmail(email, args[0]);
        console.log(`\n✓ Message moved to trash`);
        break;
      }
      
      case 'draft': {
        if (!flags.to) throw new Error('--to required');
        if (!flags.subject) throw new Error('--subject required');
        if (!flags.body) throw new Error('--body required');
        const draft = await createDraft(email, flags.to, flags.subject, flags.body);
        console.log(`\n✓ Draft created`);
        console.log(`  Draft ID: ${draft.id}`);
        break;
      }
      
      case 'thread': {
        if (!args[0]) throw new Error('THREAD_ID required');
        const thread = await getThread(email, args[0]);
        if (flags.json) {
          output(thread);
        } else {
          console.log(`\nThread ID: ${thread.id}`);
          console.log(`Messages: ${thread.messages.length}\n`);
          for (const msg of thread.messages) {
            console.log(`From: ${msg.from}`);
            console.log(`Subject: ${msg.subject}`);
            console.log(`Date: ${msg.date}`);
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
