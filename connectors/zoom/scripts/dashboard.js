/**
 * Zoom Dashboard Script
 * Real-time analytics and monitoring
 */

import { parseArgs, initScript, apiRequest, output, outputError, buildQuery } from './utils.js';

function showHelp() {
  console.log(`
Zoom Dashboard Script - Real-time analytics and monitoring

Usage: node scripts/dashboard.js <command> [options]

Commands:
  meetings                List meetings (live or past)
  meeting <meeting_id>    Get meeting details and participants
  meeting-qos <mtg_id>    Get meeting quality of service data
  webinars                List webinars (live or past)  
  webinar <webinar_id>    Get webinar details and participants
  webinar-qos <web_id>    Get webinar quality of service data
  zoom-rooms              List Zoom Rooms
  zoom-room <room_id>     Get Zoom Room details
  crc                     Get CRC port usage
  im                      Get IM metrics
  client-feedback         Get client feedback
  issues                  Get Zoom issues
  quality                 Get overall meeting quality scores
  top-issues              Get top quality issues
  help                    Show this help

Options:
  --type <type>           Filter type: live (1) or past (2)
  --from <date>           Start date (YYYY-MM-DD)
  --to <date>             End date (YYYY-MM-DD)
  --page_size <n>         Results per page (max 300)
  --next_page_token <t>   Pagination token

  For meeting-qos/webinar-qos:
  --participant_id <id>   Filter by specific participant

  For quality:
  --type <type>           meeting or webinar

Examples:
  node scripts/dashboard.js meetings --type 1
  node scripts/dashboard.js meetings --type 2 --from 2024-01-01 --to 2024-01-31
  node scripts/dashboard.js meeting abc123xyz
  node scripts/dashboard.js meeting-qos abc123xyz
  node scripts/dashboard.js webinars --type 2 --from 2024-01-01 --to 2024-01-31
  node scripts/dashboard.js webinar abc123xyz
  node scripts/dashboard.js zoom-rooms
  node scripts/dashboard.js zoom-room roomId123
  node scripts/dashboard.js crc --from 2024-01-01 --to 2024-01-31
  node scripts/dashboard.js im --from 2024-01-01 --to 2024-01-31
  node scripts/dashboard.js quality --from 2024-01-01 --to 2024-01-31 --type meeting
  node scripts/dashboard.js issues
`);
}

async function listMeetings(token, flags) {
  const params = new URLSearchParams();
  params.append('type', flags.type || 'live');
  if (flags.from) params.append('from', flags.from);
  if (flags.to) params.append('to', flags.to);
  if (flags.page_size) params.append('page_size', flags.page_size);
  if (flags.next_page_token) params.append('next_page_token', flags.next_page_token);

  const data = await apiRequest(`/metrics/meetings?${params.toString()}`, {}, token);
  output(data);
}

async function getMeetingDetails(token, meetingId, flags) {
  const params = new URLSearchParams();
  params.append('type', flags.type || 'live');
  if (flags.page_size) params.append('page_size', flags.page_size);
  if (flags.next_page_token) params.append('next_page_token', flags.next_page_token);

  const data = await apiRequest(`/metrics/meetings/${meetingId}?${params.toString()}`, {}, token);
  output(data);
}

async function getMeetingQoS(token, meetingId, flags) {
  const params = new URLSearchParams();
  params.append('type', flags.type || 'live');
  if (flags.page_size) params.append('page_size', flags.page_size);
  if (flags.next_page_token) params.append('next_page_token', flags.next_page_token);

  let endpoint = `/metrics/meetings/${meetingId}/participants/qos`;
  if (flags.participant_id) {
    endpoint = `/metrics/meetings/${meetingId}/participants/${flags.participant_id}/qos`;
  }

  const data = await apiRequest(`${endpoint}?${params.toString()}`, {}, token);
  output(data);
}

async function listWebinars(token, flags) {
  const params = new URLSearchParams();
  params.append('type', flags.type || 'live');
  if (flags.from) params.append('from', flags.from);
  if (flags.to) params.append('to', flags.to);
  if (flags.page_size) params.append('page_size', flags.page_size);
  if (flags.next_page_token) params.append('next_page_token', flags.next_page_token);

  const data = await apiRequest(`/metrics/webinars?${params.toString()}`, {}, token);
  output(data);
}

async function getWebinarDetails(token, webinarId, flags) {
  const params = new URLSearchParams();
  params.append('type', flags.type || 'live');
  if (flags.page_size) params.append('page_size', flags.page_size);
  if (flags.next_page_token) params.append('next_page_token', flags.next_page_token);

  const data = await apiRequest(`/metrics/webinars/${webinarId}?${params.toString()}`, {}, token);
  output(data);
}

async function getWebinarQoS(token, webinarId, flags) {
  const params = new URLSearchParams();
  params.append('type', flags.type || 'live');
  if (flags.page_size) params.append('page_size', flags.page_size);
  if (flags.next_page_token) params.append('next_page_token', flags.next_page_token);

  let endpoint = `/metrics/webinars/${webinarId}/participants/qos`;
  if (flags.participant_id) {
    endpoint = `/metrics/webinars/${webinarId}/participants/${flags.participant_id}/qos`;
  }

  const data = await apiRequest(`${endpoint}?${params.toString()}`, {}, token);
  output(data);
}

async function listZoomRooms(token, flags) {
  const query = buildQuery(flags, ['page_size', 'page_number', 'next_page_token']);
  const data = await apiRequest(`/metrics/zoomrooms${query}`, {}, token);
  output(data);
}

async function getZoomRoomDetails(token, roomId, flags) {
  const params = new URLSearchParams();
  if (flags.from) params.append('from', flags.from);
  if (flags.to) params.append('to', flags.to);
  if (flags.page_size) params.append('page_size', flags.page_size);
  if (flags.next_page_token) params.append('next_page_token', flags.next_page_token);

  const query = params.toString() ? `?${params.toString()}` : '';
  const data = await apiRequest(`/metrics/zoomrooms/${roomId}${query}`, {}, token);
  output(data);
}

async function getCrcUsage(token, flags) {
  if (!flags.from || !flags.to) {
    throw new Error('Date range required. Usage: crc --from YYYY-MM-DD --to YYYY-MM-DD');
  }

  const params = new URLSearchParams();
  params.append('from', flags.from);
  params.append('to', flags.to);

  const data = await apiRequest(`/metrics/crc?${params.toString()}`, {}, token);
  output(data);
}

async function getImMetrics(token, flags) {
  if (!flags.from || !flags.to) {
    throw new Error('Date range required. Usage: im --from YYYY-MM-DD --to YYYY-MM-DD');
  }

  const params = new URLSearchParams();
  params.append('from', flags.from);
  params.append('to', flags.to);
  if (flags.page_size) params.append('page_size', flags.page_size);
  if (flags.next_page_token) params.append('next_page_token', flags.next_page_token);

  const data = await apiRequest(`/metrics/im?${params.toString()}`, {}, token);
  output(data);
}

async function getClientFeedback(token, flags) {
  if (!flags.from || !flags.to) {
    throw new Error('Date range required. Usage: client-feedback --from YYYY-MM-DD --to YYYY-MM-DD');
  }

  const params = new URLSearchParams();
  params.append('from', flags.from);
  params.append('to', flags.to);
  if (flags.page_size) params.append('page_size', flags.page_size);
  if (flags.next_page_token) params.append('next_page_token', flags.next_page_token);

  const data = await apiRequest(`/metrics/client/feedback?${params.toString()}`, {}, token);
  output(data);
}

async function getIssues(token, flags) {
  if (!flags.from || !flags.to) {
    throw new Error('Date range required. Usage: issues --from YYYY-MM-DD --to YYYY-MM-DD');
  }

  const params = new URLSearchParams();
  params.append('from', flags.from);
  params.append('to', flags.to);
  if (flags.page_size) params.append('page_size', flags.page_size);
  if (flags.next_page_token) params.append('next_page_token', flags.next_page_token);

  const data = await apiRequest(`/metrics/issues/zoomrooms?${params.toString()}`, {}, token);
  output(data);
}

async function getQuality(token, flags) {
  if (!flags.from || !flags.to) {
    throw new Error('Date range required. Usage: quality --from YYYY-MM-DD --to YYYY-MM-DD');
  }

  const params = new URLSearchParams();
  params.append('from', flags.from);
  params.append('to', flags.to);
  if (flags.type) params.append('type', flags.type);

  const data = await apiRequest(`/metrics/quality?${params.toString()}`, {}, token);
  output(data);
}

async function getTopIssues(token, flags) {
  if (!flags.from || !flags.to) {
    throw new Error('Date range required. Usage: top-issues --from YYYY-MM-DD --to YYYY-MM-DD');
  }

  const params = new URLSearchParams();
  params.append('from', flags.from);
  params.append('to', flags.to);
  if (flags.type) params.append('type', flags.type);

  const data = await apiRequest(`/metrics/quality/issues?${params.toString()}`, {}, token);
  output(data);
}

async function main() {
  const init = await initScript(showHelp);
  if (!init) return;

  const { token } = init;
  const { command, args, flags } = parseArgs();

  try {
    switch (command) {
      case 'meetings':
        await listMeetings(token, flags);
        break;
      case 'meeting':
        if (!args[0]) throw new Error('Meeting ID required. Usage: meeting <meeting_id>');
        await getMeetingDetails(token, args[0], flags);
        break;
      case 'meeting-qos':
        if (!args[0]) throw new Error('Meeting ID required. Usage: meeting-qos <meeting_id>');
        await getMeetingQoS(token, args[0], flags);
        break;
      case 'webinars':
        await listWebinars(token, flags);
        break;
      case 'webinar':
        if (!args[0]) throw new Error('Webinar ID required. Usage: webinar <webinar_id>');
        await getWebinarDetails(token, args[0], flags);
        break;
      case 'webinar-qos':
        if (!args[0]) throw new Error('Webinar ID required. Usage: webinar-qos <webinar_id>');
        await getWebinarQoS(token, args[0], flags);
        break;
      case 'zoom-rooms':
        await listZoomRooms(token, flags);
        break;
      case 'zoom-room':
        if (!args[0]) throw new Error('Room ID required. Usage: zoom-room <room_id>');
        await getZoomRoomDetails(token, args[0], flags);
        break;
      case 'crc':
        await getCrcUsage(token, flags);
        break;
      case 'im':
        await getImMetrics(token, flags);
        break;
      case 'client-feedback':
        await getClientFeedback(token, flags);
        break;
      case 'issues':
        await getIssues(token, flags);
        break;
      case 'quality':
        await getQuality(token, flags);
        break;
      case 'top-issues':
        await getTopIssues(token, flags);
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
