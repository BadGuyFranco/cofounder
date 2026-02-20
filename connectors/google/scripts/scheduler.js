#!/usr/bin/env node
/**
 * Google Cloud Scheduler Operations
 * Create and manage scheduled jobs that fire HTTP requests on a cron schedule.
 * Turns CoFounder from reactive to proactive - tasks run automatically without prompting.
 *
 * Usage:
 *   node scheduler.js jobs --account user@example.com
 *   node scheduler.js create --name "daily-seo-report" --schedule "0 9 * * *" --url https://... --account user@example.com
 *   node scheduler.js run --job JOB_NAME --account user@example.com
 *   node scheduler.js pause --job JOB_NAME --account user@example.com
 *   node scheduler.js resume --job JOB_NAME --account user@example.com
 *   node scheduler.js delete --job JOB_NAME --account user@example.com
 */

// Dependency check (must be first, before any npm imports)
import { ensureDeps } from '../../../system/shared/ensure-deps.js';
ensureDeps(import.meta.url);

// npm packages (dynamic import after dependency check)
const { google } = await import('googleapis');

// Local modules
import { getAuthClient } from './auth.js';
import {
  parseArgs,
  output,
  outputError,
  showHelp,
  requireApi,
  loadEnvFile
} from './utils.js';

/**
 * Get Cloud Scheduler API client
 */
async function getSchedulerClient(email) {
  const auth = await getAuthClient(email);
  return google.cloudscheduler({ version: 'v1', auth });
}

/**
 * Get GCP project ID from flags or env
 */
function getProjectId(flags) {
  if (flags.project) return flags.project;
  const env = loadEnvFile();
  if (env.GOOGLE_CLOUD_PROJECT) return env.GOOGLE_CLOUD_PROJECT;
  throw new Error(
    'Google Cloud project ID required.\n' +
    'Set GOOGLE_CLOUD_PROJECT in /memory/connectors/google/.env or use --project PROJECT_ID'
  );
}

/**
 * Build parent resource path
 */
function buildParent(projectId, location) {
  return `projects/${projectId}/locations/${location}`;
}

/**
 * List all scheduler jobs
 */
async function listJobs(email, projectId, location = 'us-central1') {
  const scheduler = await getSchedulerClient(email);
  const parent = buildParent(projectId, location);

  const response = await scheduler.projects.locations.jobs.list({ parent });
  return (response.data.jobs || []).map(formatJob);
}

/**
 * Get a specific job
 */
async function getJob(email, jobName) {
  const scheduler = await getSchedulerClient(email);
  const response = await scheduler.projects.locations.jobs.get({ name: jobName });
  return formatJob(response.data);
}

/**
 * Create a new HTTP job
 */
async function createJob(email, projectId, location, options) {
  const scheduler = await getSchedulerClient(email);
  const parent = buildParent(projectId, location);

  const jobName = options.name.replace(/[^a-zA-Z0-9-_]/g, '-');

  const job = {
    name: `${parent}/jobs/${jobName}`,
    description: options.description || '',
    schedule: options.schedule,
    timeZone: options.timezone || 'America/New_York',
    httpTarget: {
      uri: options.url,
      httpMethod: (options.method || 'POST').toUpperCase(),
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'CoFounder-Scheduler/1.0'
      }
    }
  };

  if (options.body) {
    job.httpTarget.body = Buffer.from(
      typeof options.body === 'string' ? options.body : JSON.stringify(options.body)
    ).toString('base64');
  }

  if (options.retries) {
    job.retryConfig = {
      retryCount: parseInt(options.retries),
      maxRetryDuration: options.retryDuration || '0s',
      minBackoffDuration: options.minBackoff || '5s',
      maxBackoffDuration: options.maxBackoff || '3600s'
    };
  }

  if (options.deadline) {
    job.attemptDeadline = options.deadline;
  }

  const response = await scheduler.projects.locations.jobs.create({
    parent,
    requestBody: job
  });

  return formatJob(response.data);
}

/**
 * Update an existing job
 */
async function updateJob(email, jobName, updates) {
  const scheduler = await getSchedulerClient(email);

  const current = await scheduler.projects.locations.jobs.get({ name: jobName });
  const job = current.data;

  const updateMask = [];

  if (updates.schedule) {
    job.schedule = updates.schedule;
    updateMask.push('schedule');
  }
  if (updates.timezone) {
    job.timeZone = updates.timezone;
    updateMask.push('timeZone');
  }
  if (updates.description !== undefined) {
    job.description = updates.description;
    updateMask.push('description');
  }
  if (updates.url) {
    job.httpTarget = job.httpTarget || {};
    job.httpTarget.uri = updates.url;
    updateMask.push('httpTarget.uri');
  }
  if (updates.body) {
    job.httpTarget = job.httpTarget || {};
    job.httpTarget.body = Buffer.from(updates.body).toString('base64');
    updateMask.push('httpTarget.body');
  }

  const response = await scheduler.projects.locations.jobs.patch({
    name: jobName,
    updateMask: updateMask.join(','),
    requestBody: job
  });

  return formatJob(response.data);
}

/**
 * Delete a job
 */
async function deleteJob(email, jobName) {
  const scheduler = await getSchedulerClient(email);
  await scheduler.projects.locations.jobs.delete({ name: jobName });
  return { deleted: true, name: jobName };
}

/**
 * Manually trigger a job immediately
 */
async function runJob(email, jobName) {
  const scheduler = await getSchedulerClient(email);
  const response = await scheduler.projects.locations.jobs.run({ name: jobName, requestBody: {} });
  return formatJob(response.data);
}

/**
 * Pause a job
 */
async function pauseJob(email, jobName) {
  const scheduler = await getSchedulerClient(email);
  const response = await scheduler.projects.locations.jobs.pause({ name: jobName, requestBody: {} });
  return formatJob(response.data);
}

/**
 * Resume a paused job
 */
async function resumeJob(email, jobName) {
  const scheduler = await getSchedulerClient(email);
  const response = await scheduler.projects.locations.jobs.resume({ name: jobName, requestBody: {} });
  return formatJob(response.data);
}

/**
 * List available locations for Cloud Scheduler
 */
async function listLocations(email, projectId) {
  const scheduler = await getSchedulerClient(email);
  const response = await scheduler.projects.locations.list({
    name: `projects/${projectId}`
  });
  return (response.data.locations || []).map(l => ({
    name: l.name,
    locationId: l.locationId,
    displayName: l.displayName
  }));
}

/**
 * Format a job object for output
 */
function formatJob(job) {
  if (!job) return null;
  return {
    name: job.name,
    shortName: job.name?.split('/').pop(),
    description: job.description,
    schedule: job.schedule,
    timeZone: job.timeZone,
    state: job.state,
    lastAttemptTime: job.lastAttemptTime,
    scheduleTime: job.scheduleTime,
    target: job.httpTarget ? {
      url: job.httpTarget.uri,
      method: job.httpTarget.httpMethod
    } : job.pubsubTarget ? {
      topic: job.pubsubTarget.topicName
    } : null,
    status: job.status ? {
      code: job.status.code,
      message: job.status.message
    } : null
  };
}

// Common cron schedule examples
const CRON_EXAMPLES = [
  { schedule: '0 9 * * *', description: 'Every day at 9am' },
  { schedule: '0 9 * * 1', description: 'Every Monday at 9am' },
  { schedule: '0 9 1 * *', description: 'First of every month at 9am' },
  { schedule: '0 */6 * * *', description: 'Every 6 hours' },
  { schedule: '*/30 * * * *', description: 'Every 30 minutes' },
  { schedule: '0 8 * * 1-5', description: 'Weekdays at 8am' },
  { schedule: '0 18 * * 5', description: 'Every Friday at 6pm' }
];

// CLI
function printHelp() {
  showHelp('Google Cloud Scheduler Operations', {
    'What It Does': [
      'Cloud Scheduler fires HTTP requests on a cron schedule, with no server required.',
      'Combine with Cloud Run or Cloud Functions to run CoFounder tasks automatically:',
      '  - Pull Search Console data every morning',
      '  - Generate weekly SEO reports on Monday',
      '  - Run PageSpeed audits and alert on drops',
      '  - Trigger content publishing workflows',
      '  - Schedule social posts at optimal times'
    ],
    'Setup Required': [
      'Set GOOGLE_CLOUD_PROJECT in /memory/connectors/google/.env',
      '  GOOGLE_CLOUD_PROJECT=your-project-id',
      '',
      'Enable Cloud Scheduler API in Google Cloud Console.',
      'App Engine must be initialized in the project (required by Scheduler):',
      '  https://console.cloud.google.com/appengine'
    ],
    'Commands': [
      'jobs                        List all scheduler jobs',
      'job JOB_NAME                Get details for a specific job',
      'create                      Create a new scheduled job',
      'update                      Update an existing job',
      'delete                      Delete a job',
      'run                         Manually trigger a job now',
      'pause                       Pause a job (stops execution)',
      'resume                      Resume a paused job',
      'locations                   List available regions',
      'cron-examples               Show common cron schedule patterns',
      'help                        Show this help'
    ],
    'Options': [
      '--account EMAIL             Google account (required)',
      '--project ID                Google Cloud project ID (or set GOOGLE_CLOUD_PROJECT in .env)',
      '--location REGION           Cloud region (default: us-central1)',
      '--job NAME                  Full job resource name or short name',
      '--name NAME                 Job name (for create, letters/numbers/hyphens only)',
      '--description TEXT          Job description',
      '--schedule CRON             Cron schedule, e.g. "0 9 * * 1" (Monday 9am)',
      '--timezone TZ               Timezone, e.g. America/New_York (default: America/New_York)',
      '--url URL                   Target URL for HTTP jobs',
      '--method METHOD             HTTP method: GET, POST, PUT, DELETE (default: POST)',
      '--body JSON                 Request body as JSON string',
      '--retries N                 Number of retry attempts on failure',
      '--json                      Output as JSON'
    ],
    'Examples': [
      'node scheduler.js jobs --account user@example.com',
      'node scheduler.js create --name "daily-report" --schedule "0 9 * * 1-5" --url https://myapp.com/webhook --account user@example.com',
      'node scheduler.js create --name "weekly-seo" --schedule "0 8 * * 1" --url https://myapp.com/seo --body \'{"site":"example.com"}\' --account user@example.com',
      'node scheduler.js run --job projects/proj/locations/us-central1/jobs/daily-report --account user@example.com',
      'node scheduler.js pause --job projects/proj/locations/us-central1/jobs/daily-report --account user@example.com',
      'node scheduler.js cron-examples'
    ]
  });
}

async function main() {
  const { command, args, flags } = parseArgs();

  const email = flags.account;

  if (command !== 'help' && command !== 'cron-examples' && !email) {
    console.error('Error: --account is required');
    process.exit(1);
  }

  if (command !== 'help' && command !== 'cron-examples' && email) {
    requireApi(email, 'scheduler', 'scheduler.js');
  }

  try {
    switch (command) {
      case 'jobs': {
        const projectId = getProjectId(flags);
        const jobs = await listJobs(email, projectId, flags.location || 'us-central1');
        if (flags.json) {
          output(jobs);
        } else {
          console.log(`\nScheduled Jobs (${jobs.length}):\n`);
          if (!jobs.length) {
            console.log('  No jobs found.');
            console.log('  Create one: node scheduler.js create --name "job-name" --schedule "0 9 * * *" --url URL --account ' + email);
          }
          for (const j of jobs) {
            const stateIcon = j.state === 'ENABLED' ? '>' : j.state === 'PAUSED' ? '||' : '?';
            console.log(`  [${stateIcon}] ${j.shortName}`);
            if (j.description) console.log(`       ${j.description}`);
            console.log(`       Schedule: ${j.schedule} (${j.timeZone})`);
            if (j.target?.url) console.log(`       URL: ${j.target.url}`);
            if (j.lastAttemptTime) console.log(`       Last run: ${j.lastAttemptTime}`);
            if (j.scheduleTime) console.log(`       Next run: ${j.scheduleTime}`);
            if (j.status?.message) console.log(`       Status: ${j.status.message}`);
            console.log(`       Full name: ${j.name}`);
            console.log('');
          }
        }
        break;
      }

      case 'job': {
        const jobName = args[0] || flags.job;
        if (!jobName) throw new Error('Job name required');
        const job = await getJob(email, jobName);
        output(job);
        break;
      }

      case 'create': {
        if (!flags.name) throw new Error('--name required');
        if (!flags.schedule) throw new Error('--schedule required (e.g. "0 9 * * 1-5")');
        if (!flags.url) throw new Error('--url required (the endpoint Cloud Scheduler will call)');
        const projectId = getProjectId(flags);
        const job = await createJob(email, projectId, flags.location || 'us-central1', {
          name: flags.name,
          description: flags.description,
          schedule: flags.schedule,
          timezone: flags.timezone,
          url: flags.url,
          method: flags.method,
          body: flags.body,
          retries: flags.retries
        });
        console.log(`\n✓ Job created: ${job.shortName}`);
        console.log(`  Schedule: ${job.schedule} (${job.timeZone})`);
        console.log(`  URL: ${job.target?.url}`);
        console.log(`  State: ${job.state}`);
        console.log(`  Full name: ${job.name}`);
        break;
      }

      case 'update': {
        const jobName = args[0] || flags.job;
        if (!jobName) throw new Error('Job name required');
        const job = await updateJob(email, jobName, {
          schedule: flags.schedule,
          timezone: flags.timezone,
          description: flags.description,
          url: flags.url,
          body: flags.body
        });
        console.log(`\n✓ Job updated: ${job.shortName}`);
        if (job.schedule) console.log(`  Schedule: ${job.schedule}`);
        break;
      }

      case 'delete': {
        const jobName = args[0] || flags.job;
        if (!jobName) throw new Error('Job name required');
        await deleteJob(email, jobName);
        console.log(`\n✓ Job deleted`);
        break;
      }

      case 'run': {
        const jobName = args[0] || flags.job;
        if (!jobName) throw new Error('Job name required');
        await runJob(email, jobName);
        console.log(`\n✓ Job triggered manually`);
        break;
      }

      case 'pause': {
        const jobName = args[0] || flags.job;
        if (!jobName) throw new Error('Job name required');
        const job = await pauseJob(email, jobName);
        console.log(`\n✓ Job paused: ${job.shortName}`);
        break;
      }

      case 'resume': {
        const jobName = args[0] || flags.job;
        if (!jobName) throw new Error('Job name required');
        const job = await resumeJob(email, jobName);
        console.log(`\n✓ Job resumed: ${job.shortName}`);
        break;
      }

      case 'locations': {
        const projectId = getProjectId(flags);
        const locations = await listLocations(email, projectId);
        if (flags.json) {
          output(locations);
        } else {
          console.log('\nAvailable Regions:\n');
          for (const l of locations) {
            console.log(`  ${l.locationId.padEnd(25)} ${l.displayName}`);
          }
        }
        break;
      }

      case 'cron-examples': {
        console.log('\nCommon Cron Schedules:\n');
        for (const ex of CRON_EXAMPLES) {
          console.log(`  ${ex.schedule.padEnd(20)} ${ex.description}`);
        }
        console.log('\nFormat: minute hour day-of-month month day-of-week');
        console.log('  *  = any value');
        console.log('  ,  = list separator (1,3,5)');
        console.log('  -  = range (1-5)');
        console.log('  /  = step (*/15 = every 15)');
        console.log('\nTimezones: https://cloud.google.com/scheduler/docs/configuring/cron-job-schedules');
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
