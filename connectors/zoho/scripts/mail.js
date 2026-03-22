#!/usr/bin/env node

/**
 * Zoho Mail Management
 * List accounts, browse folders, read messages, send email, search,
 * manage folders/labels, update message status, reply, attachments.
 */

import { fileURLToPath } from 'url';
import path from 'path';
import {
  initScript, parseArgs, getAccessToken, loadOrgConfig,
  getProductBaseUrl, handleError, showHelp, formatDate,
  confirmDestructiveAction
} from './utils.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// --- API helper ---

async function mailRequest(method, endpoint, token, region, body = null) {
  const base = getProductBaseUrl('mail', region);
  const url = `${base}${endpoint}`;

  const opts = { method, headers: { 'Authorization': `Zoho-oauthtoken ${token}` } };

  if (body) {
    opts.headers['Content-Type'] = 'application/json';
    opts.body = JSON.stringify(body);
  }

  const res = await fetch(url, opts);

  if (res.status === 204) return { success: true };

  const text = await res.text();
  if (!text) return { success: res.ok };

  let data;
  try { data = JSON.parse(text); } catch { data = { raw: text }; }

  if (!res.ok) {
    const msg = data.data?.errorCode || data.message || data.error || 'Mail API request failed';
    const error = new Error(msg);
    error.status = res.status;
    error.data = data;
    throw error;
  }

  return data;
}

// --- Help ---

function printHelp() {
  showHelp('Zoho Mail', {
    'Commands': [
      'accounts                      List mail accounts',
      'folders <accountId>           List folders for an account',
      'list <accountId>              List messages in a folder',
      'get <accountId> <messageId>   Read a specific message',
      'send <accountId>              Send an email',
      'search <accountId>            Search messages',
      'move <accountId> <messageId>  Move message to a folder',
      'trash <accountId> <messageId> Move message to trash',
      'labels <accountId>            List labels',
      'help                          Show this help'
    ],
    'Folder Management': [
      'create-folder <accountId>              Create a new folder',
      'rename-folder <accountId> <folderId>   Rename a folder',
      'delete-folder <accountId> <folderId>   Delete a folder (destructive)'
    ],
    'Label Management': [
      'create-label <accountId>               Create a label',
      'update-label <accountId> <labelId>     Update a label',
      'delete-label <accountId> <labelId>     Delete a label (destructive)'
    ],
    'Message Operations': [
      'update <accountId>                     Update message status',
      'reply <accountId> <messageId>          Reply to an email',
      'delete <accountId> <folderId> <msgId>  Permanently delete a message (destructive)'
    ],
    'Attachment Operations': [
      'attachments <acctId> <folderId> <msgId>  List message attachments'
    ],
    'Options': [
      '--org <name>                  Organization to use',
      '--folder <folderId>           Folder ID (for list, move destination)',
      '--limit <n>                   Number of results (default: 25)',
      '--start <n>                   Start offset for pagination',
      '--to <email>                  Recipient (for send, reply)',
      '--cc <email>                  CC recipient (for send)',
      '--bcc <email>                 BCC recipient (for send)',
      '--subject <text>              Email subject (for send, reply)',
      '--content <text>              Email body text (for send, reply)',
      '--from <email>                Sender address (for send/reply, defaults to account)',
      '--query <text>                Search query (for search)',
      '--name <text>                 Name (for create-folder, rename-folder, create/update-label)',
      '--parent <folderId>           Parent folder ID (for create-folder)',
      '--color <color>               Label color (for create-label, update-label)',
      '--message-id <id>             Message ID (for update)',
      '--mark-read                   Mark as read (for update)',
      '--mark-unread                 Mark as unread (for update)',
      '--flag                        Flag message (for update)',
      '--unflag                      Unflag message (for update)',
      '--archive                     Archive message (for update)',
      '--label <labelId>             Add label to message (for update)',
      '--remove-label <labelId>      Remove label from message (for update)',
      '--spam                        Mark as spam (for update)',
      '--not-spam                    Mark as not spam (for update)',
      '--force                       Skip destructive action confirmations',
      '--verbose                     Show full API response'
    ],
    'Examples': [
      'node mail.js accounts',
      'node mail.js folders 123456',
      'node mail.js list 123456 --folder 789 --limit 10',
      'node mail.js get 123456 msg_001',
      'node mail.js send 123456 --to user@example.com --subject "Hello" --content "Hi there"',
      'node mail.js search 123456 --query "invoice"',
      'node mail.js move 123456 msg_001 --folder 789',
      'node mail.js trash 123456 msg_001',
      'node mail.js labels 123456',
      'node mail.js create-folder 123456 --name "Projects" --parent 789',
      'node mail.js rename-folder 123456 fld_001 --name "Archive 2026"',
      'node mail.js delete-folder 123456 fld_001 --force',
      'node mail.js create-label 123456 --name "Urgent" --color "#ff0000"',
      'node mail.js update-label 123456 lbl_001 --color "#00ff00"',
      'node mail.js delete-label 123456 lbl_001',
      'node mail.js update 123456 --message-id msg_001 --mark-read',
      'node mail.js update 123456 --message-id msg_001 --flag',
      'node mail.js update 123456 --message-id msg_001 --label lbl_001',
      'node mail.js reply 123456 msg_001 --content "Thanks for the update"',
      'node mail.js delete 123456 fld_001 msg_001 --force',
      'node mail.js attachments 123456 fld_001 msg_001'
    ],
    'Scopes Required': [
      'ZohoMail.messages.ALL, ZohoMail.folders.ALL, ZohoMail.accounts.READ',
      'Re-run OAuth flow with --scopes to add these:',
      '  node auth.js flow --org <name> --scopes "ZohoCRM.modules.ALL,...,ZohoMail.messages.ALL,ZohoMail.folders.ALL,ZohoMail.accounts.READ"'
    ]
  });
}

// --- Commands ---

async function listAccounts(args) {
  const { config, token } = await initScript(args);

  console.log('Fetching mail accounts...\n');
  const data = await mailRequest('GET', '/api/accounts', token, config.region);

  if (args.verbose) { console.log(JSON.stringify(data, null, 2)); return; }

  const accounts = data.data || [];
  if (accounts.length === 0) { console.log('No mail accounts found.'); return; }

  console.log(`Found ${accounts.length} account(s):\n`);
  for (const acct of accounts) {
    console.log(`- ${acct.mailId || acct.accountName || 'N/A'}`);
    console.log(`  Account ID: ${acct.accountId}`);
    console.log(`  Display Name: ${acct.displayName || 'N/A'}`);
    console.log(`  Type: ${acct.accountType || 'N/A'}`);
    if (acct.incomingServer) console.log(`  Server: ${acct.incomingServer}`);
    console.log('');
  }
}

async function listFolders(accountId, args) {
  const { config, token } = await initScript(args);

  console.log(`Fetching folders for account ${accountId}...\n`);
  const data = await mailRequest('GET', `/api/accounts/${accountId}/folders`, token, config.region);

  if (args.verbose) { console.log(JSON.stringify(data, null, 2)); return; }

  const folders = data.data || [];
  if (folders.length === 0) { console.log('No folders found.'); return; }

  console.log(`Found ${folders.length} folder(s):\n`);
  for (const f of folders) {
    const unread = f.unreadCount ? ` (${f.unreadCount} unread)` : '';
    console.log(`- ${f.folderName}${unread}`);
    console.log(`  Folder ID: ${f.folderId}`);
    console.log(`  Path: ${f.path || '/'}`);
    if (f.totalCount !== undefined) console.log(`  Total: ${f.totalCount}`);
    console.log('');
  }
}

async function listMessages(accountId, args) {
  const { config, token } = await initScript(args);

  if (!args.folder) {
    console.error('Error: --folder <folderId> is required');
    console.error('Run: node mail.js folders <accountId> to see folder IDs');
    process.exit(1);
  }

  const limit = args.limit || 25;
  const start = args.start || 0;
  const endpoint = `/api/accounts/${accountId}/messages/view?folderId=${args.folder}&limit=${limit}&start=${start}`;

  console.log(`Fetching messages...\n`);
  const data = await mailRequest('GET', endpoint, token, config.region);

  if (args.verbose) { console.log(JSON.stringify(data, null, 2)); return; }

  const messages = data.data || [];
  if (messages.length === 0) { console.log('No messages in this folder.'); return; }

  console.log(`Showing ${messages.length} message(s):\n`);
  for (const msg of messages) {
    const date = msg.receivedTime ? new Date(parseInt(msg.receivedTime)).toLocaleString() : 'N/A';
    const read = msg.status2 === '0' ? ' [UNREAD]' : '';
    console.log(`- ${msg.subject || '(no subject)'}${read}`);
    console.log(`  Message ID: ${msg.messageId}`);
    console.log(`  From: ${msg.fromAddress || 'N/A'}`);
    console.log(`  Date: ${date}`);
    if (msg.hasAttachment === 'true' || msg.hasAttachment === true) console.log('  Attachments: Yes');
    console.log('');
  }
}

async function getMessage(accountId, messageId, args) {
  const { config, token } = await initScript(args);

  console.log(`Fetching message ${messageId}...\n`);
  const data = await mailRequest('GET', `/api/accounts/${accountId}/messages/${messageId}/content`, token, config.region);

  if (args.verbose) { console.log(JSON.stringify(data, null, 2)); return; }

  const msg = data.data || data;

  console.log(`Subject: ${msg.subject || '(no subject)'}`);
  console.log(`From: ${msg.fromAddress || 'N/A'}`);
  console.log(`To: ${msg.toAddress || 'N/A'}`);
  if (msg.ccAddress) console.log(`CC: ${msg.ccAddress}`);
  if (msg.receivedTime) console.log(`Date: ${new Date(parseInt(msg.receivedTime)).toLocaleString()}`);
  console.log('');

  if (msg.content) {
    // Strip HTML tags for console display
    const text = msg.content.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').replace(/\n{3,}/g, '\n\n').trim();
    console.log('--- Content ---\n');
    console.log(text);
  }
}

async function sendEmail(accountId, args) {
  const { config, token } = await initScript(args);

  if (!args.to) {
    console.error('Error: --to <email> is required');
    process.exit(1);
  }
  if (!args.subject) {
    console.error('Error: --subject <text> is required');
    process.exit(1);
  }

  const body = {
    toAddress: args.to,
    subject: args.subject,
    content: args.content || '',
    askReceipt: 'no'
  };

  if (args.from) body.fromAddress = args.from;
  if (args.cc) body.ccAddress = args.cc;
  if (args.bcc) body.bccAddress = args.bcc;

  console.log(`Sending email to ${args.to}...\n`);
  const data = await mailRequest('POST', `/api/accounts/${accountId}/messages`, token, config.region, body);

  if (args.verbose) { console.log(JSON.stringify(data, null, 2)); return; }

  console.log('Email sent successfully!');
  console.log(`To: ${args.to}`);
  console.log(`Subject: ${args.subject}`);
  if (data.data?.messageId) console.log(`Message ID: ${data.data.messageId}`);
}

async function searchMessages(accountId, args) {
  const { config, token } = await initScript(args);

  if (!args.query) {
    console.error('Error: --query <text> is required');
    process.exit(1);
  }

  const limit = args.limit || 25;
  const start = args.start || 0;
  const q = encodeURIComponent(args.query);
  const endpoint = `/api/accounts/${accountId}/messages/search?searchKey=${q}&limit=${limit}&start=${start}`;

  console.log(`Searching for "${args.query}"...\n`);
  const data = await mailRequest('GET', endpoint, token, config.region);

  if (args.verbose) { console.log(JSON.stringify(data, null, 2)); return; }

  const messages = data.data || [];
  if (messages.length === 0) { console.log('No messages found.'); return; }

  console.log(`Found ${messages.length} result(s):\n`);
  for (const msg of messages) {
    const date = msg.receivedTime ? new Date(parseInt(msg.receivedTime)).toLocaleString() : 'N/A';
    console.log(`- ${msg.subject || '(no subject)'}`);
    console.log(`  Message ID: ${msg.messageId}`);
    console.log(`  From: ${msg.fromAddress || 'N/A'}`);
    console.log(`  Date: ${date}`);
    if (msg.summary) console.log(`  Preview: ${msg.summary.substring(0, 100)}...`);
    console.log('');
  }
}

async function moveMessage(accountId, messageId, args) {
  const { config, token } = await initScript(args);

  if (!args.folder) {
    console.error('Error: --folder <folderId> is required (destination folder)');
    console.error('Run: node mail.js folders <accountId> to see folder IDs');
    process.exit(1);
  }

  console.log(`Moving message ${messageId} to folder ${args.folder}...\n`);
  const data = await mailRequest(
    'PUT',
    `/api/accounts/${accountId}/messages/move?destfolderId=${args.folder}`,
    token,
    config.region,
    { messageId: [messageId] }
  );

  if (args.verbose) { console.log(JSON.stringify(data, null, 2)); return; }

  console.log('Message moved successfully.');
}

async function trashMessage(accountId, messageId, args) {
  const { config, token } = await initScript(args);

  console.log(`Moving message ${messageId} to trash...\n`);
  const data = await mailRequest(
    'PUT',
    `/api/accounts/${accountId}/messages/trash`,
    token,
    config.region,
    { messageId: [messageId] }
  );

  if (args.verbose) { console.log(JSON.stringify(data, null, 2)); return; }

  console.log('Message moved to trash.');
}

async function listLabels(accountId, args) {
  const { config, token } = await initScript(args);

  console.log(`Fetching labels for account ${accountId}...\n`);
  const data = await mailRequest('GET', `/api/accounts/${accountId}/labels`, token, config.region);

  if (args.verbose) { console.log(JSON.stringify(data, null, 2)); return; }

  const labels = data.data || [];
  if (labels.length === 0) { console.log('No labels found.'); return; }

  console.log(`Found ${labels.length} label(s):\n`);
  for (const label of labels) {
    const color = label.color ? ` [${label.color}]` : '';
    console.log(`- ${label.labelName || label.name || 'N/A'}${color}`);
    console.log(`  Label ID: ${label.labelId || label.id}`);
    console.log('');
  }
}

// --- Folder Management ---

async function createFolder(accountId, args) {
  const { config, token } = await initScript(args);

  if (!args.name) {
    console.error('Error: --name <folderName> is required');
    process.exit(1);
  }

  const body = { folderName: args.name };
  if (args.parent) body.parentFolderId = args.parent;

  console.log(`Creating folder "${args.name}"...\n`);
  const data = await mailRequest('POST', `/api/accounts/${accountId}/folders`, token, config.region, body);

  if (args.verbose) { console.log(JSON.stringify(data, null, 2)); return; }

  console.log('Folder created successfully.');
  if (data.data?.folderId) console.log(`Folder ID: ${data.data.folderId}`);
}

async function renameFolder(accountId, folderId, args) {
  const { config, token } = await initScript(args);

  if (!args.name) {
    console.error('Error: --name <newName> is required');
    process.exit(1);
  }

  const body = { mode: 'rename', folderName: args.name };

  console.log(`Renaming folder ${folderId} to "${args.name}"...\n`);
  const data = await mailRequest('PUT', `/api/accounts/${accountId}/folders/${folderId}`, token, config.region, body);

  if (args.verbose) { console.log(JSON.stringify(data, null, 2)); return; }

  console.log('Folder renamed successfully.');
}

async function deleteFolder(accountId, folderId, args) {
  const { config, token } = await initScript(args);

  const confirmed = await confirmDestructiveAction(
    `Permanently delete folder ${folderId}?`,
    ['This action cannot be undone.', 'All messages in this folder may be lost.'],
    args.force
  );
  if (!confirmed) { console.log('Cancelled.'); return; }

  console.log(`Deleting folder ${folderId}...\n`);
  const data = await mailRequest('DELETE', `/api/accounts/${accountId}/folders/${folderId}`, token, config.region);

  if (args.verbose) { console.log(JSON.stringify(data, null, 2)); return; }

  console.log('Folder deleted successfully.');
}

// --- Label Management ---

async function createLabel(accountId, args) {
  const { config, token } = await initScript(args);

  if (!args.name) {
    console.error('Error: --name <labelName> is required');
    process.exit(1);
  }

  const body = { labelName: args.name };
  if (args.color) body.color = args.color;

  console.log(`Creating label "${args.name}"...\n`);
  const data = await mailRequest('POST', `/api/accounts/${accountId}/labels`, token, config.region, body);

  if (args.verbose) { console.log(JSON.stringify(data, null, 2)); return; }

  console.log('Label created successfully.');
  if (data.data?.labelId || data.data?.id) console.log(`Label ID: ${data.data.labelId || data.data.id}`);
}

async function updateLabel(accountId, labelId, args) {
  const { config, token } = await initScript(args);

  if (!args.name && !args.color) {
    console.error('Error: --name <labelName> and/or --color <color> is required');
    process.exit(1);
  }

  const body = {};
  if (args.name) body.labelName = args.name;
  if (args.color) body.color = args.color;

  console.log(`Updating label ${labelId}...\n`);
  const data = await mailRequest('PUT', `/api/accounts/${accountId}/labels/${labelId}`, token, config.region, body);

  if (args.verbose) { console.log(JSON.stringify(data, null, 2)); return; }

  console.log('Label updated successfully.');
}

async function deleteLabel(accountId, labelId, args) {
  const { config, token } = await initScript(args);

  const confirmed = await confirmDestructiveAction(
    `Permanently delete label ${labelId}?`,
    ['This action cannot be undone.', 'The label will be removed from all messages.'],
    args.force
  );
  if (!confirmed) { console.log('Cancelled.'); return; }

  console.log(`Deleting label ${labelId}...\n`);
  const data = await mailRequest('DELETE', `/api/accounts/${accountId}/labels/${labelId}`, token, config.region);

  if (args.verbose) { console.log(JSON.stringify(data, null, 2)); return; }

  console.log('Label deleted successfully.');
}

// --- Message Operations ---

async function updateMessage(accountId, args) {
  const { config, token } = await initScript(args);

  const messageId = args['message-id'];
  if (!messageId) {
    console.error('Error: --message-id <id> is required');
    process.exit(1);
  }

  // Determine mode from flags
  let mode, extraFields = {};
  if (args['mark-read'])        mode = 'markAsRead';
  else if (args['mark-unread']) mode = 'markAsUnRead';
  else if (args.flag)           mode = 'flagMails';
  else if (args.unflag)         mode = 'unFlagMails';
  else if (args.archive)        mode = 'archive';
  else if (args.label)          { mode = 'addLabel'; extraFields.labelId = args.label; }
  else if (args['remove-label'])  { mode = 'removeLabel'; extraFields.labelId = args['remove-label']; }
  else if (args.spam)           mode = 'markAsSpam';
  else if (args['not-spam'])    mode = 'markAsNotSpam';
  else {
    console.error('Error: A mode flag is required. Use one of:');
    console.error('  --mark-read, --mark-unread, --flag, --unflag, --archive,');
    console.error('  --label <id>, --remove-label <id>, --spam, --not-spam');
    process.exit(1);
  }

  const body = { mode, messageId: [messageId], ...extraFields };

  console.log(`Updating message ${messageId} (${mode})...\n`);
  const data = await mailRequest('PUT', `/api/accounts/${accountId}/updatemessage`, token, config.region, body);

  if (args.verbose) { console.log(JSON.stringify(data, null, 2)); return; }

  console.log(`Message updated successfully (${mode}).`);
}

async function replyToMessage(accountId, messageId, args) {
  const { config, token } = await initScript(args);

  if (!args.content) {
    console.error('Error: --content <text> is required');
    process.exit(1);
  }

  const body = { content: args.content };
  if (args.to) body.toAddress = args.to;
  if (args.subject) body.subject = args.subject;
  if (args.from) body.fromAddress = args.from;

  console.log(`Replying to message ${messageId}...\n`);
  const data = await mailRequest('POST', `/api/accounts/${accountId}/messages/${messageId}`, token, config.region, body);

  if (args.verbose) { console.log(JSON.stringify(data, null, 2)); return; }

  console.log('Reply sent successfully.');
  if (data.data?.messageId) console.log(`Message ID: ${data.data.messageId}`);
}

async function deleteMessage(accountId, folderId, messageId, args) {
  const { config, token } = await initScript(args);

  const confirmed = await confirmDestructiveAction(
    `Permanently delete message ${messageId}?`,
    ['This action cannot be undone.', 'The message will be permanently removed.'],
    args.force
  );
  if (!confirmed) { console.log('Cancelled.'); return; }

  console.log(`Deleting message ${messageId}...\n`);
  const data = await mailRequest('DELETE', `/api/accounts/${accountId}/folders/${folderId}/messages/${messageId}`, token, config.region);

  if (args.verbose) { console.log(JSON.stringify(data, null, 2)); return; }

  console.log('Message deleted permanently.');
}

// --- Attachment Operations ---

async function listAttachments(accountId, folderId, messageId, args) {
  const { config, token } = await initScript(args);

  console.log(`Fetching attachments for message ${messageId}...\n`);
  const data = await mailRequest('GET', `/api/accounts/${accountId}/folders/${folderId}/messages/${messageId}/attachmentinfo`, token, config.region);

  if (args.verbose) { console.log(JSON.stringify(data, null, 2)); return; }

  const attachments = data.data?.attachments || data.data || [];
  if (attachments.length === 0) { console.log('No attachments found.'); return; }

  console.log(`Found ${attachments.length} attachment(s):\n`);
  for (const att of attachments) {
    const size = att.size ? ` (${formatFileSize(att.size)})` : '';
    console.log(`- ${att.attachmentName || att.fileName || 'N/A'}${size}`);
    console.log(`  Attachment ID: ${att.attachmentId || att.id || 'N/A'}`);
    if (att.contentType || att.mimeType) console.log(`  Type: ${att.contentType || att.mimeType}`);
    console.log('');
  }
}

function formatFileSize(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// --- Main ---

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const command = args._[0];

  try {
    switch (command) {
      case 'accounts':
        await listAccounts(args);
        break;
      case 'folders':
        if (!args._[1]) {
          console.error('Error: Account ID required');
          console.error('Usage: node mail.js folders <accountId>');
          console.error('Run: node mail.js accounts to find your account ID');
          process.exit(1);
        }
        await listFolders(args._[1], args);
        break;
      case 'list':
        if (!args._[1]) {
          console.error('Error: Account ID required');
          console.error('Usage: node mail.js list <accountId> --folder <folderId>');
          process.exit(1);
        }
        await listMessages(args._[1], args);
        break;
      case 'get':
        if (!args._[1] || !args._[2]) {
          console.error('Error: Account ID and Message ID required');
          console.error('Usage: node mail.js get <accountId> <messageId>');
          process.exit(1);
        }
        await getMessage(args._[1], args._[2], args);
        break;
      case 'send':
        if (!args._[1]) {
          console.error('Error: Account ID required');
          console.error('Usage: node mail.js send <accountId> --to user@example.com --subject "Hi" --content "Hello"');
          process.exit(1);
        }
        await sendEmail(args._[1], args);
        break;
      case 'search':
        if (!args._[1]) {
          console.error('Error: Account ID required');
          console.error('Usage: node mail.js search <accountId> --query "text"');
          process.exit(1);
        }
        await searchMessages(args._[1], args);
        break;
      case 'move':
        if (!args._[1] || !args._[2]) {
          console.error('Error: Account ID and Message ID required');
          console.error('Usage: node mail.js move <accountId> <messageId> --folder <folderId>');
          process.exit(1);
        }
        await moveMessage(args._[1], args._[2], args);
        break;
      case 'trash':
        if (!args._[1] || !args._[2]) {
          console.error('Error: Account ID and Message ID required');
          console.error('Usage: node mail.js trash <accountId> <messageId>');
          process.exit(1);
        }
        await trashMessage(args._[1], args._[2], args);
        break;
      case 'labels':
        if (!args._[1]) {
          console.error('Error: Account ID required');
          console.error('Usage: node mail.js labels <accountId>');
          process.exit(1);
        }
        await listLabels(args._[1], args);
        break;
      case 'create-folder':
        if (!args._[1]) {
          console.error('Error: Account ID required');
          console.error('Usage: node mail.js create-folder <accountId> --name "Folder Name"');
          process.exit(1);
        }
        await createFolder(args._[1], args);
        break;
      case 'rename-folder':
        if (!args._[1] || !args._[2]) {
          console.error('Error: Account ID and Folder ID required');
          console.error('Usage: node mail.js rename-folder <accountId> <folderId> --name "New Name"');
          process.exit(1);
        }
        await renameFolder(args._[1], args._[2], args);
        break;
      case 'delete-folder':
        if (!args._[1] || !args._[2]) {
          console.error('Error: Account ID and Folder ID required');
          console.error('Usage: node mail.js delete-folder <accountId> <folderId>');
          process.exit(1);
        }
        await deleteFolder(args._[1], args._[2], args);
        break;
      case 'create-label':
        if (!args._[1]) {
          console.error('Error: Account ID required');
          console.error('Usage: node mail.js create-label <accountId> --name "Label Name"');
          process.exit(1);
        }
        await createLabel(args._[1], args);
        break;
      case 'update-label':
        if (!args._[1] || !args._[2]) {
          console.error('Error: Account ID and Label ID required');
          console.error('Usage: node mail.js update-label <accountId> <labelId> --name "New Name"');
          process.exit(1);
        }
        await updateLabel(args._[1], args._[2], args);
        break;
      case 'delete-label':
        if (!args._[1] || !args._[2]) {
          console.error('Error: Account ID and Label ID required');
          console.error('Usage: node mail.js delete-label <accountId> <labelId>');
          process.exit(1);
        }
        await deleteLabel(args._[1], args._[2], args);
        break;
      case 'update':
        if (!args._[1]) {
          console.error('Error: Account ID required');
          console.error('Usage: node mail.js update <accountId> --message-id <id> --mark-read');
          process.exit(1);
        }
        await updateMessage(args._[1], args);
        break;
      case 'reply':
        if (!args._[1] || !args._[2]) {
          console.error('Error: Account ID and Message ID required');
          console.error('Usage: node mail.js reply <accountId> <messageId> --content "Reply text"');
          process.exit(1);
        }
        await replyToMessage(args._[1], args._[2], args);
        break;
      case 'delete':
        if (!args._[1] || !args._[2] || !args._[3]) {
          console.error('Error: Account ID, Folder ID, and Message ID required');
          console.error('Usage: node mail.js delete <accountId> <folderId> <messageId>');
          process.exit(1);
        }
        await deleteMessage(args._[1], args._[2], args._[3], args);
        break;
      case 'attachments':
        if (!args._[1] || !args._[2] || !args._[3]) {
          console.error('Error: Account ID, Folder ID, and Message ID required');
          console.error('Usage: node mail.js attachments <accountId> <folderId> <messageId>');
          process.exit(1);
        }
        await listAttachments(args._[1], args._[2], args._[3], args);
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
