#!/usr/bin/env node

/**
 * HubSpot Emails Management
 * Log and manage email engagements.
 */

import { fileURLToPath } from 'url';
import path from 'path';
import {
  loadEnv, getToken, parseArgs, apiRequest, apiRequestPaginated,
  confirmDestructiveAction, formatDate, handleError, showHelp
} from './utils.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
loadEnv(path.join(__dirname, '..'));

const OBJECT_TYPE = 'emails';

// Help documentation
function printHelp() {
  showHelp('HubSpot Emails', {
    'Commands': [
      'list                        List all logged emails',
      'get <id>                    Get email by ID',
      'create                      Log a new email',
      'delete <id>                 Delete an email (destructive)',
      'help                        Show this help'
    ],
    'Options': [
      '--subject <text>            Email subject',
      '--body <html>               Email body (HTML)',
      '--text <text>               Email body (plain text)',
      '--direction <dir>           EMAIL (outbound) or INCOMING_EMAIL',
      '--from <email>              From email address',
      '--to <email>                To email address',
      '--cc <emails>               CC addresses (comma-separated)',
      '--bcc <emails>              BCC addresses (comma-separated)',
      '--timestamp <datetime>      Email timestamp (ISO 8601)',
      '--contact <id>              Associate with contact',
      '--company <id>              Associate with company',
      '--deal <id>                 Associate with deal',
      '--limit <n>                 Results per page',
      '--all                       Fetch all pages',
      '--verbose                   Show full API response',
      '--force                     Skip confirmation for delete'
    ],
    'Examples': [
      'node emails.js list',
      'node emails.js get 12345',
      'node emails.js create --subject "Follow up" --body "<p>Hi...</p>" --to "john@example.com" --contact 67890',
      'node emails.js delete 12345'
    ],
    'Note': [
      'This logs emails for tracking, it does NOT send emails.',
      'To send emails, use HubSpot Marketing or Sales tools.'
    ]
  });
}

// List all emails
async function listEmails(args) {
  const token = getToken();
  const limit = parseInt(args.limit) || 100;
  const all = args.all || false;
  
  console.log('Fetching emails...\n');
  
  const properties = 'hs_email_subject,hs_email_direction,hs_email_status,hs_timestamp,hs_email_from_email,hs_email_to_email';
  const endpoint = `/crm/v3/objects/${OBJECT_TYPE}?properties=${properties}`;
  const { results, meta } = await apiRequestPaginated(endpoint, token, { all, limit });
  
  if (args.verbose) {
    console.log(JSON.stringify(results, null, 2));
    return;
  }
  
  console.log(`Found ${meta.total} emails${all ? '' : ' (page 1)'}:\n`);
  
  for (const email of results) {
    const props = email.properties;
    console.log(`- ${props.hs_email_subject || 'No subject'}`);
    console.log(`  ID: ${email.id}`);
    console.log(`  Direction: ${props.hs_email_direction || 'N/A'}`);
    console.log(`  From: ${props.hs_email_from_email || 'N/A'}`);
    console.log(`  To: ${props.hs_email_to_email || 'N/A'}`);
    console.log(`  Time: ${formatDate(props.hs_timestamp || email.createdAt)}`);
    console.log('');
  }
}

// Get single email
async function getEmail(id, args) {
  const token = getToken();
  
  const properties = 'hs_email_subject,hs_email_html,hs_email_text,hs_email_direction,hs_email_status,hs_email_from_email,hs_email_to_email,hs_email_cc_email,hs_email_bcc_email,hs_timestamp';
  const endpoint = `/crm/v3/objects/${OBJECT_TYPE}/${id}?properties=${properties}`;
  const email = await apiRequest('GET', endpoint, token);
  
  if (args.verbose) {
    console.log(JSON.stringify(email, null, 2));
    return;
  }
  
  const props = email.properties;
  
  console.log(`Email: ${props.hs_email_subject || 'No subject'}\n`);
  console.log(`ID: ${email.id}`);
  console.log(`Direction: ${props.hs_email_direction || 'N/A'}`);
  console.log(`Status: ${props.hs_email_status || 'N/A'}`);
  console.log(`From: ${props.hs_email_from_email || 'N/A'}`);
  console.log(`To: ${props.hs_email_to_email || 'N/A'}`);
  if (props.hs_email_cc_email) console.log(`CC: ${props.hs_email_cc_email}`);
  if (props.hs_email_bcc_email) console.log(`BCC: ${props.hs_email_bcc_email}`);
  console.log(`Time: ${formatDate(props.hs_timestamp)}`);
  
  if (props.hs_email_text) {
    console.log(`\nBody:\n${props.hs_email_text}`);
  } else if (props.hs_email_html) {
    console.log(`\nBody (HTML):\n${props.hs_email_html.substring(0, 500)}...`);
  }
}

// Create email log
async function createEmail(args) {
  const token = getToken();
  
  const properties = {
    hs_timestamp: args.timestamp || new Date().toISOString(),
    hs_email_direction: args.direction || 'EMAIL'
  };
  
  if (args.subject) properties.hs_email_subject = args.subject;
  if (args.body) properties.hs_email_html = args.body;
  if (args.text) properties.hs_email_text = args.text;
  if (args.from) properties.hs_email_from_email = args.from;
  if (args.to) properties.hs_email_to_email = args.to;
  if (args.cc) properties.hs_email_cc_email = args.cc;
  if (args.bcc) properties.hs_email_bcc_email = args.bcc;
  
  const email = await apiRequest('POST', `/crm/v3/objects/${OBJECT_TYPE}`, token, { properties });
  
  console.log('Email logged successfully!');
  console.log(`ID: ${email.id}\n`);
  
  // Associate with objects
  const associations = [];
  if (args.contact) associations.push({ type: 'contacts', id: args.contact, typeId: 198 });
  if (args.company) associations.push({ type: 'companies', id: args.company, typeId: 186 });
  if (args.deal) associations.push({ type: 'deals', id: args.deal, typeId: 210 });
  
  for (const assoc of associations) {
    try {
      const assocBody = [{ associationCategory: 'HUBSPOT_DEFINED', associationTypeId: assoc.typeId }];
      await apiRequest('PUT', `/crm/v4/objects/emails/${email.id}/associations/${assoc.type}/${assoc.id}`, token, assocBody);
      console.log(`Associated with ${assoc.type}/${assoc.id}`);
    } catch (error) {
      console.error(`Warning: Failed to associate: ${error.message}`);
    }
  }
}

// Delete email
async function deleteEmail(id, args) {
  const token = getToken();
  
  const confirmed = await confirmDestructiveAction(
    `Delete email record`,
    [`ID: ${id}`, 'This email log will be permanently removed.'],
    args.force
  );
  
  if (!confirmed) return;
  
  await apiRequest('DELETE', `/crm/v3/objects/${OBJECT_TYPE}/${id}`, token);
  console.log('Email deleted successfully.');
}

// Main
async function main() {
  const args = parseArgs(process.argv.slice(2));
  const command = args._[0];
  
  try {
    switch (command) {
      case 'list': await listEmails(args); break;
      case 'get':
        if (!args._[1]) { console.error('Error: Email ID required'); process.exit(1); }
        await getEmail(args._[1], args); break;
      case 'create': await createEmail(args); break;
      case 'delete':
        if (!args._[1]) { console.error('Error: Email ID required'); process.exit(1); }
        await deleteEmail(args._[1], args); break;
      case 'help':
      default: printHelp();
    }
  } catch (error) {
    handleError(error, args.verbose);
  }
}

main();
