#!/usr/bin/env node

/**
 * Zoho Calendar Management
 * List calendars, browse and manage events, create/update/delete.
 * Calendar CRUD (create, update, delete calendars) and sharing operations.
 */

import { fileURLToPath } from 'url';
import path from 'path';
import {
  initScript, parseArgs, getAccessToken, loadOrgConfig,
  getProductBaseUrl, confirmDestructiveAction, handleError, showHelp
} from './utils.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// --- Date helpers ---

/**
 * Convert a date string to Zoho Calendar range format: yyyyMMddTHHmmssZ
 * Accepts: YYYY-MM-DD, ISO 8601, or already-formatted strings.
 */
function toZohoDate(input) {
  if (!input) return null;
  // Already in Zoho format
  if (/^\d{8}T\d{6}/.test(input)) return input;

  const d = new Date(input);
  if (isNaN(d.getTime())) {
    console.error(`Error: Invalid date "${input}". Use YYYY-MM-DD or ISO 8601 format.`);
    process.exit(1);
  }
  return d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
}

/**
 * Format a Zoho date for display.
 */
function displayDate(zohoDate) {
  if (!zohoDate) return 'N/A';
  // Try parsing yyyyMMddTHHmmss+HHMM or standard ISO
  try {
    if (/^\d{8}T\d{6}/.test(zohoDate)) {
      const y = zohoDate.slice(0, 4), m = zohoDate.slice(4, 6), d = zohoDate.slice(6, 8);
      const h = zohoDate.slice(9, 11), mi = zohoDate.slice(11, 13);
      return `${y}-${m}-${d} ${h}:${mi}`;
    }
    return new Date(zohoDate).toLocaleString();
  } catch {
    return zohoDate;
  }
}

// --- API helper ---

async function calRequest(method, endpoint, token, region, body = null, extraHeaders = {}) {
  const base = getProductBaseUrl('calendar', region);
  const url = `${base}${endpoint}`;

  const opts = { method, headers: { 'Authorization': `Zoho-oauthtoken ${token}`, ...extraHeaders } };

  if (body) {
    if (body.eventdata) {
      // Calendar event mutations use form-encoded data with eventdata as JSON string
      opts.headers['Content-Type'] = 'application/x-www-form-urlencoded';
      opts.body = `eventdata=${encodeURIComponent(JSON.stringify(body.eventdata))}`;
    } else if (body.calendarData) {
      // Calendar CRUD mutations use form-encoded data with calendarData as JSON string
      opts.headers['Content-Type'] = 'application/x-www-form-urlencoded';
      opts.body = `calendarData=${encodeURIComponent(JSON.stringify(body.calendarData))}`;
    } else {
      opts.headers['Content-Type'] = 'application/json';
      opts.body = JSON.stringify(body);
    }
  }

  const res = await fetch(url, opts);

  if (res.status === 204) return { success: true };

  const text = await res.text();
  if (!text) return { success: res.ok };

  let data;
  try { data = JSON.parse(text); } catch { data = { raw: text }; }

  if (!res.ok) {
    const errArr = Array.isArray(data.error) ? data.error : null;
    const msg = errArr?.[0]?.description || data.response?.message || data.message || (typeof data.error === 'string' ? data.error : null) || 'Calendar API request failed';
    const error = new Error(msg);
    error.status = res.status;
    error.data = data;
    throw error;
  }

  return data;
}

// --- Help ---

function printHelp() {
  showHelp('Zoho Calendar', {
    'Event Commands': [
      'calendars                          List all calendars',
      'events <calendarUid>               List events in a calendar',
      'get <calendarUid> <eventUid>       Get event details',
      'create <calendarUid>               Create a new event',
      'update <calendarUid> <eventUid>    Update an event',
      'delete <calendarUid> <eventUid>    Delete an event'
    ],
    'Calendar Management': [
      'create-calendar                    Create a new calendar',
      'update-calendar <calendarUid>      Update a calendar',
      'delete-calendar <calendarUid>      Delete a calendar'
    ],
    'Sharing': [
      'share <calendarUid>               Share a calendar with a user or group',
      'shares <calendarUid>              Get sharing details for a calendar'
    ],
    'General': [
      'help                               Show this help'
    ],
    'Event Options': [
      '--from <date>                      Range start (YYYY-MM-DD, for events list)',
      '--to <date>                        Range end (YYYY-MM-DD, for events list)',
      '--title <text>                     Event title (for create/update)',
      '--start <datetime>                 Event start (YYYY-MM-DDTHH:MM, for create/update)',
      '--end <datetime>                   Event end (YYYY-MM-DDTHH:MM, for create/update)',
      '--location <text>                  Event location (for create/update)',
      '--allday                           Mark as all-day event (for create/update)'
    ],
    'Calendar Options': [
      '--name <text>                      Calendar name, max 50 chars (for create/update-calendar)',
      '--color <hex>                      Calendar color, e.g. #4286f4 (for create/update-calendar)',
      '--description <text>               Description (for event or calendar create/update)',
      '--timezone <tz>                    Timezone, e.g. America/New_York',
      '--public <level>                   Public access: disable, freebusy, or view'
    ],
    'Share Options': [
      '--email <address>                  Email address to share with (type=user)',
      '--group-id <id>                    Group ID to share with (type=group)',
      '--privilege <level>                Share privilege: freebusy, view, moderate, delegate (default: view)',
      '--mode <action>                    Share mode: add, edit, delete (default: add)'
    ],
    'Global Options': [
      '--org <name>                       Organization to use',
      '--verbose                          Show full API response',
      '--force                            Skip confirmation for destructive actions'
    ],
    'Examples': [
      'node calendar.js calendars',
      'node calendar.js events cal_abc --from 2026-03-01 --to 2026-03-31',
      'node calendar.js get cal_abc evt_123',
      'node calendar.js create cal_abc --title "Team Sync" --start 2026-03-25T10:00 --end 2026-03-25T11:00 --timezone America/New_York',
      'node calendar.js update cal_abc evt_123 --title "Updated Title"',
      'node calendar.js delete cal_abc evt_123',
      'node calendar.js create-calendar --name "Projects" --color "#4286f4" --description "Project deadlines"',
      'node calendar.js update-calendar cal_abc --name "Renamed Calendar"',
      'node calendar.js delete-calendar cal_abc',
      'node calendar.js share cal_abc --email user@example.com --privilege moderate',
      'node calendar.js share cal_abc --group-id 12345 --privilege view',
      'node calendar.js shares cal_abc'
    ],
    'Scopes Required': [
      'ZohoCalendar.calendar.ALL, ZohoCalendar.event.ALL',
      'Re-run OAuth flow with --scopes to add these:',
      '  node auth.js flow --org <name> --scopes "ZohoCRM.modules.ALL,...,ZohoCalendar.calendar.ALL,ZohoCalendar.event.ALL"'
    ]
  });
}

// --- Commands ---

async function listCalendars(args) {
  const { config, token } = await initScript(args);

  console.log('Fetching calendars...\n');
  const data = await calRequest('GET', '/api/v1/calendars', token, config.region);

  if (args.verbose) { console.log(JSON.stringify(data, null, 2)); return; }

  const calendars = data.calendars || [];
  if (calendars.length === 0) { console.log('No calendars found.'); return; }

  console.log(`Found ${calendars.length} calendar(s):\n`);
  for (const cal of calendars) {
    const color = cal.color ? ` [${cal.color}]` : '';
    console.log(`- ${cal.name || 'N/A'}${color}`);
    console.log(`  Calendar UID: ${cal.uid}`);
    if (cal.description) console.log(`  Description: ${cal.description}`);
    if (cal.timezone) console.log(`  Timezone: ${cal.timezone}`);
    if (cal.privilege) console.log(`  Privilege: ${cal.privilege}`);
    console.log('');
  }
}

async function listEvents(calendarUid, args) {
  const { config, token } = await initScript(args);

  // Default range: current month
  const now = new Date();
  const defaultFrom = new Date(now.getFullYear(), now.getMonth(), 1);
  const defaultTo = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

  const from = toZohoDate(args.from || defaultFrom.toISOString());
  const to = toZohoDate(args.to || defaultTo.toISOString());

  const range = encodeURIComponent(JSON.stringify({ start: from, end: to }));
  const endpoint = `/api/v1/calendars/${calendarUid}/events?range=${range}`;

  console.log(`Fetching events...\n`);
  const data = await calRequest('GET', endpoint, token, config.region);

  if (args.verbose) { console.log(JSON.stringify(data, null, 2)); return; }

  let events = data.events || [];
  // API returns [{message: "No events found."}] when empty
  events = events.filter(e => e.uid || e.title || e.dateandtime);
  if (events.length === 0) { console.log('No events in this range.'); return; }

  console.log(`Found ${events.length} event(s):\n`);
  for (const evt of events) {
    const dt = evt.dateandtime || {};
    const start = displayDate(dt.start);
    const end = displayDate(dt.end);
    const allday = evt.isallday === true || evt.isallday === 'true' ? ' [ALL DAY]' : '';

    console.log(`- ${evt.title || '(no title)'}${allday}`);
    console.log(`  Event UID: ${evt.uid}`);
    console.log(`  When: ${start} - ${end}`);
    if (dt.timezone) console.log(`  Timezone: ${dt.timezone}`);
    if (evt.location) console.log(`  Location: ${evt.location}`);
    console.log('');
  }
}

async function getEvent(calendarUid, eventUid, args) {
  const { config, token } = await initScript(args);

  console.log(`Fetching event ${eventUid}...\n`);
  const data = await calRequest('GET', `/api/v1/calendars/${calendarUid}/events/${eventUid}`, token, config.region);

  if (args.verbose) { console.log(JSON.stringify(data, null, 2)); return; }

  const evt = data.events?.[0] || data;
  const dt = evt.dateandtime || {};

  console.log(`Title: ${evt.title || '(no title)'}`);
  console.log(`Event UID: ${evt.uid || eventUid}`);
  console.log(`Calendar: ${evt.caluid || calendarUid}`);
  console.log(`Start: ${displayDate(dt.start)}`);
  console.log(`End: ${displayDate(dt.end)}`);
  if (dt.timezone) console.log(`Timezone: ${dt.timezone}`);
  if (evt.location) console.log(`Location: ${evt.location}`);
  if (evt.isallday === true || evt.isallday === 'true') console.log('All Day: Yes');
  if (evt.status) console.log(`Status: ${evt.status}`);
  if (evt.organizer?.email) console.log(`Organizer: ${evt.organizer.email}`);

  if (evt.attendees && evt.attendees.length > 0) {
    console.log('\nAttendees:');
    for (const a of evt.attendees) {
      const status = a.status ? ` (${a.status})` : '';
      console.log(`  - ${a.email || a.name || 'N/A'}${status}`);
    }
  }

  if (evt.description) {
    console.log(`\nDescription:\n${evt.description}`);
  }
}

async function createEvent(calendarUid, args) {
  const { config, token } = await initScript(args);

  if (!args.title) {
    console.error('Error: --title <text> is required');
    process.exit(1);
  }
  if (!args.start) {
    console.error('Error: --start <datetime> is required (e.g. 2026-03-25T10:00)');
    process.exit(1);
  }
  if (!args.end) {
    console.error('Error: --end <datetime> is required (e.g. 2026-03-25T11:00)');
    process.exit(1);
  }

  const eventdata = {
    title: args.title,
    dateandtime: {
      start: toZohoDate(args.start),
      end: toZohoDate(args.end)
    }
  };

  if (args.timezone) eventdata.dateandtime.timezone = args.timezone;
  if (args.location) eventdata.location = args.location;
  if (args.description) eventdata.description = args.description;
  if (args.allday) eventdata.isallday = true;

  console.log(`Creating event "${args.title}"...\n`);
  const data = await calRequest('POST', `/api/v1/calendars/${calendarUid}/events`, token, config.region, { eventdata });

  if (args.verbose) { console.log(JSON.stringify(data, null, 2)); return; }

  const evt = data.events?.[0] || data;
  console.log('Event created successfully!');
  console.log(`Title: ${args.title}`);
  if (evt.uid) console.log(`Event UID: ${evt.uid}`);
  console.log(`Start: ${displayDate(toZohoDate(args.start))}`);
  console.log(`End: ${displayDate(toZohoDate(args.end))}`);
}

async function updateEvent(calendarUid, eventUid, args) {
  const { config, token } = await initScript(args);

  let hasUpdates = args.title || args.location || args.description
    || args.allday !== undefined || args.start || args.end || args.timezone;

  if (!hasUpdates) {
    console.error('Error: Provide at least one field to update');
    console.error('Options: --title, --start, --end, --timezone, --location, --description, --allday');
    process.exit(1);
  }

  // Fetch existing event — etag and dateandtime are required for updates
  const existing = await calRequest('GET', `/api/v1/calendars/${calendarUid}/events/${eventUid}`, token, config.region);
  const evt = existing.events?.[0];
  if (!evt?.etag) {
    console.error('Error: Could not retrieve event. It may not exist.');
    process.exit(1);
  }

  // Build eventdata: include uid, etag (as number), and dateandtime (required)
  const eventdata = {
    uid: eventUid,
    etag: parseInt(evt.etag),
    dateandtime: { ...evt.dateandtime }
  };

  if (args.title) eventdata.title = args.title;
  if (args.location) eventdata.location = args.location;
  if (args.description) eventdata.description = args.description;
  if (args.allday !== undefined) eventdata.isallday = !!args.allday;
  if (args.start) eventdata.dateandtime.start = toZohoDate(args.start);
  if (args.end) eventdata.dateandtime.end = toZohoDate(args.end);
  if (args.timezone) eventdata.dateandtime.timezone = args.timezone;

  console.log(`Updating event ${eventUid}...\n`);
  const data = await calRequest('PUT', `/api/v1/calendars/${calendarUid}/events/${eventUid}`, token, config.region, { eventdata });

  if (args.verbose) { console.log(JSON.stringify(data, null, 2)); return; }

  console.log('Event updated successfully!');
  if (args.title) console.log(`Title: ${args.title}`);
}

async function deleteEvent(calendarUid, eventUid, args) {
  const { config, token } = await initScript(args);

  // Fetch event to get etag (required by Calendar API for DELETE)
  const existing = await calRequest('GET', `/api/v1/calendars/${calendarUid}/events/${eventUid}`, token, config.region);
  const evt = existing.events?.[0] || {};
  const etag = evt.etag;
  const title = evt.title || eventUid;

  if (!etag) {
    console.error('Error: Could not retrieve event etag. The event may not exist.');
    process.exit(1);
  }

  const confirmed = await confirmDestructiveAction(
    `Delete event: ${title}`,
    [`Calendar: ${calendarUid}`, `Event: ${eventUid}`],
    args.force
  );
  if (!confirmed) return;

  console.log(`Deleting event "${title}"...\n`);
  await calRequest('DELETE', `/api/v1/calendars/${calendarUid}/events/${eventUid}`, token, config.region, null, { 'etag': etag });

  console.log('Event deleted successfully.');
}

// --- Calendar CRUD ---

async function createCalendar(args) {
  const { config, token } = await initScript(args);

  if (!args.name) {
    console.error('Error: --name <text> is required');
    process.exit(1);
  }
  if (args.name.length > 50) {
    console.error('Error: Calendar name must be 50 characters or fewer');
    process.exit(1);
  }
  if (!args.color) {
    console.error('Error: --color <hex> is required (e.g. #4286f4)');
    process.exit(1);
  }
  if (!/^#[0-9A-Fa-f]{6}$/.test(args.color)) {
    console.error('Error: --color must be a hex color like #RRGGBB');
    process.exit(1);
  }

  const calendarData = {
    name: args.name,
    color: args.color
  };

  if (args.description) calendarData.description = args.description;
  if (args.timezone) calendarData.timezone = args.timezone;
  if (args.public) calendarData.public = args.public;

  console.log(`Creating calendar "${args.name}"...\n`);
  const data = await calRequest('POST', '/api/v1/calendars', token, config.region, { calendarData });

  if (args.verbose) { console.log(JSON.stringify(data, null, 2)); return; }

  const cal = data.calendars?.[0] || data;
  console.log('Calendar created successfully!');
  console.log(`Name: ${args.name}`);
  console.log(`Color: ${args.color}`);
  if (cal.uid) console.log(`Calendar UID: ${cal.uid}`);
  if (args.description) console.log(`Description: ${args.description}`);
  if (args.timezone) console.log(`Timezone: ${args.timezone}`);
}

async function updateCalendar(calendarUid, args) {
  const { config, token } = await initScript(args);

  const hasUpdates = args.name || args.color || args.description
    || args.timezone || args.public;

  if (!hasUpdates) {
    console.error('Error: Provide at least one field to update');
    console.error('Options: --name, --color, --description, --timezone, --public');
    process.exit(1);
  }

  if (args.name && args.name.length > 50) {
    console.error('Error: Calendar name must be 50 characters or fewer');
    process.exit(1);
  }
  if (args.color && !/^#[0-9A-Fa-f]{6}$/.test(args.color)) {
    console.error('Error: --color must be a hex color like #RRGGBB');
    process.exit(1);
  }

  const calendarData = {};

  if (args.name) calendarData.name = args.name;
  if (args.color) calendarData.color = args.color;
  if (args.description) calendarData.description = args.description;
  if (args.timezone) calendarData.timezone = args.timezone;
  if (args.public) calendarData.public = args.public;

  console.log(`Updating calendar ${calendarUid}...\n`);
  const data = await calRequest('PUT', `/api/v1/calendars/${calendarUid}`, token, config.region, { calendarData });

  if (args.verbose) { console.log(JSON.stringify(data, null, 2)); return; }

  console.log('Calendar updated successfully!');
  if (args.name) console.log(`Name: ${args.name}`);
  if (args.color) console.log(`Color: ${args.color}`);
}

async function deleteCalendar(calendarUid, args) {
  const { config, token } = await initScript(args);

  // Fetch calendar to get etag (required by Calendar API for DELETE)
  const existing = await calRequest('GET', '/api/v1/calendars', token, config.region);
  const cal = (existing.calendars || []).find(c => c.uid === calendarUid);

  if (!cal?.etag) {
    console.error('Error: Could not retrieve calendar etag. The calendar may not exist.');
    process.exit(1);
  }

  const confirmed = await confirmDestructiveAction(
    `Delete calendar: ${cal.name || calendarUid}`,
    [`Calendar UID: ${calendarUid}`, 'This will permanently delete the calendar and all its events.'],
    args.force
  );
  if (!confirmed) return;

  console.log(`Deleting calendar "${cal.name || calendarUid}"...\n`);
  await calRequest('DELETE', `/api/v1/calendars/${calendarUid}`, token, config.region, null, { 'etag': cal.etag });

  console.log('Calendar deleted successfully.');
}

// --- Sharing ---

async function shareCalendar(calendarUid, args) {
  const { config, token } = await initScript(args);

  if (!args.email && !args['group-id']) {
    console.error('Error: --email <address> or --group-id <id> is required');
    process.exit(1);
  }
  if (args.email && args['group-id']) {
    console.error('Error: Provide --email or --group-id, not both');
    process.exit(1);
  }

  const isUser = !!args.email;
  const shareData = {
    type: isUser ? 'user' : 'group',
    mode: args.mode || 'add',
    privilege: args.privilege || 'view'
  };

  if (isUser) {
    shareData.mailid = args.email;
  } else {
    shareData.zgid = args['group-id'];
  }

  const validModes = ['add', 'edit', 'delete'];
  if (!validModes.includes(shareData.mode)) {
    console.error(`Error: --mode must be one of: ${validModes.join(', ')}`);
    process.exit(1);
  }

  const validPrivileges = ['freebusy', 'view', 'moderate', 'delegate'];
  if (!validPrivileges.includes(shareData.privilege)) {
    console.error(`Error: --privilege must be one of: ${validPrivileges.join(', ')}`);
    process.exit(1);
  }

  const shareQuery = encodeURIComponent(JSON.stringify(shareData));
  const endpoint = `/api/v1/calendars/${calendarUid}/share?shareData=${shareQuery}`;

  const target = isUser ? args.email : `group ${args['group-id']}`;
  console.log(`Sharing calendar with ${target} (${shareData.mode}, ${shareData.privilege})...\n`);
  const data = await calRequest('PUT', endpoint, token, config.region);

  if (args.verbose) { console.log(JSON.stringify(data, null, 2)); return; }

  console.log('Calendar shared successfully!');
  console.log(`Type: ${shareData.type}`);
  console.log(`Target: ${target}`);
  console.log(`Mode: ${shareData.mode}`);
  console.log(`Privilege: ${shareData.privilege}`);
}

async function getShares(calendarUid, args) {
  const { config, token } = await initScript(args);

  console.log(`Fetching sharing details for calendar ${calendarUid}...\n`);
  const data = await calRequest('GET', `/api/v1/calendars/${calendarUid}/share`, token, config.region);

  if (args.verbose) { console.log(JSON.stringify(data, null, 2)); return; }

  const shares = data.shares || data.share || [];
  if (!Array.isArray(shares) || shares.length === 0) {
    console.log('This calendar is not shared with anyone.');
    return;
  }

  console.log(`Shared with ${shares.length} user(s)/group(s):\n`);
  for (const s of shares) {
    const target = s.mailid || s.email || s.zgid || s.name || 'N/A';
    const type = s.type || 'unknown';
    const privilege = s.privilege || 'N/A';
    console.log(`- ${target}`);
    console.log(`  Type: ${type}`);
    console.log(`  Privilege: ${privilege}`);
    console.log('');
  }
}

// --- Main ---

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const command = args._[0];

  try {
    switch (command) {
      case 'calendars':
        await listCalendars(args);
        break;
      case 'events':
        if (!args._[1]) {
          console.error('Error: Calendar UID required');
          console.error('Usage: node calendar.js events <calendarUid>');
          console.error('Run: node calendar.js calendars to find calendar UIDs');
          process.exit(1);
        }
        await listEvents(args._[1], args);
        break;
      case 'get':
        if (!args._[1] || !args._[2]) {
          console.error('Error: Calendar UID and Event UID required');
          console.error('Usage: node calendar.js get <calendarUid> <eventUid>');
          process.exit(1);
        }
        await getEvent(args._[1], args._[2], args);
        break;
      case 'create':
        if (!args._[1]) {
          console.error('Error: Calendar UID required');
          console.error('Usage: node calendar.js create <calendarUid> --title "Meeting" --start 2026-03-25T10:00 --end 2026-03-25T11:00');
          process.exit(1);
        }
        await createEvent(args._[1], args);
        break;
      case 'update':
        if (!args._[1] || !args._[2]) {
          console.error('Error: Calendar UID and Event UID required');
          console.error('Usage: node calendar.js update <calendarUid> <eventUid> --title "New Title"');
          process.exit(1);
        }
        await updateEvent(args._[1], args._[2], args);
        break;
      case 'delete':
        if (!args._[1] || !args._[2]) {
          console.error('Error: Calendar UID and Event UID required');
          console.error('Usage: node calendar.js delete <calendarUid> <eventUid>');
          process.exit(1);
        }
        await deleteEvent(args._[1], args._[2], args);
        break;
      case 'create-calendar':
        await createCalendar(args);
        break;
      case 'update-calendar':
        if (!args._[1]) {
          console.error('Error: Calendar UID required');
          console.error('Usage: node calendar.js update-calendar <calendarUid> --name "New Name"');
          process.exit(1);
        }
        await updateCalendar(args._[1], args);
        break;
      case 'delete-calendar':
        if (!args._[1]) {
          console.error('Error: Calendar UID required');
          console.error('Usage: node calendar.js delete-calendar <calendarUid>');
          process.exit(1);
        }
        await deleteCalendar(args._[1], args);
        break;
      case 'share':
        if (!args._[1]) {
          console.error('Error: Calendar UID required');
          console.error('Usage: node calendar.js share <calendarUid> --email user@example.com');
          process.exit(1);
        }
        await shareCalendar(args._[1], args);
        break;
      case 'shares':
        if (!args._[1]) {
          console.error('Error: Calendar UID required');
          console.error('Usage: node calendar.js shares <calendarUid>');
          process.exit(1);
        }
        await getShares(args._[1], args);
        break;
      case 'help':
      default:
        printHelp();
    }
  } catch (error) {
    handleError(error, args.verbose);
  }
}

main();
