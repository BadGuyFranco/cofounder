#!/usr/bin/env node

/**
 * Meetup RSVPs Script
 * Manage event RSVPs and attendance.
 */

import { fileURLToPath } from 'url';
import path from 'path';
import {
  loadEnv, getToken, parseArgs, handleError, showHelp, graphqlRequest, formatDate
} from './utils.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
loadEnv(path.join(__dirname, '..'));

// Help documentation
function printHelp() {
  showHelp('Meetup RSVPs', {
    'Commands': [
      'list <eventId>              List all RSVPs for an event',
      'yes <eventId>               RSVP Yes to an event',
      'no <eventId>                RSVP No to an event',
      'help                        Show this help'
    ],
    'Options': [
      '--limit <n>                 Number of results (default: 100)',
      '--guests <n>                Number of guests (for yes)',
      '--verbose                   Show full responses'
    ],
    'Examples': [
      'node rsvps.js list 123456789',
      'node rsvps.js yes 123456789',
      'node rsvps.js yes 123456789 --guests 2',
      'node rsvps.js no 123456789'
    ]
  });
}

// List RSVPs for an event
async function listRsvps(eventId, args) {
  const token = getToken();
  const limit = parseInt(args.limit) || 100;
  
  const query = `
    query GetEventRsvps($eventId: ID!, $first: Int) {
      event(id: $eventId) {
        id
        title
        dateTime
        going
        waiting
        maxTickets
        rsvps(input: { first: $first }) {
          count
          edges {
            node {
              id
              response
              guestsCount
              updatedAt
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
  console.log(`\nSummary:`);
  console.log(`  Going: ${e.going}`);
  if (e.waiting) console.log(`  Waitlist: ${e.waiting}`);
  if (e.maxTickets) console.log(`  Capacity: ${e.maxTickets}`);
  console.log(`  Total RSVPs: ${e.rsvps.count}`);
  
  const yes = e.rsvps.edges.filter(r => r.node.response === 'YES');
  const waitlist = e.rsvps.edges.filter(r => r.node.response === 'WAITLIST');
  const no = e.rsvps.edges.filter(r => r.node.response === 'NO');
  
  if (yes.length > 0) {
    console.log(`\n--- Going (${yes.length}) ---`);
    for (const { node } of yes) {
      const guests = node.guestsCount > 0 ? ` (+${node.guestsCount} guests)` : '';
      const location = node.member.city ? ` - ${node.member.city}` : '';
      console.log(`  ${node.member.name}${guests}${location}`);
    }
  }
  
  if (waitlist.length > 0) {
    console.log(`\n--- Waitlist (${waitlist.length}) ---`);
    for (const { node } of waitlist) {
      console.log(`  ${node.member.name}`);
    }
  }
  
  if (no.length > 0 && args.verbose) {
    console.log(`\n--- Not Going (${no.length}) ---`);
    for (const { node } of no) {
      console.log(`  ${node.member.name}`);
    }
  }
}

// RSVP Yes to an event
async function rsvpYes(eventId, args) {
  const token = getToken();
  const guests = parseInt(args.guests) || 0;
  
  const mutation = `
    mutation RsvpToEvent($input: RsvpInput!) {
      rsvp(input: $input) {
        rsvp {
          id
          response
          guestsCount
          event {
            id
            title
            dateTime
          }
        }
        errors {
          message
          code
        }
      }
    }
  `;
  
  const input = {
    eventId: eventId,
    response: 'YES',
    guestsCount: guests
  };
  
  console.log(`\nRSVP'ing Yes to event ${eventId}${guests > 0 ? ` with ${guests} guest(s)` : ''}...`);
  
  const data = await graphqlRequest(mutation, { input }, token);
  
  if (data.rsvp.errors && data.rsvp.errors.length > 0) {
    console.error('\nErrors:');
    for (const err of data.rsvp.errors) {
      console.error(`  ${err.message}`);
    }
    process.exit(1);
  }
  
  const r = data.rsvp.rsvp;
  console.log(`\n[OK] RSVP confirmed!`);
  console.log(`Event: ${r.event.title}`);
  console.log(`Date: ${formatDate(r.event.dateTime)}`);
  console.log(`Response: ${r.response}`);
  if (r.guestsCount > 0) {
    console.log(`Guests: ${r.guestsCount}`);
  }
}

// RSVP No to an event
async function rsvpNo(eventId, args) {
  const token = getToken();
  
  const mutation = `
    mutation RsvpToEvent($input: RsvpInput!) {
      rsvp(input: $input) {
        rsvp {
          id
          response
          event {
            id
            title
            dateTime
          }
        }
        errors {
          message
          code
        }
      }
    }
  `;
  
  const input = {
    eventId: eventId,
    response: 'NO'
  };
  
  console.log(`\nRSVP'ing No to event ${eventId}...`);
  
  const data = await graphqlRequest(mutation, { input }, token);
  
  if (data.rsvp.errors && data.rsvp.errors.length > 0) {
    console.error('\nErrors:');
    for (const err of data.rsvp.errors) {
      console.error(`  ${err.message}`);
    }
    process.exit(1);
  }
  
  const r = data.rsvp.rsvp;
  console.log(`\n[OK] RSVP updated.`);
  console.log(`Event: ${r.event.title}`);
  console.log(`Response: ${r.response}`);
}

// Main
async function main() {
  const args = parseArgs(process.argv.slice(2));
  const command = args._[0];
  
  try {
    switch (command) {
      case 'list':
        if (!args._[1]) {
          console.error('Error: Event ID required');
          console.error('Usage: node rsvps.js list <eventId>');
          process.exit(1);
        }
        await listRsvps(args._[1], args);
        break;
      case 'yes':
        if (!args._[1]) {
          console.error('Error: Event ID required');
          console.error('Usage: node rsvps.js yes <eventId>');
          process.exit(1);
        }
        await rsvpYes(args._[1], args);
        break;
      case 'no':
        if (!args._[1]) {
          console.error('Error: Event ID required');
          console.error('Usage: node rsvps.js no <eventId>');
          process.exit(1);
        }
        await rsvpNo(args._[1], args);
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
