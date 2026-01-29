/**
 * Zoom Meetings Script
 * Create, manage, and query meetings
 */

import { parseArgs, initScript, apiRequest, output, outputError, buildQuery } from './utils.js';

function showHelp() {
  console.log(`
Zoom Meetings Script - Manage Zoom meetings

Usage: node scripts/meetings.js <command> [options]

Commands:
  list <user_id>          List meetings for a user (use 'me' for current user)
  get <meeting_id>        Get meeting details
  create <user_id>        Create a new meeting
  update <meeting_id>     Update meeting settings
  delete <meeting_id>     Delete a meeting
  end <meeting_id>        End a live meeting
  status <meeting_id>     Update meeting status
  registrants <mtg_id>    List meeting registrants
  register <meeting_id>   Add a registrant to meeting
  invite <meeting_id>     Get meeting invitation text
  polls <meeting_id>      List meeting polls
  poll-create <mtg_id>    Create a poll for meeting
  live                    List all live meetings (account-wide)
  past <meeting_id>       Get past meeting details
  participants <mtg_id>   Get past meeting participants
  help                    Show this help

Options:
  --type <type>           Meeting type filter: scheduled, live, upcoming, 
                          upcoming_meetings, previous_meetings
  --page_size <n>         Results per page (max 300)
  --page_number <n>       Page number
  --next_page_token <t>   Pagination token

  For create/update:
  --topic <topic>         Meeting topic/title
  --type <n>              1=Instant, 2=Scheduled, 3=Recurring no time, 
                          8=Recurring fixed time (default 2)
  --start_time <iso>      Start time in ISO format (e.g., 2024-01-15T10:00:00Z)
  --duration <min>        Duration in minutes
  --timezone <tz>         Timezone (e.g., America/Los_Angeles)
  --password <pwd>        Meeting password
  --agenda <text>         Meeting description/agenda
  --waiting_room          Enable waiting room (true/false)
  --join_before_host      Allow join before host (true/false)
  --mute_upon_entry       Mute participants on entry (true/false)
  --auto_recording <type> none, local, cloud
  --host_video            Start with host video on (true/false)
  --participant_video     Start with participant video on (true/false)
  --alternative_hosts <e> Comma-separated emails of alternative hosts

  For registrants:
  --status <status>       Filter: pending, approved, denied
  --occurrence_id <id>    For recurring meeting occurrences

  For register:
  --email <email>         Registrant email (required)
  --first_name <name>     First name (required)
  --last_name <name>      Last name

Examples:
  node scripts/meetings.js list me
  node scripts/meetings.js list me --type upcoming
  node scripts/meetings.js get 123456789
  node scripts/meetings.js create me --topic "Team Standup" --duration 30
  node scripts/meetings.js create me --topic "Weekly" --type 8 --start_time 2024-02-01T09:00:00Z
  node scripts/meetings.js update 123456789 --topic "Updated Topic" --password newpass
  node scripts/meetings.js delete 123456789
  node scripts/meetings.js end 123456789
  node scripts/meetings.js registrants 123456789
  node scripts/meetings.js register 123456789 --email john@example.com --first_name John
  node scripts/meetings.js invite 123456789
  node scripts/meetings.js live
  node scripts/meetings.js past 123456789
  node scripts/meetings.js participants 123456789
`);
}

async function listMeetings(token, userId, flags) {
  const query = buildQuery(flags, ['type', 'page_size', 'page_number', 'next_page_token']);
  const data = await apiRequest(`/users/${encodeURIComponent(userId)}/meetings${query}`, {}, token);
  output(data);
}

async function getMeeting(token, meetingId, flags) {
  const query = buildQuery(flags, ['occurrence_id', 'show_previous_occurrences']);
  const data = await apiRequest(`/meetings/${meetingId}${query}`, {}, token);
  output(data);
}

async function createMeeting(token, userId, flags) {
  const body = {
    topic: flags.topic || 'Zoom Meeting',
    type: parseInt(flags.type) || 2,
    duration: flags.duration ? parseInt(flags.duration) : undefined,
    timezone: flags.timezone,
    password: flags.password,
    agenda: flags.agenda,
    start_time: flags.start_time,
    settings: {}
  };

  // Meeting settings
  if (flags.waiting_room !== undefined) body.settings.waiting_room = flags.waiting_room === 'true';
  if (flags.join_before_host !== undefined) body.settings.join_before_host = flags.join_before_host === 'true';
  if (flags.mute_upon_entry !== undefined) body.settings.mute_upon_entry = flags.mute_upon_entry === 'true';
  if (flags.auto_recording) body.settings.auto_recording = flags.auto_recording;
  if (flags.host_video !== undefined) body.settings.host_video = flags.host_video === 'true';
  if (flags.participant_video !== undefined) body.settings.participant_video = flags.participant_video === 'true';
  if (flags.alternative_hosts) body.settings.alternative_hosts = flags.alternative_hosts;

  // Remove empty settings
  if (Object.keys(body.settings).length === 0) delete body.settings;

  const data = await apiRequest(`/users/${encodeURIComponent(userId)}/meetings`, {
    method: 'POST',
    body: JSON.stringify(body)
  }, token);
  output(data);
}

async function updateMeeting(token, meetingId, flags) {
  const body = {};
  
  if (flags.topic) body.topic = flags.topic;
  if (flags.type) body.type = parseInt(flags.type);
  if (flags.start_time) body.start_time = flags.start_time;
  if (flags.duration) body.duration = parseInt(flags.duration);
  if (flags.timezone) body.timezone = flags.timezone;
  if (flags.password) body.password = flags.password;
  if (flags.agenda) body.agenda = flags.agenda;

  // Settings
  const settings = {};
  if (flags.waiting_room !== undefined) settings.waiting_room = flags.waiting_room === 'true';
  if (flags.join_before_host !== undefined) settings.join_before_host = flags.join_before_host === 'true';
  if (flags.mute_upon_entry !== undefined) settings.mute_upon_entry = flags.mute_upon_entry === 'true';
  if (flags.auto_recording) settings.auto_recording = flags.auto_recording;
  if (flags.host_video !== undefined) settings.host_video = flags.host_video === 'true';
  if (flags.participant_video !== undefined) settings.participant_video = flags.participant_video === 'true';
  if (flags.alternative_hosts) settings.alternative_hosts = flags.alternative_hosts;
  
  if (Object.keys(settings).length > 0) body.settings = settings;

  if (Object.keys(body).length === 0) {
    throw new Error('No fields to update. See help for available options.');
  }

  const query = flags.occurrence_id ? `?occurrence_id=${flags.occurrence_id}` : '';
  const data = await apiRequest(`/meetings/${meetingId}${query}`, {
    method: 'PATCH',
    body: JSON.stringify(body)
  }, token);
  output(data);
}

async function deleteMeeting(token, meetingId, flags) {
  const params = new URLSearchParams();
  if (flags.occurrence_id) params.append('occurrence_id', flags.occurrence_id);
  if (flags.schedule_for_reminder !== undefined) params.append('schedule_for_reminder', flags.schedule_for_reminder);
  if (flags.cancel_meeting_reminder !== undefined) params.append('cancel_meeting_reminder', flags.cancel_meeting_reminder);
  
  const query = params.toString() ? `?${params.toString()}` : '';
  const data = await apiRequest(`/meetings/${meetingId}${query}`, {
    method: 'DELETE'
  }, token);
  output(data);
}

async function endMeeting(token, meetingId) {
  const data = await apiRequest(`/meetings/${meetingId}/status`, {
    method: 'PUT',
    body: JSON.stringify({ action: 'end' })
  }, token);
  output(data);
}

async function updateMeetingStatus(token, meetingId, flags) {
  if (!flags.action) {
    throw new Error('Action required. Usage: status <meeting_id> --action end');
  }

  const data = await apiRequest(`/meetings/${meetingId}/status`, {
    method: 'PUT',
    body: JSON.stringify({ action: flags.action })
  }, token);
  output(data);
}

async function listRegistrants(token, meetingId, flags) {
  const query = buildQuery(flags, ['status', 'page_size', 'page_number', 'next_page_token', 'occurrence_id']);
  const data = await apiRequest(`/meetings/${meetingId}/registrants${query}`, {}, token);
  output(data);
}

async function addRegistrant(token, meetingId, flags) {
  if (!flags.email || !flags.first_name) {
    throw new Error('Email and first_name required. Usage: register <meeting_id> --email user@example.com --first_name John');
  }

  const body = {
    email: flags.email,
    first_name: flags.first_name,
    last_name: flags.last_name || ''
  };

  // Optional fields
  const optionalFields = ['address', 'city', 'country', 'zip', 'state', 'phone', 
                          'industry', 'org', 'job_title', 'comments'];
  for (const field of optionalFields) {
    if (flags[field]) body[field] = flags[field];
  }

  const query = flags.occurrence_ids ? `?occurrence_ids=${flags.occurrence_ids}` : '';
  const data = await apiRequest(`/meetings/${meetingId}/registrants${query}`, {
    method: 'POST',
    body: JSON.stringify(body)
  }, token);
  output(data);
}

async function getMeetingInvitation(token, meetingId) {
  const data = await apiRequest(`/meetings/${meetingId}/invitation`, {}, token);
  output(data);
}

async function listPolls(token, meetingId) {
  const data = await apiRequest(`/meetings/${meetingId}/polls`, {}, token);
  output(data);
}

async function createPoll(token, meetingId, flags) {
  if (!flags.title || !flags.questions) {
    throw new Error('Title and questions required. Questions should be JSON array.');
  }

  let questions;
  try {
    questions = JSON.parse(flags.questions);
  } catch (e) {
    throw new Error('Questions must be valid JSON array. Example: \'[{"name":"Q1","type":"single","answers":["A","B"]}]\'');
  }

  const body = {
    title: flags.title,
    questions: questions
  };

  const data = await apiRequest(`/meetings/${meetingId}/polls`, {
    method: 'POST',
    body: JSON.stringify(body)
  }, token);
  output(data);
}

async function listLiveMeetings(token, flags) {
  const query = buildQuery(flags, ['page_size', 'next_page_token']);
  const data = await apiRequest(`/metrics/meetings${query.replace('?', '?type=live&')}`, {}, token);
  output(data);
}

async function getPastMeetingDetails(token, meetingId) {
  const data = await apiRequest(`/past_meetings/${meetingId}`, {}, token);
  output(data);
}

async function getPastMeetingParticipants(token, meetingId, flags) {
  const query = buildQuery(flags, ['page_size', 'next_page_token']);
  const data = await apiRequest(`/past_meetings/${meetingId}/participants${query}`, {}, token);
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
        await listMeetings(token, args[0], flags);
        break;
      case 'get':
        if (!args[0]) throw new Error('Meeting ID required. Usage: get <meeting_id>');
        await getMeeting(token, args[0], flags);
        break;
      case 'create':
        if (!args[0]) throw new Error('User ID required. Usage: create <user_id> [options]');
        await createMeeting(token, args[0], flags);
        break;
      case 'update':
        if (!args[0]) throw new Error('Meeting ID required. Usage: update <meeting_id> [options]');
        await updateMeeting(token, args[0], flags);
        break;
      case 'delete':
        if (!args[0]) throw new Error('Meeting ID required. Usage: delete <meeting_id>');
        await deleteMeeting(token, args[0], flags);
        break;
      case 'end':
        if (!args[0]) throw new Error('Meeting ID required. Usage: end <meeting_id>');
        await endMeeting(token, args[0]);
        break;
      case 'status':
        if (!args[0]) throw new Error('Meeting ID required. Usage: status <meeting_id> --action end');
        await updateMeetingStatus(token, args[0], flags);
        break;
      case 'registrants':
        if (!args[0]) throw new Error('Meeting ID required. Usage: registrants <meeting_id>');
        await listRegistrants(token, args[0], flags);
        break;
      case 'register':
        if (!args[0]) throw new Error('Meeting ID required. Usage: register <meeting_id> --email user@example.com');
        await addRegistrant(token, args[0], flags);
        break;
      case 'invite':
        if (!args[0]) throw new Error('Meeting ID required. Usage: invite <meeting_id>');
        await getMeetingInvitation(token, args[0]);
        break;
      case 'polls':
        if (!args[0]) throw new Error('Meeting ID required. Usage: polls <meeting_id>');
        await listPolls(token, args[0]);
        break;
      case 'poll-create':
        if (!args[0]) throw new Error('Meeting ID required. Usage: poll-create <meeting_id> --title "Poll" --questions "[...]"');
        await createPoll(token, args[0], flags);
        break;
      case 'live':
        await listLiveMeetings(token, flags);
        break;
      case 'past':
        if (!args[0]) throw new Error('Meeting ID/UUID required. Usage: past <meeting_id>');
        await getPastMeetingDetails(token, args[0]);
        break;
      case 'participants':
        if (!args[0]) throw new Error('Meeting ID/UUID required. Usage: participants <meeting_id>');
        await getPastMeetingParticipants(token, args[0], flags);
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
