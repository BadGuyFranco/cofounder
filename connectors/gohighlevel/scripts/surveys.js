#!/usr/bin/env node

/**
 * Go High Level Surveys (Read-Only)
 * 
 * Commands:
 *   list                    List all surveys
 *   get <id>               Get survey details
 *   submissions <id>       List submissions for a survey
 *   submission <id>        Get submission details
 *   all-submissions        List all submissions
 * 
 * NOTE: This connector is READ-ONLY.
 * Survey creation and editing should be done through the GHL UI.
 */

import path from 'path';
import { fileURLToPath } from 'url';
import {
  loadEnv,
  loadLocations,
  resolveLocation,
  parseArgs,
  apiRequest,
  apiRequestPaginated,
  listLocations,
  formatDate,
  handleError
} from './utils.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment
loadEnv(__dirname);
const locationsConfig = loadLocations();

// Parse arguments
const args = parseArgs(process.argv.slice(2));
const command = args._[0];
const verbose = args.verbose || false;

async function listSurveys(locationConfig) {
  try {
    const params = new URLSearchParams();
    params.append('locationId', locationConfig.id);
    
    if (args.limit) params.append('limit', args.limit);
    if (args.skip) params.append('skip', args.skip);
    
    const endpoint = `/surveys/?${params.toString()}`;
    
    if (args.all) {
      const { results, meta } = await apiRequestPaginated(endpoint, locationConfig.key, { 
        all: true, 
        limit: args.limit || 50 
      });
      console.log(`Found ${meta.total} surveys (${meta.pages} pages):\n`);
      displaySurveys(results);
    } else {
      const data = await apiRequest('GET', endpoint, locationConfig.key);
      const surveys = data.surveys || data.data || [];
      console.log(`Found ${surveys.length} surveys:\n`);
      displaySurveys(surveys);
    }
  } catch (error) {
    handleError(error, verbose);
  }
}

function displaySurveys(surveys) {
  if (surveys.length === 0) {
    console.log('No surveys found.');
    return;
  }
  
  for (const survey of surveys) {
    console.log(`- ${survey.name}`);
    console.log(`  ID: ${survey._id || survey.id}`);
    if (survey.submissionCount !== undefined) {
      console.log(`  Submissions: ${survey.submissionCount}`);
    }
    if (survey.status) console.log(`  Status: ${survey.status}`);
    console.log(`  Created: ${formatDate(survey.createdAt)}`);
    console.log('');
  }
}

async function getSurvey(surveyId, locationConfig) {
  try {
    const data = await apiRequest(
      'GET',
      `/surveys/${surveyId}?locationId=${locationConfig.id}`,
      locationConfig.key
    );
    
    console.log('Survey Details:\n');
    const survey = data.survey || data;
    console.log(`Name: ${survey.name}`);
    console.log(`ID: ${survey._id || survey.id}`);
    if (survey.status) console.log(`Status: ${survey.status}`);
    
    if (survey.fields && survey.fields.length > 0) {
      console.log('\nFields:');
      for (const field of survey.fields) {
        console.log(`  - ${field.label || field.name || field.fieldKey}`);
        console.log(`    Type: ${field.fieldType || field.type}`);
        if (field.required) console.log('    Required: Yes');
      }
    }
    
    if (survey.submissionCount !== undefined) {
      console.log(`\nTotal Submissions: ${survey.submissionCount}`);
    }
    
    console.log(`\nCreated: ${formatDate(survey.createdAt)}`);
    if (survey.updatedAt) console.log(`Updated: ${formatDate(survey.updatedAt)}`);
    
    if (verbose) {
      console.log('\nFull Response:');
      console.log(JSON.stringify(data, null, 2));
    }
  } catch (error) {
    handleError(error, verbose);
  }
}

async function listSubmissions(surveyId, locationConfig) {
  try {
    const params = new URLSearchParams();
    params.append('locationId', locationConfig.id);
    
    if (args.limit) params.append('limit', args.limit);
    if (args.skip) params.append('skip', args.skip);
    if (args['start-date']) params.append('startAt', args['start-date']);
    if (args['end-date']) params.append('endAt', args['end-date']);
    
    const endpoint = `/surveys/${surveyId}/submissions?${params.toString()}`;
    
    if (args.all) {
      const { results, meta } = await apiRequestPaginated(endpoint, locationConfig.key, { 
        all: true, 
        limit: args.limit || 100 
      });
      console.log(`Found ${meta.total} submissions (${meta.pages} pages):\n`);
      displaySubmissions(results);
    } else {
      const data = await apiRequest('GET', endpoint, locationConfig.key);
      const submissions = data.submissions || data.data || [];
      console.log(`Found ${submissions.length} submissions:\n`);
      displaySubmissions(submissions);
      
      if (data.meta?.total > submissions.length) {
        console.log(`\nShowing ${submissions.length} of ${data.meta.total}. Use --all to fetch all.`);
      }
    }
  } catch (error) {
    handleError(error, verbose);
  }
}

function displaySubmissions(submissions) {
  if (submissions.length === 0) {
    console.log('No submissions found.');
    return;
  }
  
  for (const sub of submissions) {
    console.log(`- Submission ${sub._id || sub.id}`);
    if (sub.contactId || sub.contact) {
      const contact = sub.contact;
      console.log(`  Contact: ${contact?.name || contact?.email || sub.contactId || 'N/A'}`);
    }
    console.log(`  Submitted: ${formatDate(sub.createdAt || sub.submittedAt)}`);
    
    // Show a preview of responses
    if (sub.responses || sub.answers) {
      const responses = sub.responses || sub.answers;
      const keys = Object.keys(responses);
      if (keys.length > 0) {
        console.log(`  Responses: ${keys.length} field(s)`);
      }
    }
    console.log('');
  }
}

async function getSubmission(submissionId, locationConfig) {
  try {
    const data = await apiRequest(
      'GET',
      `/surveys/submissions/${submissionId}?locationId=${locationConfig.id}`,
      locationConfig.key
    );
    
    console.log('Submission Details:\n');
    const sub = data.submission || data;
    console.log(`Submission ID: ${sub._id || sub.id}`);
    if (sub.surveyId) console.log(`Survey ID: ${sub.surveyId}`);
    
    if (sub.contactId || sub.contact) {
      const contact = sub.contact;
      console.log('\nContact:');
      console.log(`  Name: ${contact?.name || 'N/A'}`);
      console.log(`  Email: ${contact?.email || 'N/A'}`);
      console.log(`  ID: ${sub.contactId || contact?._id || contact?.id}`);
    }
    
    // Show all responses
    if (sub.responses || sub.answers) {
      console.log('\nResponses:');
      const responses = sub.responses || sub.answers;
      for (const [key, value] of Object.entries(responses)) {
        const displayValue = Array.isArray(value) ? value.join(', ') : value;
        console.log(`  ${key}: ${displayValue}`);
      }
    }
    
    console.log(`\nSubmitted: ${formatDate(sub.createdAt || sub.submittedAt)}`);
    
    if (verbose) {
      console.log('\nFull Response:');
      console.log(JSON.stringify(data, null, 2));
    }
  } catch (error) {
    handleError(error, verbose);
  }
}

async function listAllSubmissions(locationConfig) {
  try {
    const params = new URLSearchParams();
    params.append('locationId', locationConfig.id);
    
    if (args.limit) params.append('limit', args.limit);
    if (args.skip) params.append('skip', args.skip);
    if (args['start-date']) params.append('startAt', args['start-date']);
    if (args['end-date']) params.append('endAt', args['end-date']);
    
    const endpoint = `/surveys/submissions?${params.toString()}`;
    
    if (args.all) {
      const { results, meta } = await apiRequestPaginated(endpoint, locationConfig.key, { 
        all: true, 
        limit: args.limit || 100 
      });
      console.log(`Found ${meta.total} submissions (${meta.pages} pages):\n`);
      displaySubmissions(results);
    } else {
      const data = await apiRequest('GET', endpoint, locationConfig.key);
      const submissions = data.submissions || data.data || [];
      console.log(`Found ${submissions.length} submissions:\n`);
      displaySubmissions(submissions);
      
      if (data.meta?.total > submissions.length) {
        console.log(`\nShowing ${submissions.length} of ${data.meta.total}. Use --all to fetch all.`);
      }
    }
  } catch (error) {
    handleError(error, verbose);
  }
}

function showHelp() {
  console.log(`
Go High Level Surveys (Read-Only)

Usage:
  node surveys.js <command> [options]

Commands:
  list                    List all surveys
  get <id>               Get survey details
  submissions <survey-id> List submissions for a survey
  submission <id>        Get submission details
  all-submissions        List all submissions across surveys
  locations              List configured locations

Options:
  --location "Name"       Specify GHL sub-account
  --start-date "YYYY-MM-DD"  Start date filter
  --end-date "YYYY-MM-DD"    End date filter
  --all                   Fetch all pages
  --limit <n>             Results per page
  --skip <n>              Skip first n results
  --verbose               Show full API response

Examples:
  node surveys.js list --location "My Account"
  node surveys.js get survey123 --location "My Account"
  node surveys.js submissions survey123 --location "My Account"
  node surveys.js submission sub123 --location "My Account"
  node surveys.js all-submissions --start-date "2024-01-01" --location "My Account"

NOTE: This connector is READ-ONLY.
Survey creation and editing should be done through the Go High Level UI.
`);
}

// Main execution
async function main() {
  if (!command || command === 'help' || command === '--help' || command === '-h') {
    showHelp();
    return;
  }
  
  if (command === 'locations') {
    listLocations(locationsConfig);
    return;
  }
  
  const locationConfig = resolveLocation(args.location, locationsConfig);
  
  switch (command) {
    case 'list':
      await listSurveys(locationConfig);
      break;
    case 'get':
      if (!args._[1]) {
        console.error('Error: Survey ID required');
        process.exit(1);
      }
      await getSurvey(args._[1], locationConfig);
      break;
    case 'submissions':
      if (!args._[1]) {
        console.error('Error: Survey ID required');
        process.exit(1);
      }
      await listSubmissions(args._[1], locationConfig);
      break;
    case 'submission':
      if (!args._[1]) {
        console.error('Error: Submission ID required');
        process.exit(1);
      }
      await getSubmission(args._[1], locationConfig);
      break;
    case 'all-submissions':
      await listAllSubmissions(locationConfig);
      break;
    default:
      console.error(`Unknown command: ${command}`);
      console.error('Run "node surveys.js help" for usage');
      process.exit(1);
  }
}

main();
