/**
 * Zoom Webinars Script
 * Create, manage, and query webinars
 */

import { parseArgs, initScript, apiRequest, output, outputError, buildQuery } from './utils.js';

function showHelp() {
  console.log(`
Zoom Webinars Script - Manage Zoom webinars

Usage: node scripts/webinars.js <command> [options]

Commands:
  list <user_id>          List webinars for a user
  get <webinar_id>        Get webinar details
  create <user_id>        Create a new webinar
  update <webinar_id>     Update webinar settings
  delete <webinar_id>     Delete a webinar
  end <webinar_id>        End a live webinar
  registrants <web_id>    List webinar registrants
  register <webinar_id>   Add a registrant to webinar
  panelists <webinar_id>  List webinar panelists
  add-panelist <web_id>   Add panelist to webinar
  absentees <webinar_id>  List webinar absentees
  polls <webinar_id>      List webinar polls
  poll-create <web_id>    Create a poll for webinar
  qa <webinar_id>         Get webinar Q&A report
  past <webinar_id>       Get past webinar details
  participants <web_id>   Get past webinar participants
  help                    Show this help

Options:
  --page_size <n>         Results per page (max 300)
  --page_number <n>       Page number
  --next_page_token <t>   Pagination token

  For create/update:
  --topic <topic>         Webinar topic/title
  --type <n>              5=Webinar, 6=Recurring no time, 9=Recurring fixed (default 5)
  --start_time <iso>      Start time in ISO format
  --duration <min>        Duration in minutes
  --timezone <tz>         Timezone (e.g., America/Los_Angeles)
  --password <pwd>        Webinar password
  --agenda <text>         Webinar description
  --host_video            Start with host video (true/false)
  --panelists_video       Start with panelist video (true/false)
  --practice_session      Enable practice session (true/false)
  --hd_video              HD video (true/false)
  --approval_type <n>     0=Auto approve, 1=Manual, 2=No registration
  --auto_recording <type> none, local, cloud
  --alternative_hosts <e> Comma-separated emails

  For registrants:
  --status <status>       Filter: pending, approved, denied
  --occurrence_id <id>    For recurring webinar occurrences

  For register:
  --email <email>         Registrant email (required)
  --first_name <name>     First name (required)
  --last_name <name>      Last name

  For add-panelist:
  --email <email>         Panelist email (required)
  --name <name>           Panelist name (required)

Examples:
  node scripts/webinars.js list me
  node scripts/webinars.js get 123456789
  node scripts/webinars.js create me --topic "Product Demo" --duration 60
  node scripts/webinars.js update 123456789 --topic "Updated Demo"
  node scripts/webinars.js delete 123456789
  node scripts/webinars.js registrants 123456789
  node scripts/webinars.js register 123456789 --email john@example.com --first_name John
  node scripts/webinars.js panelists 123456789
  node scripts/webinars.js add-panelist 123456789 --email speaker@example.com --name "Jane Doe"
  node scripts/webinars.js polls 123456789
  node scripts/webinars.js past 123456789
`);
}

async function listWebinars(token, userId, flags) {
  const query = buildQuery(flags, ['page_size', 'page_number', 'next_page_token']);
  const data = await apiRequest(`/users/${encodeURIComponent(userId)}/webinars${query}`, {}, token);
  output(data);
}

async function getWebinar(token, webinarId, flags) {
  const query = buildQuery(flags, ['occurrence_id', 'show_previous_occurrences']);
  const data = await apiRequest(`/webinars/${webinarId}${query}`, {}, token);
  output(data);
}

async function createWebinar(token, userId, flags) {
  const body = {
    topic: flags.topic || 'Zoom Webinar',
    type: parseInt(flags.type) || 5,
    duration: flags.duration ? parseInt(flags.duration) : undefined,
    timezone: flags.timezone,
    password: flags.password,
    agenda: flags.agenda,
    start_time: flags.start_time,
    settings: {}
  };

  // Webinar settings
  if (flags.host_video !== undefined) body.settings.host_video = flags.host_video === 'true';
  if (flags.panelists_video !== undefined) body.settings.panelists_video = flags.panelists_video === 'true';
  if (flags.practice_session !== undefined) body.settings.practice_session = flags.practice_session === 'true';
  if (flags.hd_video !== undefined) body.settings.hd_video = flags.hd_video === 'true';
  if (flags.approval_type !== undefined) body.settings.approval_type = parseInt(flags.approval_type);
  if (flags.auto_recording) body.settings.auto_recording = flags.auto_recording;
  if (flags.alternative_hosts) body.settings.alternative_hosts = flags.alternative_hosts;

  if (Object.keys(body.settings).length === 0) delete body.settings;

  const data = await apiRequest(`/users/${encodeURIComponent(userId)}/webinars`, {
    method: 'POST',
    body: JSON.stringify(body)
  }, token);
  output(data);
}

async function updateWebinar(token, webinarId, flags) {
  const body = {};
  
  if (flags.topic) body.topic = flags.topic;
  if (flags.type) body.type = parseInt(flags.type);
  if (flags.start_time) body.start_time = flags.start_time;
  if (flags.duration) body.duration = parseInt(flags.duration);
  if (flags.timezone) body.timezone = flags.timezone;
  if (flags.password) body.password = flags.password;
  if (flags.agenda) body.agenda = flags.agenda;

  const settings = {};
  if (flags.host_video !== undefined) settings.host_video = flags.host_video === 'true';
  if (flags.panelists_video !== undefined) settings.panelists_video = flags.panelists_video === 'true';
  if (flags.practice_session !== undefined) settings.practice_session = flags.practice_session === 'true';
  if (flags.hd_video !== undefined) settings.hd_video = flags.hd_video === 'true';
  if (flags.approval_type !== undefined) settings.approval_type = parseInt(flags.approval_type);
  if (flags.auto_recording) settings.auto_recording = flags.auto_recording;
  if (flags.alternative_hosts) settings.alternative_hosts = flags.alternative_hosts;
  
  if (Object.keys(settings).length > 0) body.settings = settings;

  if (Object.keys(body).length === 0) {
    throw new Error('No fields to update. See help for available options.');
  }

  const query = flags.occurrence_id ? `?occurrence_id=${flags.occurrence_id}` : '';
  const data = await apiRequest(`/webinars/${webinarId}${query}`, {
    method: 'PATCH',
    body: JSON.stringify(body)
  }, token);
  output(data);
}

async function deleteWebinar(token, webinarId, flags) {
  const query = flags.occurrence_id ? `?occurrence_id=${flags.occurrence_id}` : '';
  const data = await apiRequest(`/webinars/${webinarId}${query}`, {
    method: 'DELETE'
  }, token);
  output(data);
}

async function endWebinar(token, webinarId) {
  const data = await apiRequest(`/webinars/${webinarId}/status`, {
    method: 'PUT',
    body: JSON.stringify({ action: 'end' })
  }, token);
  output(data);
}

async function listRegistrants(token, webinarId, flags) {
  const query = buildQuery(flags, ['status', 'page_size', 'page_number', 'next_page_token', 'occurrence_id']);
  const data = await apiRequest(`/webinars/${webinarId}/registrants${query}`, {}, token);
  output(data);
}

async function addRegistrant(token, webinarId, flags) {
  if (!flags.email || !flags.first_name) {
    throw new Error('Email and first_name required. Usage: register <webinar_id> --email user@example.com --first_name John');
  }

  const body = {
    email: flags.email,
    first_name: flags.first_name,
    last_name: flags.last_name || ''
  };

  const optionalFields = ['address', 'city', 'country', 'zip', 'state', 'phone', 
                          'industry', 'org', 'job_title', 'comments'];
  for (const field of optionalFields) {
    if (flags[field]) body[field] = flags[field];
  }

  const query = flags.occurrence_ids ? `?occurrence_ids=${flags.occurrence_ids}` : '';
  const data = await apiRequest(`/webinars/${webinarId}/registrants${query}`, {
    method: 'POST',
    body: JSON.stringify(body)
  }, token);
  output(data);
}

async function listPanelists(token, webinarId) {
  const data = await apiRequest(`/webinars/${webinarId}/panelists`, {}, token);
  output(data);
}

async function addPanelist(token, webinarId, flags) {
  if (!flags.email || !flags.name) {
    throw new Error('Email and name required. Usage: add-panelist <webinar_id> --email speaker@example.com --name "Jane Doe"');
  }

  const body = {
    panelists: [{
      email: flags.email,
      name: flags.name
    }]
  };

  const data = await apiRequest(`/webinars/${webinarId}/panelists`, {
    method: 'POST',
    body: JSON.stringify(body)
  }, token);
  output(data);
}

async function listAbsentees(token, webinarId, flags) {
  const query = buildQuery(flags, ['page_size', 'next_page_token', 'occurrence_id']);
  const data = await apiRequest(`/past_webinars/${webinarId}/absentees${query}`, {}, token);
  output(data);
}

async function listPolls(token, webinarId) {
  const data = await apiRequest(`/webinars/${webinarId}/polls`, {}, token);
  output(data);
}

async function createPoll(token, webinarId, flags) {
  if (!flags.title || !flags.questions) {
    throw new Error('Title and questions required. Questions should be JSON array.');
  }

  let questions;
  try {
    questions = JSON.parse(flags.questions);
  } catch (e) {
    throw new Error('Questions must be valid JSON array.');
  }

  const body = {
    title: flags.title,
    questions: questions
  };

  const data = await apiRequest(`/webinars/${webinarId}/polls`, {
    method: 'POST',
    body: JSON.stringify(body)
  }, token);
  output(data);
}

async function getQA(token, webinarId) {
  const data = await apiRequest(`/past_webinars/${webinarId}/qa`, {}, token);
  output(data);
}

async function getPastWebinarDetails(token, webinarId) {
  const data = await apiRequest(`/past_webinars/${webinarId}`, {}, token);
  output(data);
}

async function getPastWebinarParticipants(token, webinarId, flags) {
  const query = buildQuery(flags, ['page_size', 'next_page_token']);
  const data = await apiRequest(`/past_webinars/${webinarId}/participants${query}`, {}, token);
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
        await listWebinars(token, args[0], flags);
        break;
      case 'get':
        if (!args[0]) throw new Error('Webinar ID required. Usage: get <webinar_id>');
        await getWebinar(token, args[0], flags);
        break;
      case 'create':
        if (!args[0]) throw new Error('User ID required. Usage: create <user_id> [options]');
        await createWebinar(token, args[0], flags);
        break;
      case 'update':
        if (!args[0]) throw new Error('Webinar ID required. Usage: update <webinar_id> [options]');
        await updateWebinar(token, args[0], flags);
        break;
      case 'delete':
        if (!args[0]) throw new Error('Webinar ID required. Usage: delete <webinar_id>');
        await deleteWebinar(token, args[0], flags);
        break;
      case 'end':
        if (!args[0]) throw new Error('Webinar ID required. Usage: end <webinar_id>');
        await endWebinar(token, args[0]);
        break;
      case 'registrants':
        if (!args[0]) throw new Error('Webinar ID required. Usage: registrants <webinar_id>');
        await listRegistrants(token, args[0], flags);
        break;
      case 'register':
        if (!args[0]) throw new Error('Webinar ID required. Usage: register <webinar_id> --email user@example.com');
        await addRegistrant(token, args[0], flags);
        break;
      case 'panelists':
        if (!args[0]) throw new Error('Webinar ID required. Usage: panelists <webinar_id>');
        await listPanelists(token, args[0]);
        break;
      case 'add-panelist':
        if (!args[0]) throw new Error('Webinar ID required. Usage: add-panelist <webinar_id> --email x --name y');
        await addPanelist(token, args[0], flags);
        break;
      case 'absentees':
        if (!args[0]) throw new Error('Webinar ID required. Usage: absentees <webinar_id>');
        await listAbsentees(token, args[0], flags);
        break;
      case 'polls':
        if (!args[0]) throw new Error('Webinar ID required. Usage: polls <webinar_id>');
        await listPolls(token, args[0]);
        break;
      case 'poll-create':
        if (!args[0]) throw new Error('Webinar ID required. Usage: poll-create <webinar_id> --title "Poll" --questions "[...]"');
        await createPoll(token, args[0], flags);
        break;
      case 'qa':
        if (!args[0]) throw new Error('Webinar ID required. Usage: qa <webinar_id>');
        await getQA(token, args[0]);
        break;
      case 'past':
        if (!args[0]) throw new Error('Webinar ID required. Usage: past <webinar_id>');
        await getPastWebinarDetails(token, args[0]);
        break;
      case 'participants':
        if (!args[0]) throw new Error('Webinar ID required. Usage: participants <webinar_id>');
        await getPastWebinarParticipants(token, args[0], flags);
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
