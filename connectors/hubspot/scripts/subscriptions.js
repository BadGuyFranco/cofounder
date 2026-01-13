#!/usr/bin/env node

/**
 * HubSpot Subscriptions Management
 * Manage communication preferences and subscription status.
 */

import { fileURLToPath } from 'url';
import path from 'path';
import {
  loadEnv, getToken, parseArgs, apiRequest,
  handleError, showHelp
} from './utils.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
loadEnv(path.join(__dirname, '..'));

// Help documentation
function printHelp() {
  showHelp('HubSpot Subscriptions', {
    'Commands': [
      'types                       List subscription types',
      'status <email>              Get subscription status for email',
      'subscribe <email>           Subscribe email to type',
      'unsubscribe <email>         Unsubscribe email from type',
      'help                        Show this help'
    ],
    'Options': [
      '--type <id>                 Subscription type ID (required for subscribe/unsubscribe)',
      '--legal <basis>             Legal basis: LEGITIMATE_INTEREST_PQL,',
      '                            LEGITIMATE_INTEREST_CLIENT, PERFORMANCE_OF_CONTRACT,',
      '                            CONSENT_WITH_NOTICE, NON_GDPR, PROCESS_AND_STORE,',
      '                            LEGITIMATE_INTEREST_OTHER',
      '--verbose                   Show full API response'
    ],
    'Examples': [
      'node subscriptions.js types',
      'node subscriptions.js status "john@example.com"',
      'node subscriptions.js subscribe "john@example.com" --type 12345 --legal CONSENT_WITH_NOTICE',
      'node subscriptions.js unsubscribe "john@example.com" --type 12345'
    ],
    'Note': [
      'Subscription management is subject to GDPR and other privacy regulations.',
      'Always ensure you have proper legal basis before subscribing contacts.'
    ]
  });
}

// List subscription types
async function listTypes(args) {
  const token = getToken();
  
  console.log('Fetching subscription types...\n');
  
  const data = await apiRequest('GET', '/communication-preferences/v3/definitions', token);
  
  if (args.verbose) {
    console.log(JSON.stringify(data, null, 2));
    return;
  }
  
  const types = data.subscriptionDefinitions || [];
  console.log(`Found ${types.length} subscription types:\n`);
  
  for (const type of types) {
    console.log(`- ${type.name}`);
    console.log(`  ID: ${type.id}`);
    console.log(`  Description: ${type.description || 'N/A'}`);
    console.log(`  Purpose: ${type.purpose || 'N/A'}`);
    console.log(`  Active: ${type.isActive ? 'Yes' : 'No'}`);
    console.log('');
  }
}

// Get subscription status
async function getStatus(email, args) {
  const token = getToken();
  
  console.log(`Fetching subscription status for ${email}...\n`);
  
  const data = await apiRequest('GET', `/communication-preferences/v3/status/email/${encodeURIComponent(email)}`, token);
  
  if (args.verbose) {
    console.log(JSON.stringify(data, null, 2));
    return;
  }
  
  console.log(`Email: ${data.recipient}\n`);
  console.log('Subscription Statuses:');
  
  for (const sub of data.subscriptionStatuses || []) {
    const status = sub.status === 'SUBSCRIBED' ? '✓' : '✗';
    console.log(`  ${status} ${sub.name} (${sub.id})`);
    console.log(`    Status: ${sub.status}`);
    console.log(`    Source: ${sub.sourceOfStatus || 'N/A'}`);
    if (sub.legalBasis) console.log(`    Legal Basis: ${sub.legalBasis}`);
  }
}

// Subscribe email
async function subscribeEmail(email, args) {
  const token = getToken();
  
  if (!args.type) {
    console.error('Error: --type is required');
    console.error('Run "node subscriptions.js types" to see available types');
    process.exit(1);
  }
  
  const body = {
    emailAddress: email,
    subscriptionId: args.type,
    legalBasis: args.legal || 'CONSENT_WITH_NOTICE',
    legalBasisExplanation: 'Subscribed via API'
  };
  
  await apiRequest('POST', '/communication-preferences/v3/subscribe', token, body);
  
  console.log(`Successfully subscribed ${email} to subscription type ${args.type}`);
}

// Unsubscribe email
async function unsubscribeEmail(email, args) {
  const token = getToken();
  
  if (!args.type) {
    console.error('Error: --type is required');
    console.error('Run "node subscriptions.js types" to see available types');
    process.exit(1);
  }
  
  const body = {
    emailAddress: email,
    subscriptionId: args.type
  };
  
  await apiRequest('POST', '/communication-preferences/v3/unsubscribe', token, body);
  
  console.log(`Successfully unsubscribed ${email} from subscription type ${args.type}`);
}

// Main
async function main() {
  const args = parseArgs(process.argv.slice(2));
  const command = args._[0];
  
  try {
    switch (command) {
      case 'types': await listTypes(args); break;
      case 'status':
        if (!args._[1]) { console.error('Error: Email required'); process.exit(1); }
        await getStatus(args._[1], args); break;
      case 'subscribe':
        if (!args._[1]) { console.error('Error: Email required'); process.exit(1); }
        await subscribeEmail(args._[1], args); break;
      case 'unsubscribe':
        if (!args._[1]) { console.error('Error: Email required'); process.exit(1); }
        await unsubscribeEmail(args._[1], args); break;
      case 'help':
      default: printHelp();
    }
  } catch (error) {
    handleError(error, args.verbose);
  }
}

main();
