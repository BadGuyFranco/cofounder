#!/usr/bin/env node

/**
 * Go High Level Calendars Script
 * Manage calendars and appointments.
 * 
 * Usage:
 *   node calendars.js list --location "Name"
 *   node calendars.js get <calendar-id> --location "Name"
 *   node calendars.js appointments --calendar-id <id> --location "Name"
 *   node calendars.js appointment <appointment-id> --location "Name"
 *   node calendars.js book --calendar-id <id> --contact-id <id> --start "datetime" --location "Name"
 *   node calendars.js cancel <appointment-id> --location "Name"
 *   node calendars.js slots --calendar-id <id> --start "date" --end "date" --location "Name"
 *   node calendars.js locations
 */

import path from 'path';
import { fileURLToPath } from 'url';
import {
  loadEnv,
  loadLocations,
  resolveLocation,
  parseArgs,
  confirmDestructiveAction,
  listLocations,
  formatDate,
  handleError
} from './utils.js';

const LOCAL_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const BASE_URL = 'https://services.leadconnectorhq.com';

// Load environment
loadEnv(LOCAL_DIR);

// API request wrapper
async function apiRequest(method, endpoint, apiKey, body = null) {
  const url = `${BASE_URL}${endpoint}`;
  const options = {
    method,
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'Version': '2021-07-28'
    }
  };
  
  if (body) {
    options.body = JSON.stringify(body);
  }
  
  const response = await fetch(url, options);
  const data = await response.json();
  
  if (!response.ok) {
    const error = new Error(data.message || data.error || 'API request failed');
    error.status = response.status;
    error.data = data;
    throw error;
  }
  
  return data;
}

// List calendars
async function listCalendars(location, verbose) {
  const data = await apiRequest('GET', `/calendars/?locationId=${location.id}`, location.key);
  
  const calendars = data.calendars || [];
  console.log(`Found ${calendars.length} calendars:\n`);
  
  for (const cal of calendars) {
    console.log(`- ${cal.name}`);
    console.log(`  ID: ${cal.id}`);
    console.log(`  Type: ${cal.calendarType || 'N/A'}`);
    console.log(`  Description: ${cal.description || 'N/A'}`);
    if (cal.isActive !== undefined) console.log(`  Active: ${cal.isActive}`);
    console.log('');
  }
  
  if (verbose) {
    console.log('\nFull response:');
    console.log(JSON.stringify(data, null, 2));
  }
  
  return calendars;
}

// Get calendar details
async function getCalendar(calendarId, location, verbose) {
  const data = await apiRequest('GET', `/calendars/${calendarId}`, location.key);
  
  const cal = data.calendar || data;
  console.log(`Calendar: ${cal.name}`);
  console.log(`ID: ${cal.id}`);
  console.log(`Type: ${cal.calendarType || 'N/A'}`);
  console.log(`Description: ${cal.description || 'N/A'}`);
  console.log(`Slot Duration: ${cal.slotDuration || 'N/A'} minutes`);
  console.log(`Slot Buffer: ${cal.slotBuffer || 0} minutes`);
  console.log(`Active: ${cal.isActive !== undefined ? cal.isActive : 'N/A'}`);
  
  if (cal.openHours && cal.openHours.length > 0) {
    console.log('\nOpen Hours:');
    for (const oh of cal.openHours) {
      console.log(`  ${oh.daysOfTheWeek?.join(', ') || 'All days'}: ${oh.hours?.map(h => `${h.openHour}-${h.closeHour}`).join(', ') || 'N/A'}`);
    }
  }
  
  if (verbose) {
    console.log('\nFull response:');
    console.log(JSON.stringify(data, null, 2));
  }
  
  return cal;
}

// List appointments
async function listAppointments(calendarId, location, options, verbose) {
  const params = new URLSearchParams({
    locationId: location.id,
    calendarId: calendarId
  });
  
  if (options.startTime) params.append('startTime', options.startTime);
  if (options.endTime) params.append('endTime', options.endTime);
  if (options.status) params.append('status', options.status);
  
  const data = await apiRequest('GET', `/calendars/events?${params}`, location.key);
  
  const appointments = data.events || data.appointments || [];
  console.log(`Found ${appointments.length} appointments:\n`);
  
  for (const appt of appointments) {
    console.log(`- ${appt.title || 'Appointment'}`);
    console.log(`  ID: ${appt.id}`);
    console.log(`  Start: ${formatDate(appt.startTime)}`);
    console.log(`  End: ${formatDate(appt.endTime)}`);
    console.log(`  Status: ${appt.appointmentStatus || appt.status || 'N/A'}`);
    if (appt.contactId) console.log(`  Contact ID: ${appt.contactId}`);
    console.log('');
  }
  
  if (verbose) {
    console.log('\nFull response:');
    console.log(JSON.stringify(data, null, 2));
  }
  
  return appointments;
}

// Get appointment details
async function getAppointment(appointmentId, location, verbose) {
  const data = await apiRequest('GET', `/calendars/events/appointments/${appointmentId}`, location.key);
  
  const appt = data.event || data.appointment || data;
  console.log(`Appointment: ${appt.title || 'N/A'}`);
  console.log(`ID: ${appt.id}`);
  console.log(`Start: ${formatDate(appt.startTime)}`);
  console.log(`End: ${formatDate(appt.endTime)}`);
  console.log(`Status: ${appt.appointmentStatus || appt.status || 'N/A'}`);
  console.log(`Contact ID: ${appt.contactId || 'N/A'}`);
  console.log(`Calendar ID: ${appt.calendarId || 'N/A'}`);
  console.log(`Notes: ${appt.notes || 'N/A'}`);
  
  if (verbose) {
    console.log('\nFull response:');
    console.log(JSON.stringify(data, null, 2));
  }
  
  return appt;
}

// Get available slots
async function getSlots(calendarId, startDate, endDate, location, verbose) {
  const params = new URLSearchParams({
    calendarId: calendarId,
    startDate: startDate,
    endDate: endDate,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
  });
  
  const data = await apiRequest('GET', `/calendars/${calendarId}/free-slots?${params}`, location.key);
  
  const slots = data.slots || data;
  
  if (typeof slots === 'object' && !Array.isArray(slots)) {
    // Slots may be grouped by date
    console.log('Available slots:\n');
    for (const [date, times] of Object.entries(slots)) {
      if (Array.isArray(times) && times.length > 0) {
        console.log(`${date}:`);
        for (const time of times) {
          console.log(`  - ${time}`);
        }
        console.log('');
      }
    }
  } else if (Array.isArray(slots)) {
    console.log(`Found ${slots.length} available slots:\n`);
    for (const slot of slots) {
      console.log(`- ${formatDate(slot.startTime || slot)}`);
    }
  }
  
  if (verbose) {
    console.log('\nFull response:');
    console.log(JSON.stringify(data, null, 2));
  }
  
  return slots;
}

// Book appointment
async function bookAppointment(options, location, verbose, force = false) {
  const { calendarId, contactId, startTime, endTime, title, notes } = options;
  
  // Confirm booking
  const confirmed = await confirmDestructiveAction(
    'You are about to BOOK an appointment.',
    [
      `Calendar ID: ${calendarId}`,
      `Contact ID: ${contactId}`,
      `Start: ${startTime}`,
      `Title: ${title || '(default)'}`,
      '',
      'This will create a calendar appointment.'
    ],
    force
  );
  
  if (!confirmed) {
    process.exit(0);
  }
  
  const body = {
    calendarId: calendarId,
    locationId: location.id,
    contactId: contactId,
    startTime: startTime,
    endTime: endTime || null, // API calculates from slot duration if not provided
    title: title || 'Appointment',
    appointmentStatus: 'confirmed'
  };
  
  if (notes) body.notes = notes;
  
  const data = await apiRequest('POST', '/calendars/events/appointments', location.key, body);
  
  console.log('Appointment booked successfully!');
  console.log(`Appointment ID: ${data.id || data.event?.id || 'N/A'}`);
  console.log(`Start: ${formatDate(data.startTime || data.event?.startTime)}`);
  
  if (verbose) {
    console.log('\nFull response:');
    console.log(JSON.stringify(data, null, 2));
  }
  
  return data;
}

// Update appointment
async function updateAppointment(appointmentId, options, location, verbose) {
  const body = {};
  
  if (options.startTime) body.startTime = options.startTime;
  if (options.endTime) body.endTime = options.endTime;
  if (options.title) body.title = options.title;
  if (options.status) body.appointmentStatus = options.status;
  if (options.notes) body.notes = options.notes;
  
  const data = await apiRequest('PUT', `/calendars/events/appointments/${appointmentId}`, location.key, body);
  
  console.log(`Updated appointment: ${appointmentId}`);
  
  if (verbose) {
    console.log('\nFull response:');
    console.log(JSON.stringify(data, null, 2));
  }
  
  return data;
}

// Cancel appointment
async function cancelAppointment(appointmentId, location, verbose, force = false) {
  // Get appointment details for confirmation
  let apptInfo = appointmentId;
  try {
    const apptData = await apiRequest('GET', `/calendars/events/appointments/${appointmentId}`, location.key);
    const a = apptData.event || apptData.appointment || apptData;
    apptInfo = `${a.title || 'Appointment'} on ${formatDate(a.startTime)}`;
  } catch (e) {
    // Continue with ID only
  }
  
  const confirmed = await confirmDestructiveAction(
    'You are about to CANCEL an appointment.',
    [
      `Appointment: ${apptInfo}`,
      `ID: ${appointmentId}`,
      '',
      'This will cancel the appointment.',
      'The contact will be notified if notifications are enabled.'
    ],
    force
  );
  
  if (!confirmed) {
    process.exit(0);
  }
  
  // Cancel by updating status
  const data = await apiRequest('PUT', `/calendars/events/appointments/${appointmentId}`, location.key, {
    appointmentStatus: 'cancelled'
  });
  
  console.log(`Cancelled appointment: ${appointmentId}`);
  
  if (verbose) {
    console.log('\nFull response:');
    console.log(JSON.stringify(data, null, 2));
  }
  
  return data;
}

// Delete appointment (permanent)
async function deleteAppointment(appointmentId, location, verbose, force = false) {
  // Get appointment details for confirmation
  let apptInfo = appointmentId;
  try {
    const apptData = await apiRequest('GET', `/calendars/events/appointments/${appointmentId}`, location.key);
    const a = apptData.event || apptData.appointment || apptData;
    apptInfo = `${a.title || 'Appointment'} on ${formatDate(a.startTime)}`;
  } catch (e) {
    // Continue with ID only
  }
  
  const confirmed = await confirmDestructiveAction(
    'You are about to permanently DELETE an appointment.',
    [
      `Appointment: ${apptInfo}`,
      `ID: ${appointmentId}`,
      '',
      'This is PERMANENT and cannot be undone.',
      'Consider using "cancel" instead to preserve records.'
    ],
    force
  );
  
  if (!confirmed) {
    process.exit(0);
  }
  
  const data = await apiRequest('DELETE', `/calendars/events/appointments/${appointmentId}`, location.key);
  
  console.log(`Deleted appointment: ${appointmentId}`);
  
  if (verbose) {
    console.log('\nFull response:');
    console.log(JSON.stringify(data, null, 2));
  }
  
  return data;
}

// Main
async function main() {
  const args = parseArgs(process.argv.slice(2));
  const command = args._[0];
  const verbose = args.verbose || false;
  const locationsConfig = loadLocations();
  
  if (command === 'locations') {
    listLocations(locationsConfig);
    return;
  }
  
  try {
    switch (command) {
      case 'list': {
        const location = resolveLocation(args.location, locationsConfig);
        await listCalendars(location, verbose);
        break;
      }
      
      case 'get': {
        const location = resolveLocation(args.location, locationsConfig);
        const calendarId = args._[1];
        
        if (!calendarId) {
          console.error('Error: Calendar ID is required');
          console.error('Usage: node calendars.js get <calendar-id> --location "Name"');
          process.exit(1);
        }
        
        await getCalendar(calendarId, location, verbose);
        break;
      }
      
      case 'appointments': {
        const location = resolveLocation(args.location, locationsConfig);
        const calendarId = args['calendar-id'];
        
        if (!calendarId) {
          console.error('Error: --calendar-id is required');
          console.error('Usage: node calendars.js appointments --calendar-id <id> --location "Name"');
          process.exit(1);
        }
        
        await listAppointments(calendarId, location, {
          startTime: args.start || args['start-time'],
          endTime: args.end || args['end-time'],
          status: args.status
        }, verbose);
        break;
      }
      
      case 'appointment': {
        const location = resolveLocation(args.location, locationsConfig);
        const appointmentId = args._[1];
        
        if (!appointmentId) {
          console.error('Error: Appointment ID is required');
          console.error('Usage: node calendars.js appointment <appointment-id> --location "Name"');
          process.exit(1);
        }
        
        await getAppointment(appointmentId, location, verbose);
        break;
      }
      
      case 'slots': {
        const location = resolveLocation(args.location, locationsConfig);
        const calendarId = args['calendar-id'];
        const startDate = args.start || args['start-date'];
        const endDate = args.end || args['end-date'];
        
        if (!calendarId || !startDate || !endDate) {
          console.error('Error: --calendar-id, --start, and --end are required');
          console.error('Usage: node calendars.js slots --calendar-id <id> --start "2024-01-01" --end "2024-01-07" --location "Name"');
          process.exit(1);
        }
        
        await getSlots(calendarId, startDate, endDate, location, verbose);
        break;
      }
      
      case 'book': {
        const location = resolveLocation(args.location, locationsConfig);
        
        if (!args['calendar-id'] || !args['contact-id'] || !args.start) {
          console.error('Error: --calendar-id, --contact-id, and --start are required');
          console.error('Usage: node calendars.js book --calendar-id <id> --contact-id <id> --start "2024-01-15T10:00:00" --location "Name"');
          process.exit(1);
        }
        
        await bookAppointment({
          calendarId: args['calendar-id'],
          contactId: args['contact-id'],
          startTime: args.start || args['start-time'],
          endTime: args.end || args['end-time'],
          title: args.title,
          notes: args.notes
        }, location, verbose, args.force);
        break;
      }
      
      case 'update': {
        const location = resolveLocation(args.location, locationsConfig);
        const appointmentId = args._[1];
        
        if (!appointmentId) {
          console.error('Error: Appointment ID is required');
          console.error('Usage: node calendars.js update <appointment-id> [--start "datetime"] [--status "confirmed"] --location "Name"');
          process.exit(1);
        }
        
        await updateAppointment(appointmentId, {
          startTime: args.start || args['start-time'],
          endTime: args.end || args['end-time'],
          title: args.title,
          status: args.status,
          notes: args.notes
        }, location, verbose);
        break;
      }
      
      case 'cancel': {
        const location = resolveLocation(args.location, locationsConfig);
        const appointmentId = args._[1];
        
        if (!appointmentId) {
          console.error('Error: Appointment ID is required');
          console.error('Usage: node calendars.js cancel <appointment-id> --location "Name"');
          process.exit(1);
        }
        
        await cancelAppointment(appointmentId, location, verbose, args.force);
        break;
      }
      
      case 'delete': {
        const location = resolveLocation(args.location, locationsConfig);
        const appointmentId = args._[1];
        
        if (!appointmentId) {
          console.error('Error: Appointment ID is required');
          console.error('Usage: node calendars.js delete <appointment-id> --location "Name"');
          process.exit(1);
        }
        
        await deleteAppointment(appointmentId, location, verbose, args.force);
        break;
      }
      
      default:
        console.log('Go High Level Calendars Script');
        console.log('');
        console.log('Commands:');
        console.log('  list --location "Name"                List all calendars');
        console.log('  get <calendar-id> --location          Get calendar details');
        console.log('  appointments --calendar-id <id>       List appointments');
        console.log('  appointment <appointment-id>          Get appointment details');
        console.log('  slots --calendar-id <id> --start --end  Get available slots');
        console.log('  book --calendar-id <id> --contact-id  Book an appointment');
        console.log('  update <appointment-id> [options]     Update an appointment');
        console.log('  cancel <appointment-id>               Cancel an appointment');
        console.log('  delete <appointment-id>               Permanently delete appointment');
        console.log('  locations                             List available locations');
        console.log('');
        console.log('Location Options:');
        console.log('  --location "Name"             Specify which GHL account to use');
        console.log('');
        console.log('List Appointments Options:');
        console.log('  --calendar-id <id>            Calendar ID (required)');
        console.log('  --start "2024-01-01"          Start date filter');
        console.log('  --end "2024-01-31"            End date filter');
        console.log('  --status "confirmed"          Status filter');
        console.log('');
        console.log('Book Options:');
        console.log('  --calendar-id <id>            Calendar ID (required)');
        console.log('  --contact-id <id>             Contact ID (required)');
        console.log('  --start "2024-01-15T10:00"    Start time (required)');
        console.log('  --end "2024-01-15T11:00"      End time (optional, uses slot duration)');
        console.log('  --title "Meeting"             Appointment title');
        console.log('  --notes "Notes here"          Appointment notes');
        console.log('');
        console.log('Update Options:');
        console.log('  --start "datetime"            New start time');
        console.log('  --end "datetime"              New end time');
        console.log('  --status "confirmed"          Status: confirmed, cancelled, showed, noshow');
        console.log('  --title "New title"           New title');
        console.log('  --notes "New notes"           New notes');
        console.log('');
        console.log('Global Options:');
        console.log('  --verbose                     Show full API responses');
        console.log('  --force                       Skip confirmation for destructive actions');
        process.exit(0);
    }
  } catch (error) {
    console.error('Error:', error.message);
    if (error.status) {
      console.error('Status:', error.status);
    }
    if (verbose && error.data) {
      console.error('Details:', JSON.stringify(error.data, null, 2));
    }
    process.exit(1);
  }
}

main();
