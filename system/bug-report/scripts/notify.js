#!/usr/bin/env node

/**
 * Bug Fix Notification Check
 * 
 * Checks whether a resolved Case has notification requested.
 * The actual notification email is sent automatically by a Zoho CRM
 * Workflow Rule when the Case status changes to "Resolved".
 * This script is a convenience tool for the maintainer to verify status.
 * 
 * Requires the maintainer's Zoho connector to be authenticated (connectors/zoho/).
 * 
 * Usage:
 *   node notify.js check <case_id>     Check if a Case has notification requested
 *   node notify.js help                Show usage
 */

import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const COFOUNDER_ROOT = path.join(__dirname, '..', '..', '..');

// Simple arg parsing
function parseArgs(args = process.argv.slice(2)) {
  const result = { _: [] };
  let i = 0;
  while (i < args.length) {
    const arg = args[i];
    if (arg.startsWith('--')) {
      const key = arg.slice(2);
      const next = args[i + 1];
      if (next && !next.startsWith('--')) {
        result[key] = next;
        i += 2;
      } else {
        result[key] = true;
        i += 1;
      }
    } else {
      result._.push(arg);
      i += 1;
    }
  }
  return result;
}

function printHelp() {
  console.log(`
Bug Fix Notification Check
==========================

Commands:
  check <case_id>     Check if a Case has notification requested
  help                Show this help

Options:
  --org <name>        Zoho org name (default: first-strategy)

Note: Notification emails are sent automatically by a Zoho CRM Workflow Rule
when the Case status changes to "Resolved" and Notify_On_Fix is "true".
This script only checks the notification status; it does not send emails.

Examples:
  node notify.js check 1234567890 --org first-strategy
`);
}

/**
 * Fetch a Case record using the Zoho connector.
 */
async function fetchCase(caseId, org) {
  const { execSync } = await import('child_process');
  const cmd = `node "${path.join(COFOUNDER_ROOT, 'connectors', 'zoho', 'scripts', 'records.js')}" get ${caseId} --module Cases --org ${org}`;

  try {
    const output = execSync(cmd, { encoding: 'utf8', cwd: COFOUNDER_ROOT });
    return JSON.parse(output);
  } catch (err) {
    const stdout = err.stdout || '';
    try {
      return JSON.parse(stdout);
    } catch {
      throw new Error(`Failed to fetch Case ${caseId}: ${err.message}`);
    }
  }
}

/**
 * Check a Case for notification fields.
 */
async function checkCase(caseId, org) {
  console.log(`Checking Case ${caseId} for notification preferences...`);

  const caseData = await fetchCase(caseId, org);
  const record = caseData.data ? caseData.data[0] : caseData;

  const apiKey = record.CoFounder_API_Key || '';
  const notify = record.Notify_On_Fix || 'false';
  const subject = record.Subject || 'Unknown';
  const status = record.Status || 'Unknown';

  console.log(`  Subject: ${subject}`);
  console.log(`  Status: ${status}`);
  console.log(`  Notify on fix: ${notify}`);
  console.log(`  CoFounder API Key: ${apiKey ? apiKey.slice(0, 10) + '...' : 'none'}`);

  if (notify === 'true' && apiKey) {
    console.log('\nThis user requested notification.');
    console.log('When you set the Case status to "Resolved", Zoho will email them automatically.');
    return true;
  } else if (notify === 'true' && !apiKey) {
    console.log('\nUser requested notification but no CoFounder API key was included. Cannot notify.');
    return false;
  } else {
    console.log('\nNo notification requested for this Case.');
    return false;
  }
}

// Main
async function main() {
  const args = parseArgs();
  const command = args._[0] || 'help';
  const caseId = args._[1] || args.case;
  const org = args.org || 'first-strategy';

  if (command === 'help' || args.help || args.h) {
    printHelp();
    return;
  }

  if (!caseId) {
    console.error('Error: Case ID is required.');
    console.error('Usage: node notify.js check <case_id>');
    process.exit(1);
  }

  if (command === 'check') {
    await checkCase(caseId, org);
    return;
  }

  console.error(`Unknown command: ${command}`);
  console.error('Run: node notify.js help');
  process.exit(1);
}

main().catch(error => {
  console.error(`Error: ${error.message}`);
  process.exit(1);
});
