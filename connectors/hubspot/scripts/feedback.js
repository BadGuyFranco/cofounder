#!/usr/bin/env node

/**
 * HubSpot Feedback Management
 * View feedback submissions (NPS, CES, CSAT surveys).
 */

import { fileURLToPath } from 'url';
import path from 'path';
import {
  loadEnv, getToken, parseArgs, apiRequest, apiRequestPaginated,
  formatDate, handleError, showHelp
} from './utils.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
loadEnv(path.join(__dirname, '..'));

const OBJECT_TYPE = 'feedback_submissions';

// Help documentation
function printHelp() {
  showHelp('HubSpot Feedback', {
    'Commands': [
      'list                        List feedback submissions',
      'get <id>                    Get submission details',
      'help                        Show this help'
    ],
    'Options': [
      '--properties <list>         Comma-separated properties to return',
      '--limit <n>                 Results per page',
      '--all                       Fetch all pages',
      '--verbose                   Show full API response'
    ],
    'Examples': [
      'node feedback.js list',
      'node feedback.js get 12345',
      'node feedback.js list --all'
    ],
    'Note': [
      'Feedback submissions are read-only via API.',
      'Create surveys via HubSpot Service Hub.',
      'Requires Service Hub Professional or Enterprise.'
    ]
  });
}

// List feedback submissions
async function listFeedback(args) {
  const token = getToken();
  const limit = parseInt(args.limit) || 100;
  const all = args.all || false;
  
  console.log('Fetching feedback submissions...\n');
  
  const properties = 'hs_survey_type,hs_survey_name,hs_response,hs_sentiment,hs_submission_timestamp';
  const endpoint = `/crm/v3/objects/${OBJECT_TYPE}?properties=${properties}`;
  const { results, meta } = await apiRequestPaginated(endpoint, token, { all, limit });
  
  if (args.verbose) {
    console.log(JSON.stringify(results, null, 2));
    return;
  }
  
  console.log(`Found ${meta.total} submissions${all ? '' : ' (page 1)'}:\n`);
  
  for (const sub of results) {
    const props = sub.properties;
    console.log(`- ${props.hs_survey_name || 'Unknown Survey'}`);
    console.log(`  ID: ${sub.id}`);
    console.log(`  Type: ${props.hs_survey_type || 'N/A'}`);
    console.log(`  Response: ${props.hs_response || 'N/A'}`);
    console.log(`  Sentiment: ${props.hs_sentiment || 'N/A'}`);
    if (props.hs_submission_timestamp) {
      console.log(`  Submitted: ${formatDate(props.hs_submission_timestamp)}`);
    }
    console.log('');
  }
}

// Get single submission
async function getFeedback(id, args) {
  const token = getToken();
  
  const properties = 'hs_survey_type,hs_survey_name,hs_survey_id,hs_response,hs_sentiment,hs_submission_timestamp,hs_content,hs_contact_id';
  const endpoint = `/crm/v3/objects/${OBJECT_TYPE}/${id}?properties=${properties}`;
  const sub = await apiRequest('GET', endpoint, token);
  
  if (args.verbose) {
    console.log(JSON.stringify(sub, null, 2));
    return;
  }
  
  const props = sub.properties;
  
  console.log(`Feedback Submission\n`);
  console.log(`ID: ${sub.id}`);
  console.log(`Survey: ${props.hs_survey_name || 'N/A'}`);
  console.log(`Survey ID: ${props.hs_survey_id || 'N/A'}`);
  console.log(`Type: ${props.hs_survey_type || 'N/A'}`);
  console.log(`Response: ${props.hs_response || 'N/A'}`);
  console.log(`Sentiment: ${props.hs_sentiment || 'N/A'}`);
  console.log(`Contact ID: ${props.hs_contact_id || 'N/A'}`);
  
  if (props.hs_content) {
    console.log(`\nFeedback Text:\n${props.hs_content}`);
  }
  
  if (props.hs_submission_timestamp) {
    console.log(`\nSubmitted: ${formatDate(props.hs_submission_timestamp)}`);
  }
  console.log(`Created: ${formatDate(sub.createdAt)}`);
}

// Main
async function main() {
  const args = parseArgs(process.argv.slice(2));
  const command = args._[0];
  
  try {
    switch (command) {
      case 'list': await listFeedback(args); break;
      case 'get':
        if (!args._[1]) { console.error('Error: Submission ID required'); process.exit(1); }
        await getFeedback(args._[1], args); break;
      case 'help':
      default: printHelp();
    }
  } catch (error) {
    handleError(error, args.verbose);
  }
}

main();
