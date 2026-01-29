/**
 * Zoom Recordings Script
 * Manage cloud recordings
 */

import { parseArgs, initScript, apiRequest, output, outputError, buildQuery } from './utils.js';

function showHelp() {
  console.log(`
Zoom Recordings Script - Manage cloud recordings

Usage: node scripts/recordings.js <command> [options]

Commands:
  list <user_id>          List recordings for a user
  get <meeting_id>        Get recording details for a meeting
  delete <meeting_id>     Delete meeting recordings
  delete-file <mtg_id>    Delete a specific recording file
  recover <meeting_id>    Recover deleted recordings (from trash)
  settings <user_id>      Get user's recording settings
  analytics <mtg_id>      Get recording analytics
  registrants <mtg_id>    List on-demand recording registrants
  help                    Show this help

Options:
  --from <date>           Start date (YYYY-MM-DD) for list command
  --to <date>             End date (YYYY-MM-DD) for list command
  --trash                 List recordings from trash (true/false)
  --trash_type <type>     meeting_recordings or recording_file
  --page_size <n>         Results per page (max 300)
  --next_page_token <t>   Pagination token
  --mc                    Include meeting connector recordings (true/false)

  For delete:
  --action <action>       trash (default) or delete (permanent)

  For delete-file:
  --recording_id <id>     Recording file ID to delete (required)
  --action <action>       trash (default) or delete (permanent)

Examples:
  node scripts/recordings.js list me
  node scripts/recordings.js list me --from 2024-01-01 --to 2024-01-31
  node scripts/recordings.js list me --trash true
  node scripts/recordings.js get 123456789
  node scripts/recordings.js delete 123456789
  node scripts/recordings.js delete 123456789 --action delete
  node scripts/recordings.js delete-file 123456789 --recording_id abc123
  node scripts/recordings.js recover 123456789
  node scripts/recordings.js settings me
  node scripts/recordings.js analytics 123456789
`);
}

async function listRecordings(token, userId, flags) {
  const params = new URLSearchParams();
  
  if (flags.from) params.append('from', flags.from);
  if (flags.to) params.append('to', flags.to);
  if (flags.page_size) params.append('page_size', flags.page_size);
  if (flags.next_page_token) params.append('next_page_token', flags.next_page_token);
  if (flags.mc === 'true') params.append('mc', 'true');
  if (flags.trash === 'true') params.append('trash', 'true');
  if (flags.trash_type) params.append('trash_type', flags.trash_type);

  const query = params.toString() ? `?${params.toString()}` : '';
  const data = await apiRequest(`/users/${encodeURIComponent(userId)}/recordings${query}`, {}, token);
  output(data);
}

async function getRecording(token, meetingId) {
  const data = await apiRequest(`/meetings/${meetingId}/recordings`, {}, token);
  output(data);
}

async function deleteRecordings(token, meetingId, flags) {
  const action = flags.action || 'trash';
  const query = `?action=${action}`;
  const data = await apiRequest(`/meetings/${meetingId}/recordings${query}`, {
    method: 'DELETE'
  }, token);
  output(data);
}

async function deleteRecordingFile(token, meetingId, flags) {
  if (!flags.recording_id) {
    throw new Error('Recording ID required. Usage: delete-file <meeting_id> --recording_id <recording_id>');
  }

  const action = flags.action || 'trash';
  const query = `?action=${action}`;
  const data = await apiRequest(`/meetings/${meetingId}/recordings/${flags.recording_id}${query}`, {
    method: 'DELETE'
  }, token);
  output(data);
}

async function recoverRecordings(token, meetingId) {
  const data = await apiRequest(`/meetings/${meetingId}/recordings/status`, {
    method: 'PUT',
    body: JSON.stringify({ action: 'recover' })
  }, token);
  output(data);
}

async function getRecordingSettings(token, userId) {
  const data = await apiRequest(`/users/${encodeURIComponent(userId)}/settings?option=recording`, {}, token);
  output(data);
}

async function getRecordingAnalytics(token, meetingId, flags) {
  const query = buildQuery(flags, ['page_size', 'next_page_token', 'from', 'to']);
  const data = await apiRequest(`/meetings/${meetingId}/recordings/analytics_summary${query}`, {}, token);
  output(data);
}

async function listRecordingRegistrants(token, meetingId, flags) {
  const query = buildQuery(flags, ['status', 'page_size', 'page_number', 'next_page_token']);
  const data = await apiRequest(`/meetings/${meetingId}/recordings/registrants${query}`, {}, token);
  output(data);
}

async function main() {
  const init = await initScript(showHelp);
  if (!init) return;

  const { token } = init;
  const { command, args, flags } = parseArgs();

  try {
    switch (command) {
      case 'list':
        if (!args[0]) throw new Error('User ID required. Usage: list <user_id>');
        await listRecordings(token, args[0], flags);
        break;
      case 'get':
        if (!args[0]) throw new Error('Meeting ID required. Usage: get <meeting_id>');
        await getRecording(token, args[0]);
        break;
      case 'delete':
        if (!args[0]) throw new Error('Meeting ID required. Usage: delete <meeting_id>');
        await deleteRecordings(token, args[0], flags);
        break;
      case 'delete-file':
        if (!args[0]) throw new Error('Meeting ID required. Usage: delete-file <meeting_id> --recording_id <id>');
        await deleteRecordingFile(token, args[0], flags);
        break;
      case 'recover':
        if (!args[0]) throw new Error('Meeting ID required. Usage: recover <meeting_id>');
        await recoverRecordings(token, args[0]);
        break;
      case 'settings':
        if (!args[0]) throw new Error('User ID required. Usage: settings <user_id>');
        await getRecordingSettings(token, args[0]);
        break;
      case 'analytics':
        if (!args[0]) throw new Error('Meeting ID required. Usage: analytics <meeting_id>');
        await getRecordingAnalytics(token, args[0], flags);
        break;
      case 'registrants':
        if (!args[0]) throw new Error('Meeting ID required. Usage: registrants <meeting_id>');
        await listRecordingRegistrants(token, args[0], flags);
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
