#!/usr/bin/env node

/**
 * HubSpot Marketing Emails Management
 * View and manage marketing email campaigns (read-heavy).
 */

import { fileURLToPath } from 'url';
import path from 'path';
import {
  loadEnv, getToken, parseArgs, apiRequest,
  formatDate, handleError, showHelp
} from './utils.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
loadEnv(path.join(__dirname, '..'));

// Help documentation
function printHelp() {
  showHelp('HubSpot Marketing Emails', {
    'Commands': [
      'list                        List marketing emails',
      'get <id>                    Get email details',
      'stats <id>                  Get email statistics',
      'help                        Show this help'
    ],
    'Options': [
      '--status <status>           Filter by status: DRAFT, SCHEDULED, PUBLISHED',
      '--limit <n>                 Results per page',
      '--offset <n>                Results offset for pagination',
      '--verbose                   Show full API response'
    ],
    'Examples': [
      'node marketing-emails.js list',
      'node marketing-emails.js list --status PUBLISHED',
      'node marketing-emails.js get 12345',
      'node marketing-emails.js stats 12345'
    ],
    'Note': [
      'Marketing emails are primarily managed via HubSpot UI.',
      'API provides read access and statistics.',
      'Requires Marketing Hub subscription.'
    ]
  });
}

// List marketing emails
async function listEmails(args) {
  const token = getToken();
  const limit = parseInt(args.limit) || 100;
  const offset = parseInt(args.offset) || 0;
  
  console.log('Fetching marketing emails...\n');
  
  let endpoint = `/marketing-emails/v1/emails?limit=${limit}&offset=${offset}`;
  if (args.status) endpoint += `&state=${args.status.toUpperCase()}`;
  
  let data;
  try {
    data = await apiRequest('GET', endpoint, token);
  } catch (error) {
    if (error.message?.includes('not valid JSON') || error.status === 403) {
      console.log('Marketing Emails API not available.');
      console.log('This feature requires Marketing Hub Professional or Enterprise.');
      return;
    }
    throw error;
  }
  
  if (args.verbose) {
    console.log(JSON.stringify(data, null, 2));
    return;
  }
  
  const emails = data.objects || [];
  console.log(`Found ${data.total || emails.length} marketing emails (showing ${emails.length}):\n`);
  
  for (const email of emails) {
    console.log(`- ${email.name}`);
    console.log(`  ID: ${email.id}`);
    console.log(`  Subject: ${email.subject || 'N/A'}`);
    console.log(`  State: ${email.state}`);
    console.log(`  Type: ${email.emailType || 'N/A'}`);
    if (email.publishDate) console.log(`  Published: ${formatDate(new Date(email.publishDate))}`);
    console.log(`  Created: ${formatDate(new Date(email.created))}`);
    console.log('');
  }
}

// Get single email
async function getEmail(id, args) {
  const token = getToken();
  
  const email = await apiRequest('GET', `/marketing-emails/v1/emails/${id}`, token);
  
  if (args.verbose) {
    console.log(JSON.stringify(email, null, 2));
    return;
  }
  
  console.log(`Marketing Email: ${email.name}\n`);
  console.log(`ID: ${email.id}`);
  console.log(`Subject: ${email.subject || 'N/A'}`);
  console.log(`State: ${email.state}`);
  console.log(`Type: ${email.emailType || 'N/A'}`);
  console.log(`From Name: ${email.fromName || 'N/A'}`);
  console.log(`Reply To: ${email.replyTo || 'N/A'}`);
  console.log(`Campaign: ${email.campaign || 'N/A'}`);
  
  if (email.publishDate) console.log(`Published: ${formatDate(new Date(email.publishDate))}`);
  console.log(`Created: ${formatDate(new Date(email.created))}`);
  console.log(`Updated: ${formatDate(new Date(email.updated))}`);
  
  if (email.stats) {
    console.log('\nQuick Stats:');
    console.log(`  Sent: ${email.stats.sent || 0}`);
    console.log(`  Opens: ${email.stats.open || 0}`);
    console.log(`  Clicks: ${email.stats.click || 0}`);
  }
}

// Get email statistics
async function getStats(id, args) {
  const token = getToken();
  
  const email = await apiRequest('GET', `/marketing-emails/v1/emails/${id}`, token);
  const stats = email.stats || {};
  
  if (args.verbose) {
    console.log(JSON.stringify(email, null, 2));
    return;
  }
  
  console.log(`Statistics for: ${email.name}\n`);
  console.log(`Email ID: ${id}`);
  console.log(`Subject: ${email.subject || 'N/A'}`);
  console.log(`State: ${email.state}\n`);
  
  console.log('Delivery:');
  console.log(`  Sent: ${stats.sent || 0}`);
  console.log(`  Delivered: ${stats.delivered || 0}`);
  console.log(`  Bounced: ${stats.bounce || 0}`);
  console.log(`  Dropped: ${stats.dropped || 0}`);
  
  console.log('\nEngagement:');
  console.log(`  Opens: ${stats.open || 0}`);
  console.log(`  Clicks: ${stats.click || 0}`);
  console.log(`  Replies: ${stats.reply || 0}`);
  
  console.log('\nNegative:');
  console.log(`  Unsubscribes: ${stats.unsubscribed || 0}`);
  console.log(`  Spam Reports: ${stats.spamreport || 0}`);
  
  if (stats.sent > 0) {
    console.log('\nRates:');
    console.log(`  Open Rate: ${((stats.open || 0) / stats.sent * 100).toFixed(1)}%`);
    console.log(`  Click Rate: ${((stats.click || 0) / stats.sent * 100).toFixed(1)}%`);
    console.log(`  Bounce Rate: ${((stats.bounce || 0) / stats.sent * 100).toFixed(1)}%`);
  }
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
      case 'stats':
        if (!args._[1]) { console.error('Error: Email ID required'); process.exit(1); }
        await getStats(args._[1], args); break;
      case 'help':
      default: printHelp();
    }
  } catch (error) {
    handleError(error, args.verbose);
  }
}

main();
