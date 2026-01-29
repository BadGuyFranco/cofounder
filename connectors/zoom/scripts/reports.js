/**
 * Zoom Reports Script
 * Generate various reports and analytics
 */

import { parseArgs, initScript, apiRequest, output, outputError, buildQuery } from './utils.js';

function showHelp() {
  console.log(`
Zoom Reports Script - Generate reports and analytics

Usage: node scripts/reports.js <command> [options]

Commands:
  daily                   Get daily usage report
  users                   Get active/inactive hosts report
  meetings                Get meetings report
  meeting <meeting_id>    Get meeting details report
  webinars                Get webinars report
  webinar <webinar_id>    Get webinar details report
  telephone               Get telephone report
  cloud-recording         Get cloud recording usage report
  operation-logs          Get operation logs
  activities              Get sign-in/out activities
  upcoming                Get upcoming events report
  billing                 Get billing reports
  billing-invoices        Get billing invoices
  help                    Show this help

Options:
  --from <date>           Start date (YYYY-MM-DD) - required for most reports
  --to <date>             End date (YYYY-MM-DD) - required for most reports
  --year <YYYY>           Year for daily report
  --month <MM>            Month for daily report
  --type <type>           Filter type (varies by report)
  --page_size <n>         Results per page (max 300)
  --next_page_token <t>   Pagination token

  For users report:
  --type <type>           active or inactive

  For telephone report:
  --type <type>           1=Toll-free/Call-out, 2=Toll

  For operation-logs:
  --category_type <type>  Category filter (all, user, account, etc.)

  For billing:
  --billing_id <id>       Specific billing ID

Examples:
  node scripts/reports.js daily --year 2024 --month 01
  node scripts/reports.js users --from 2024-01-01 --to 2024-01-31 --type active
  node scripts/reports.js meetings --from 2024-01-01 --to 2024-01-31
  node scripts/reports.js meeting 123456789
  node scripts/reports.js webinars --from 2024-01-01 --to 2024-01-31
  node scripts/reports.js webinar 123456789
  node scripts/reports.js telephone --from 2024-01-01 --to 2024-01-31 --type 1
  node scripts/reports.js cloud-recording --from 2024-01-01 --to 2024-01-31
  node scripts/reports.js operation-logs --from 2024-01-01 --to 2024-01-31
  node scripts/reports.js activities --from 2024-01-01 --to 2024-01-31
  node scripts/reports.js billing
`);
}

async function getDailyReport(token, flags) {
  if (!flags.year || !flags.month) {
    throw new Error('Year and month required. Usage: daily --year 2024 --month 01');
  }

  const data = await apiRequest(`/report/daily?year=${flags.year}&month=${flags.month}`, {}, token);
  output(data);
}

async function getUsersReport(token, flags) {
  if (!flags.from || !flags.to) {
    throw new Error('Date range required. Usage: users --from YYYY-MM-DD --to YYYY-MM-DD');
  }

  const params = new URLSearchParams();
  params.append('from', flags.from);
  params.append('to', flags.to);
  if (flags.type) params.append('type', flags.type);
  if (flags.page_size) params.append('page_size', flags.page_size);
  if (flags.next_page_token) params.append('next_page_token', flags.next_page_token);

  const data = await apiRequest(`/report/users?${params.toString()}`, {}, token);
  output(data);
}

async function getMeetingsReport(token, flags) {
  if (!flags.from || !flags.to) {
    throw new Error('Date range required. Usage: meetings --from YYYY-MM-DD --to YYYY-MM-DD');
  }

  const params = new URLSearchParams();
  params.append('from', flags.from);
  params.append('to', flags.to);
  if (flags.page_size) params.append('page_size', flags.page_size);
  if (flags.next_page_token) params.append('next_page_token', flags.next_page_token);
  if (flags.type) params.append('type', flags.type);

  const data = await apiRequest(`/report/meetings?${params.toString()}`, {}, token);
  output(data);
}

async function getMeetingDetailsReport(token, meetingId) {
  const data = await apiRequest(`/report/meetings/${meetingId}`, {}, token);
  output(data);
}

async function getWebinarsReport(token, flags) {
  if (!flags.from || !flags.to) {
    throw new Error('Date range required. Usage: webinars --from YYYY-MM-DD --to YYYY-MM-DD');
  }

  const params = new URLSearchParams();
  params.append('from', flags.from);
  params.append('to', flags.to);
  if (flags.page_size) params.append('page_size', flags.page_size);
  if (flags.next_page_token) params.append('next_page_token', flags.next_page_token);

  const data = await apiRequest(`/report/webinars?${params.toString()}`, {}, token);
  output(data);
}

async function getWebinarDetailsReport(token, webinarId) {
  const data = await apiRequest(`/report/webinars/${webinarId}`, {}, token);
  output(data);
}

async function getTelephoneReport(token, flags) {
  if (!flags.from || !flags.to) {
    throw new Error('Date range required. Usage: telephone --from YYYY-MM-DD --to YYYY-MM-DD');
  }

  const params = new URLSearchParams();
  params.append('from', flags.from);
  params.append('to', flags.to);
  if (flags.type) params.append('type', flags.type);
  if (flags.page_size) params.append('page_size', flags.page_size);
  if (flags.next_page_token) params.append('next_page_token', flags.next_page_token);

  const data = await apiRequest(`/report/telephone?${params.toString()}`, {}, token);
  output(data);
}

async function getCloudRecordingReport(token, flags) {
  if (!flags.from || !flags.to) {
    throw new Error('Date range required. Usage: cloud-recording --from YYYY-MM-DD --to YYYY-MM-DD');
  }

  const params = new URLSearchParams();
  params.append('from', flags.from);
  params.append('to', flags.to);
  if (flags.page_size) params.append('page_size', flags.page_size);
  if (flags.next_page_token) params.append('next_page_token', flags.next_page_token);

  const data = await apiRequest(`/report/cloud_recording?${params.toString()}`, {}, token);
  output(data);
}

async function getOperationLogs(token, flags) {
  if (!flags.from || !flags.to) {
    throw new Error('Date range required. Usage: operation-logs --from YYYY-MM-DD --to YYYY-MM-DD');
  }

  const params = new URLSearchParams();
  params.append('from', flags.from);
  params.append('to', flags.to);
  if (flags.page_size) params.append('page_size', flags.page_size);
  if (flags.next_page_token) params.append('next_page_token', flags.next_page_token);
  if (flags.category_type) params.append('category_type', flags.category_type);

  const data = await apiRequest(`/report/operationlogs?${params.toString()}`, {}, token);
  output(data);
}

async function getActivities(token, flags) {
  if (!flags.from || !flags.to) {
    throw new Error('Date range required. Usage: activities --from YYYY-MM-DD --to YYYY-MM-DD');
  }

  const params = new URLSearchParams();
  params.append('from', flags.from);
  params.append('to', flags.to);
  if (flags.page_size) params.append('page_size', flags.page_size);
  if (flags.next_page_token) params.append('next_page_token', flags.next_page_token);

  const data = await apiRequest(`/report/activities?${params.toString()}`, {}, token);
  output(data);
}

async function getUpcomingEvents(token, flags) {
  const query = buildQuery(flags, ['page_size', 'next_page_token', 'type']);
  const data = await apiRequest(`/report/upcoming_events${query}`, {}, token);
  output(data);
}

async function getBillingReports(token, flags) {
  const data = await apiRequest(`/billing`, {}, token);
  output(data);
}

async function getBillingInvoices(token, flags) {
  const query = buildQuery(flags, ['billing_id']);
  const data = await apiRequest(`/billing/invoices${query}`, {}, token);
  output(data);
}

async function main() {
  const init = await initScript(showHelp);
  if (!init) return;

  const { token } = init;
  const { command, args, flags } = parseArgs();

  try {
    switch (command) {
      case 'daily':
        await getDailyReport(token, flags);
        break;
      case 'users':
        await getUsersReport(token, flags);
        break;
      case 'meetings':
        await getMeetingsReport(token, flags);
        break;
      case 'meeting':
        if (!args[0]) throw new Error('Meeting ID required. Usage: meeting <meeting_id>');
        await getMeetingDetailsReport(token, args[0]);
        break;
      case 'webinars':
        await getWebinarsReport(token, flags);
        break;
      case 'webinar':
        if (!args[0]) throw new Error('Webinar ID required. Usage: webinar <webinar_id>');
        await getWebinarDetailsReport(token, args[0]);
        break;
      case 'telephone':
        await getTelephoneReport(token, flags);
        break;
      case 'cloud-recording':
        await getCloudRecordingReport(token, flags);
        break;
      case 'operation-logs':
        await getOperationLogs(token, flags);
        break;
      case 'activities':
        await getActivities(token, flags);
        break;
      case 'upcoming':
        await getUpcomingEvents(token, flags);
        break;
      case 'billing':
        await getBillingReports(token, flags);
        break;
      case 'billing-invoices':
        await getBillingInvoices(token, flags);
        break;
      default:
        console.error(`Unknown command: ${command}`);
        showHelp();
        process.exit(1);
    }
  } catch (error) {
    outputError(error);
  }
}

main();
