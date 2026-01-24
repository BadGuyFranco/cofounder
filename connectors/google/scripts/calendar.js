#!/usr/bin/env node
/**
 * Google Calendar Operations
 * Manage calendars, events, and scheduling.
 * 
 * Usage:
 *   node calendar.js calendars --account user@example.com
 *   node calendar.js events --account user@example.com
 *   node calendar.js create --title "Meeting" --start "2025-01-15T10:00:00" --end "2025-01-15T11:00:00" --account user@example.com
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
  requireApi
} from './utils.js';

/**
 * Get Calendar API instance
 */
async function getCalendarApi(email) {
  const auth = await getAuthClient(email);
  return google.calendar({ version: 'v3', auth });
}

/**
 * List calendars
 */
async function listCalendars(email) {
  const calendar = await getCalendarApi(email);
  
  const response = await calendar.calendarList.list();
  
  return (response.data.items || []).map(cal => ({
    id: cal.id,
    summary: cal.summary,
    description: cal.description,
    primary: cal.primary || false,
    accessRole: cal.accessRole,
    backgroundColor: cal.backgroundColor
  }));
}

/**
 * List events
 */
async function listEvents(email, calendarId = 'primary', options = {}) {
  const calendar = await getCalendarApi(email);
  
  const params = {
    calendarId,
    maxResults: parseInt(options.limit) || 25,
    singleEvents: true,
    orderBy: 'startTime'
  };
  
  // Date filters
  if (options.start) {
    params.timeMin = new Date(options.start).toISOString();
  } else {
    // Default to today
    params.timeMin = new Date().toISOString();
  }
  
  if (options.end) {
    params.timeMax = new Date(options.end).toISOString();
  }
  
  // Search query
  if (options.q) {
    params.q = options.q;
  }
  
  const response = await calendar.events.list(params);
  
  return (response.data.items || []).map(event => ({
    id: event.id,
    summary: event.summary,
    description: event.description,
    location: event.location,
    start: event.start.dateTime || event.start.date,
    end: event.end.dateTime || event.end.date,
    status: event.status,
    htmlLink: event.htmlLink,
    attendees: event.attendees?.map(a => ({
      email: a.email,
      responseStatus: a.responseStatus
    })),
    organizer: event.organizer?.email
  }));
}

/**
 * Get event details
 */
async function getEvent(email, eventId, calendarId = 'primary') {
  const calendar = await getCalendarApi(email);
  
  const response = await calendar.events.get({
    calendarId,
    eventId
  });
  
  const event = response.data;
  return {
    id: event.id,
    summary: event.summary,
    description: event.description,
    location: event.location,
    start: event.start.dateTime || event.start.date,
    end: event.end.dateTime || event.end.date,
    status: event.status,
    htmlLink: event.htmlLink,
    recurrence: event.recurrence,
    attendees: event.attendees?.map(a => ({
      email: a.email,
      displayName: a.displayName,
      responseStatus: a.responseStatus,
      organizer: a.organizer
    })),
    reminders: event.reminders,
    created: event.created,
    updated: event.updated
  };
}

/**
 * Create an event
 */
async function createEvent(email, options, calendarId = 'primary') {
  const calendar = await getCalendarApi(email);
  
  // Parse start time
  const startDateTime = new Date(options.start);
  if (isNaN(startDateTime.getTime())) {
    throw new Error(`Invalid start time: ${options.start}`);
  }
  
  // Calculate end time
  let endDateTime;
  if (options.end) {
    endDateTime = new Date(options.end);
  } else if (options.duration) {
    endDateTime = new Date(startDateTime.getTime() + parseInt(options.duration) * 60 * 1000);
  } else {
    // Default 1 hour duration
    endDateTime = new Date(startDateTime.getTime() + 60 * 60 * 1000);
  }
  
  const event = {
    summary: options.title,
    description: options.description || '',
    location: options.location || '',
    start: {
      dateTime: startDateTime.toISOString(),
      timeZone: options.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone
    },
    end: {
      dateTime: endDateTime.toISOString(),
      timeZone: options.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone
    }
  };
  
  // Add attendees if specified
  if (options.attendees) {
    event.attendees = options.attendees.split(',').map(e => ({ email: e.trim() }));
  }
  
  // Add recurrence if specified
  if (options.recurrence) {
    event.recurrence = [options.recurrence];
  }
  
  // Add reminders
  if (options.reminder) {
    event.reminders = {
      useDefault: false,
      overrides: [
        { method: 'popup', minutes: parseInt(options.reminder) }
      ]
    };
  }
  
  const response = await calendar.events.insert({
    calendarId,
    resource: event,
    sendUpdates: options.notify ? 'all' : 'none'
  });
  
  return {
    id: response.data.id,
    summary: response.data.summary,
    start: response.data.start.dateTime || response.data.start.date,
    end: response.data.end.dateTime || response.data.end.date,
    htmlLink: response.data.htmlLink
  };
}

/**
 * Update an event
 */
async function updateEvent(email, eventId, updates, calendarId = 'primary') {
  const calendar = await getCalendarApi(email);
  
  // Get current event
  const current = await calendar.events.get({
    calendarId,
    eventId
  });
  
  const event = current.data;
  
  // Apply updates
  if (updates.title) event.summary = updates.title;
  if (updates.description !== undefined) event.description = updates.description;
  if (updates.location !== undefined) event.location = updates.location;
  
  if (updates.start) {
    event.start = {
      dateTime: new Date(updates.start).toISOString(),
      timeZone: event.start.timeZone
    };
  }
  
  if (updates.end) {
    event.end = {
      dateTime: new Date(updates.end).toISOString(),
      timeZone: event.end.timeZone
    };
  }
  
  if (updates.attendees) {
    event.attendees = updates.attendees.split(',').map(e => ({ email: e.trim() }));
  }
  
  const response = await calendar.events.update({
    calendarId,
    eventId,
    resource: event,
    sendUpdates: updates.notify ? 'all' : 'none'
  });
  
  return {
    id: response.data.id,
    summary: response.data.summary,
    updated: true
  };
}

/**
 * Delete an event
 */
async function deleteEvent(email, eventId, calendarId = 'primary', notify = false) {
  const calendar = await getCalendarApi(email);
  
  await calendar.events.delete({
    calendarId,
    eventId,
    sendUpdates: notify ? 'all' : 'none'
  });
  
  return { eventId, deleted: true };
}

/**
 * Quick add event (natural language)
 */
async function quickAddEvent(email, text, calendarId = 'primary') {
  const calendar = await getCalendarApi(email);
  
  const response = await calendar.events.quickAdd({
    calendarId,
    text
  });
  
  return {
    id: response.data.id,
    summary: response.data.summary,
    start: response.data.start?.dateTime || response.data.start?.date,
    end: response.data.end?.dateTime || response.data.end?.date,
    htmlLink: response.data.htmlLink
  };
}

/**
 * Get free/busy information
 */
async function getFreeBusy(email, timeMin, timeMax, calendars = ['primary']) {
  const calendar = await getCalendarApi(email);
  
  const response = await calendar.freebusy.query({
    requestBody: {
      timeMin: new Date(timeMin).toISOString(),
      timeMax: new Date(timeMax).toISOString(),
      items: calendars.map(id => ({ id }))
    }
  });
  
  const result = {};
  for (const [calId, data] of Object.entries(response.data.calendars)) {
    result[calId] = {
      busy: data.busy || [],
      errors: data.errors
    };
  }
  
  return result;
}

// CLI
function printHelp() {
  showHelp('Google Calendar Operations', {
    'Commands': [
      'calendars                  List all calendars',
      'events                     List upcoming events',
      'event EVENT_ID             Get event details',
      'create                     Create a new event',
      'update EVENT_ID            Update an event',
      'delete EVENT_ID            Delete an event',
      'quick-add TEXT             Create event from natural language',
      'free-busy                  Check free/busy status',
      'help                       Show this help'
    ],
    'Options': [
      '--account EMAIL            Google account (required)',
      '--calendar ID              Calendar ID (default: primary)',
      '--title TEXT               Event title',
      '--description TEXT         Event description',
      '--location TEXT            Event location',
      '--start DATETIME           Start time (ISO 8601 or natural)',
      '--end DATETIME             End time',
      '--duration MINUTES         Duration in minutes (alternative to --end)',
      '--attendees EMAILS         Comma-separated attendee emails',
      '--reminder MINUTES         Popup reminder minutes before',
      '--notify                   Send notifications to attendees',
      '--timezone TZ              Timezone (default: system)',
      '--limit N                  Max results for list',
      '--json                     Output as JSON'
    ],
    'Date Filters for events': [
      '--start DATE               Events starting after (YYYY-MM-DD)',
      '--end DATE                 Events starting before',
      '--q TEXT                   Search text in events'
    ],
    'Examples': [
      'node calendar.js calendars --account user@example.com',
      'node calendar.js events --account user@example.com',
      'node calendar.js events --start 2025-01-01 --end 2025-01-31 --account user@example.com',
      'node calendar.js create --title "Team Meeting" --start "2025-01-15T10:00:00" --duration 60 --account user@example.com',
      'node calendar.js create --title "Sync" --start "2025-01-15T14:00:00" --attendees "a@example.com,b@example.com" --notify --account user@example.com',
      'node calendar.js quick-add "Coffee with John tomorrow at 3pm" --account user@example.com',
      'node calendar.js update EVENT_ID --title "Updated Title" --account user@example.com',
      'node calendar.js delete EVENT_ID --account user@example.com'
    ]
  });
}

async function main() {
  const { command, args, flags } = parseArgs();
  
  const email = flags.account;
  const calendarId = flags.calendar || 'primary';
  
  if (command !== 'help' && !email) {
    console.error('Error: --account is required');
    process.exit(1);
  }
  
  // Check API is enabled
  if (command !== 'help') {
    requireApi(email, 'calendar', 'calendar.js');
  }
  
  try {
    switch (command) {
      case 'calendars': {
        const calendars = await listCalendars(email);
        if (flags.json) {
          output(calendars);
        } else {
          console.log('\nCalendars:\n');
          for (const cal of calendars) {
            const primary = cal.primary ? '(primary)' : '';
            console.log(`📅 ${cal.summary} ${primary}`);
            console.log(`   ID: ${cal.id}`);
            console.log(`   Role: ${cal.accessRole}`);
            console.log('');
          }
        }
        break;
      }
      
      case 'events': {
        const events = await listEvents(email, calendarId, {
          start: flags.start,
          end: flags.end,
          limit: flags.limit,
          q: flags.q
        });
        if (flags.json) {
          output(events);
        } else {
          console.log(`\nUpcoming Events (${events.length}):\n`);
          for (const event of events) {
            console.log(`📅 ${event.summary || '(No title)'}`);
            console.log(`   Start: ${formatDateTime(event.start)}`);
            console.log(`   End: ${formatDateTime(event.end)}`);
            if (event.location) console.log(`   Location: ${event.location}`);
            console.log(`   ID: ${event.id}`);
            console.log('');
          }
        }
        break;
      }
      
      case 'event': {
        if (!args[0]) throw new Error('EVENT_ID required');
        const event = await getEvent(email, args[0], calendarId);
        output(event);
        break;
      }
      
      case 'create': {
        if (!flags.title) throw new Error('--title required');
        if (!flags.start) throw new Error('--start required');
        const event = await createEvent(email, {
          title: flags.title,
          description: flags.description,
          location: flags.location,
          start: flags.start,
          end: flags.end,
          duration: flags.duration,
          attendees: flags.attendees,
          reminder: flags.reminder,
          recurrence: flags.recurrence,
          timezone: flags.timezone,
          notify: flags.notify
        }, calendarId);
        console.log(`\n✓ Event created: ${event.summary}`);
        console.log(`  ID: ${event.id}`);
        console.log(`  Start: ${formatDateTime(event.start)}`);
        console.log(`  URL: ${event.htmlLink}`);
        break;
      }
      
      case 'update': {
        if (!args[0]) throw new Error('EVENT_ID required');
        const result = await updateEvent(email, args[0], {
          title: flags.title,
          description: flags.description,
          location: flags.location,
          start: flags.start,
          end: flags.end,
          attendees: flags.attendees,
          notify: flags.notify
        }, calendarId);
        console.log(`\n✓ Event updated: ${result.summary}`);
        break;
      }
      
      case 'delete': {
        if (!args[0]) throw new Error('EVENT_ID required');
        await deleteEvent(email, args[0], calendarId, flags.notify);
        console.log(`\n✓ Event deleted`);
        break;
      }
      
      case 'quick-add': {
        if (!args[0]) throw new Error('Event text required');
        const event = await quickAddEvent(email, args.join(' '), calendarId);
        console.log(`\n✓ Event created: ${event.summary}`);
        console.log(`  ID: ${event.id}`);
        if (event.start) console.log(`  Start: ${formatDateTime(event.start)}`);
        console.log(`  URL: ${event.htmlLink}`);
        break;
      }
      
      case 'free-busy': {
        if (!flags.start) throw new Error('--start required');
        if (!flags.end) throw new Error('--end required');
        const calendars = flags.calendars ? flags.calendars.split(',') : [calendarId];
        const result = await getFreeBusy(email, flags.start, flags.end, calendars);
        output(result);
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

/**
 * Format datetime for display
 */
function formatDateTime(dt) {
  if (!dt) return 'N/A';
  const d = new Date(dt);
  return d.toLocaleString();
}

main();
