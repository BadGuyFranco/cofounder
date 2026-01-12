#!/usr/bin/env node

/**
 * Meetup Events Script
 * Manage and query Meetup events.
 */

import { fileURLToPath } from 'url';
import path from 'path';
import {
  loadEnv, getToken, parseArgs, handleError, showHelp, graphqlRequest, 
  formatDate, confirmDestructiveAction
} from './utils.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
loadEnv(path.join(__dirname, '..'));

// Help documentation
function printHelp() {
  showHelp('Meetup Events', {
    'Commands': [
      'upcoming <urlname>          List upcoming events for a group',
      'past <urlname>              List past events for a group',
      'get <eventId>               Get event details by ID',
      'rsvps <eventId>             List RSVPs for an event',
      'create <urlname>            Create a new event (interactive)',
      'update <eventId>            Update an event',
      'delete <eventId>            Delete an event',
      'help                        Show this help'
    ],
    'Options': [
      '--limit <n>                 Number of results (default: 20)',
      '--title <text>              Event title (for create/update)',
      '--description <text>        Event description',
      '--start <datetime>          Start time (ISO 8601 format)',
      '--duration <minutes>        Duration in minutes',
      '--venue <name>              Venue name',
      '--online                    Mark as online event',
      '--force                     Skip confirmation for destructive actions',
      '--verbose                   Show full responses'
    ],
    'Examples': [
      'node events.js upcoming ai-first-principles-chicago',
      'node events.js past ai-first-principles-chicago --limit 10',
      'node events.js get 123456789',
      'node events.js rsvps 123456789',
      'node events.js create ai-first-principles-chicago --title "Monthly Meetup"',
      'node events.js delete 123456789'
    ]
  });
}

// List upcoming events
async function listUpcoming(urlname, args) {
  const token = getToken();
  const limit = parseInt(args.limit) || 20;
  
  const query = `
    query GetUpcomingEvents($urlname: String!, $first: Int) {
      groupByUrlname(urlname: $urlname) {
        id
        name
        upcomingEvents(input: { first: $first }) {
          count
          edges {
            node {
              id
              title
              description
              dateTime
              endTime
              duration
              eventUrl
              going
              waiting
              isOnline
              venue {
                name
                address
                city
                state
              }
              host {
                id
                name
              }
            }
          }
        }
      }
    }
  `;
  
  const data = await graphqlRequest(query, { urlname, first: limit }, token);
  const g = data.groupByUrlname;
  
  if (!g) {
    console.error(`Error: Group "${urlname}" not found.`);
    process.exit(1);
  }
  
  if (args.verbose) {
    console.log(JSON.stringify(data, null, 2));
    return;
  }
  
  console.log(`\nUpcoming Events for ${g.name} (${g.upcomingEvents.count} total)\n`);
  console.log('-'.repeat(70));
  
  if (g.upcomingEvents.edges.length === 0) {
    console.log('No upcoming events.');
    return;
  }
  
  for (const { node } of g.upcomingEvents.edges) {
    console.log(`\n${node.title}`);
    console.log(`  ID: ${node.id}`);
    console.log(`  Date: ${formatDate(node.dateTime)}`);
    console.log(`  Duration: ${node.duration ? Math.round(node.duration / 60000) + ' minutes' : 'N/A'}`);
    console.log(`  RSVPs: ${node.going} going${node.waiting ? `, ${node.waiting} waiting` : ''}`);
    console.log(`  Type: ${node.isOnline ? 'Online' : 'In-person'}`);
    if (node.venue) {
      console.log(`  Venue: ${node.venue.name}${node.venue.city ? `, ${node.venue.city}` : ''}`);
    }
    console.log(`  URL: ${node.eventUrl}`);
  }
}

// List past events
async function listPast(urlname, args) {
  const token = getToken();
  const limit = parseInt(args.limit) || 20;
  
  const query = `
    query GetPastEvents($urlname: String!, $first: Int) {
      groupByUrlname(urlname: $urlname) {
        id
        name
        pastEvents(input: { first: $first }) {
          count
          edges {
            node {
              id
              title
              dateTime
              going
              isOnline
              venue {
                name
                city
              }
            }
          }
        }
      }
    }
  `;
  
  const data = await graphqlRequest(query, { urlname, first: limit }, token);
  const g = data.groupByUrlname;
  
  if (!g) {
    console.error(`Error: Group "${urlname}" not found.`);
    process.exit(1);
  }
  
  if (args.verbose) {
    console.log(JSON.stringify(data, null, 2));
    return;
  }
  
  console.log(`\nPast Events for ${g.name} (${g.pastEvents.count} total)\n`);
  console.log('-'.repeat(70));
  
  if (g.pastEvents.edges.length === 0) {
    console.log('No past events.');
    return;
  }
  
  for (const { node } of g.pastEvents.edges) {
    const venue = node.venue ? ` @ ${node.venue.name}` : '';
    const type = node.isOnline ? ' [Online]' : '';
    console.log(`${formatDate(node.dateTime)} - ${node.title}${type}${venue}`);
    console.log(`  ID: ${node.id} | Attended: ${node.going}`);
  }
}

// Get event details
async function getEvent(eventId, args) {
  const token = getToken();
  
  const query = `
    query GetEvent($eventId: ID!) {
      event(id: $eventId) {
        id
        title
        description
        dateTime
        endTime
        duration
        eventUrl
        going
        waiting
        maxTickets
        isOnline
        eventType
        status
        venue {
          name
          address
          city
          state
          country
          postalCode
          lat
          lng
        }
        host {
          id
          name
        }
        group {
          id
          name
          urlname
        }
        rsvps(input: { first: 10 }) {
          count
        }
      }
    }
  `;
  
  const data = await graphqlRequest(query, { eventId }, token);
  const e = data.event;
  
  if (!e) {
    console.error(`Error: Event "${eventId}" not found.`);
    process.exit(1);
  }
  
  if (args.verbose) {
    console.log(JSON.stringify(data, null, 2));
    return;
  }
  
  console.log(`\n${e.title}`);
  console.log('='.repeat(e.title.length));
  console.log(`\nID: ${e.id}`);
  console.log(`Group: ${e.group.name} (${e.group.urlname})`);
  console.log(`Status: ${e.status || 'Active'}`);
  console.log(`Type: ${e.isOnline ? 'Online' : 'In-person'}`);
  console.log(`\nDate: ${formatDate(e.dateTime)}`);
  if (e.endTime) {
    console.log(`End: ${formatDate(e.endTime)}`);
  }
  console.log(`Duration: ${e.duration ? Math.round(e.duration / 60000) + ' minutes' : 'N/A'}`);
  
  console.log(`\nRSVPs: ${e.going} going${e.waiting ? `, ${e.waiting} waiting` : ''}`);
  if (e.maxTickets) {
    console.log(`Capacity: ${e.maxTickets}`);
  }
  console.log(`Total RSVPs: ${e.rsvps.count}`);
  
  if (e.venue) {
    console.log(`\nVenue: ${e.venue.name}`);
    if (e.venue.address) {
      console.log(`Address: ${e.venue.address}`);
      console.log(`         ${e.venue.city}, ${e.venue.state} ${e.venue.postalCode}`);
    }
  }
  
  console.log(`\nHost: ${e.host.name}`);
  console.log(`URL: ${e.eventUrl}`);
  
  if (e.description) {
    console.log(`\nDescription:\n${e.description.substring(0, 500)}${e.description.length > 500 ? '...' : ''}`);
  }
}

// List RSVPs for an event
async function listRsvps(eventId, args) {
  const token = getToken();
  const limit = parseInt(args.limit) || 50;
  
  const query = `
    query GetEventRsvps($eventId: ID!, $first: Int) {
      event(id: $eventId) {
        id
        title
        dateTime
        going
        waiting
        rsvps(input: { first: $first }) {
          count
          edges {
            node {
              id
              response
              guestsCount
              member {
                id
                name
                city
                state
              }
            }
          }
        }
      }
    }
  `;
  
  const data = await graphqlRequest(query, { eventId, first: limit }, token);
  const e = data.event;
  
  if (!e) {
    console.error(`Error: Event "${eventId}" not found.`);
    process.exit(1);
  }
  
  if (args.verbose) {
    console.log(JSON.stringify(data, null, 2));
    return;
  }
  
  console.log(`\nRSVPs for: ${e.title}`);
  console.log(`Date: ${formatDate(e.dateTime)}`);
  console.log(`\nTotal: ${e.rsvps.count} RSVPs (${e.going} going${e.waiting ? `, ${e.waiting} waiting` : ''})\n`);
  console.log('-'.repeat(60));
  
  const yes = e.rsvps.edges.filter(r => r.node.response === 'YES');
  const waitlist = e.rsvps.edges.filter(r => r.node.response === 'WAITLIST');
  
  if (yes.length > 0) {
    console.log('\nGoing:');
    for (const { node } of yes) {
      const guests = node.guestsCount > 0 ? ` (+${node.guestsCount} guests)` : '';
      const location = node.member.city ? ` - ${node.member.city}` : '';
      console.log(`  ${node.member.name}${guests}${location}`);
    }
  }
  
  if (waitlist.length > 0) {
    console.log('\nWaitlist:');
    for (const { node } of waitlist) {
      console.log(`  ${node.member.name}`);
    }
  }
}

// Create a new event
async function createEvent(urlname, args) {
  const token = getToken();
  
  if (!args.title) {
    console.error('Error: --title is required');
    console.error('Usage: node events.js create <urlname> --title "Event Title" --start "2025-02-01T18:00:00"');
    process.exit(1);
  }
  
  if (!args.start) {
    console.error('Error: --start is required (ISO 8601 format)');
    console.error('Example: --start "2025-02-01T18:00:00"');
    process.exit(1);
  }
  
  // First get the group ID
  const groupQuery = `
    query GetGroupId($urlname: String!) {
      groupByUrlname(urlname: $urlname) {
        id
        name
        timezone
      }
    }
  `;
  
  const groupData = await graphqlRequest(groupQuery, { urlname }, token);
  const group = groupData.groupByUrlname;
  
  if (!group) {
    console.error(`Error: Group "${urlname}" not found.`);
    process.exit(1);
  }
  
  const mutation = `
    mutation CreateEvent($input: CreateEventInput!) {
      createEvent(input: $input) {
        event {
          id
          title
          dateTime
          eventUrl
        }
        errors {
          message
          code
          field
        }
      }
    }
  `;
  
  const input = {
    groupUrlname: urlname,
    title: args.title,
    startDateTime: args.start,
    description: args.description || '',
    duration: args.duration ? `PT${args.duration}M` : 'PT120M', // Default 2 hours
    publishStatus: 'DRAFT' // Start as draft
  };
  
  if (args.online) {
    input.eventType = 'ONLINE';
  }
  
  console.log(`\nCreating event in ${group.name}...`);
  console.log(`Title: ${args.title}`);
  console.log(`Start: ${args.start}`);
  
  const data = await graphqlRequest(mutation, { input }, token);
  
  if (data.createEvent.errors && data.createEvent.errors.length > 0) {
    console.error('\nErrors:');
    for (const err of data.createEvent.errors) {
      console.error(`  ${err.field}: ${err.message}`);
    }
    process.exit(1);
  }
  
  const e = data.createEvent.event;
  console.log(`\n[OK] Event created!`);
  console.log(`ID: ${e.id}`);
  console.log(`URL: ${e.eventUrl}`);
  console.log(`\nNote: Event is created as DRAFT. Publish it on Meetup to make it visible.`);
}

// Update an event
async function updateEvent(eventId, args) {
  const token = getToken();
  
  const mutation = `
    mutation UpdateEvent($input: EditEventInput!) {
      editEvent(input: $input) {
        event {
          id
          title
          dateTime
          eventUrl
        }
        errors {
          message
          code
          field
        }
      }
    }
  `;
  
  const input = {
    eventId: eventId
  };
  
  if (args.title) input.title = args.title;
  if (args.description) input.description = args.description;
  if (args.start) input.startDateTime = args.start;
  if (args.duration) input.duration = `PT${args.duration}M`;
  
  if (Object.keys(input).length === 1) {
    console.error('Error: No update fields provided');
    console.error('Use --title, --description, --start, or --duration');
    process.exit(1);
  }
  
  console.log(`\nUpdating event ${eventId}...`);
  
  const data = await graphqlRequest(mutation, { input }, token);
  
  if (data.editEvent.errors && data.editEvent.errors.length > 0) {
    console.error('\nErrors:');
    for (const err of data.editEvent.errors) {
      console.error(`  ${err.field}: ${err.message}`);
    }
    process.exit(1);
  }
  
  const e = data.editEvent.event;
  console.log(`\n[OK] Event updated!`);
  console.log(`Title: ${e.title}`);
  console.log(`Date: ${formatDate(e.dateTime)}`);
  console.log(`URL: ${e.eventUrl}`);
}

// Delete an event
async function deleteEvent(eventId, args) {
  const token = getToken();
  
  // First get event details
  const query = `
    query GetEvent($eventId: ID!) {
      event(id: $eventId) {
        id
        title
        dateTime
        group {
          name
        }
      }
    }
  `;
  
  const eventData = await graphqlRequest(query, { eventId }, token);
  const e = eventData.event;
  
  if (!e) {
    console.error(`Error: Event "${eventId}" not found.`);
    process.exit(1);
  }
  
  const confirmed = await confirmDestructiveAction(
    `Delete event: ${e.title}`,
    [
      `Group: ${e.group.name}`,
      `Date: ${formatDate(e.dateTime)}`,
      `Event ID: ${e.id}`
    ],
    args.force
  );
  
  if (!confirmed) return;
  
  const mutation = `
    mutation DeleteEvent($input: DeleteEventInput!) {
      deleteEvent(input: $input) {
        success
        errors {
          message
          code
        }
      }
    }
  `;
  
  const data = await graphqlRequest(mutation, { input: { eventId } }, token);
  
  if (data.deleteEvent.errors && data.deleteEvent.errors.length > 0) {
    console.error('\nErrors:');
    for (const err of data.deleteEvent.errors) {
      console.error(`  ${err.message}`);
    }
    process.exit(1);
  }
  
  if (data.deleteEvent.success) {
    console.log(`\n[OK] Event deleted: ${e.title}`);
  } else {
    console.error('\nFailed to delete event');
    process.exit(1);
  }
}

// Main
async function main() {
  const args = parseArgs(process.argv.slice(2));
  const command = args._[0];
  
  try {
    switch (command) {
      case 'upcoming':
        if (!args._[1]) {
          console.error('Error: Group URL name required');
          console.error('Usage: node events.js upcoming <urlname>');
          process.exit(1);
        }
        await listUpcoming(args._[1], args);
        break;
      case 'past':
        if (!args._[1]) {
          console.error('Error: Group URL name required');
          console.error('Usage: node events.js past <urlname>');
          process.exit(1);
        }
        await listPast(args._[1], args);
        break;
      case 'get':
        if (!args._[1]) {
          console.error('Error: Event ID required');
          console.error('Usage: node events.js get <eventId>');
          process.exit(1);
        }
        await getEvent(args._[1], args);
        break;
      case 'rsvps':
        if (!args._[1]) {
          console.error('Error: Event ID required');
          console.error('Usage: node events.js rsvps <eventId>');
          process.exit(1);
        }
        await listRsvps(args._[1], args);
        break;
      case 'create':
        if (!args._[1]) {
          console.error('Error: Group URL name required');
          console.error('Usage: node events.js create <urlname> --title "Title" --start "2025-02-01T18:00:00"');
          process.exit(1);
        }
        await createEvent(args._[1], args);
        break;
      case 'update':
        if (!args._[1]) {
          console.error('Error: Event ID required');
          console.error('Usage: node events.js update <eventId> --title "New Title"');
          process.exit(1);
        }
        await updateEvent(args._[1], args);
        break;
      case 'delete':
        if (!args._[1]) {
          console.error('Error: Event ID required');
          console.error('Usage: node events.js delete <eventId>');
          process.exit(1);
        }
        await deleteEvent(args._[1], args);
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
