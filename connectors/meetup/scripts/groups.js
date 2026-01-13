#!/usr/bin/env node

/**
 * Meetup Groups Script
 * Manage and query Meetup groups.
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
  showHelp('Meetup Groups', {
    'Commands': [
      'list                        List groups you organize',
      'get <urlname>               Get group details by URL name',
      'members <urlname>           List group members',
      'stats <urlname>             Get group statistics',
      'help                        Show this help'
    ],
    'Options': [
      '--limit <n>                 Number of results (default: 20)',
      '--verbose                   Show full responses'
    ],
    'Examples': [
      'node groups.js list',
      'node groups.js get ai-first-principles-chicago',
      'node groups.js members ai-first-principles-chicago --limit 50',
      'node groups.js stats ai-first-principles-chicago'
    ],
    'Notes': [
      'URL name is the part after meetup.com/ in the group URL.',
      'Example: meetup.com/ai-first-principles-chicago -> ai-first-principles-chicago'
    ]
  });
}

// List groups user organizes
async function listGroups(args) {
  const token = getToken();
  const limit = parseInt(args.limit) || 20;
  
  const query = `
    query GetMyGroups($first: Int) {
      self {
        id
        name
        memberships(input: { first: $first }) {
          edges {
            node {
              id
              group {
                id
                name
                urlname
                city
                state
                country
                memberships {
                  count
                }
                isOrganizer
                link
              }
            }
          }
        }
      }
    }
  `;
  
  const data = await graphqlRequest(query, { first: limit }, token);
  
  if (args.verbose) {
    console.log(JSON.stringify(data, null, 2));
    return;
  }
  
  console.log(`\nGroups for ${data.self.name}:\n`);
  
  const memberships = data.self.memberships.edges;
  const organized = memberships.filter(m => m.node.group.isOrganizer);
  const member = memberships.filter(m => !m.node.group.isOrganizer);
  
  if (organized.length > 0) {
    console.log('Groups You Organize:');
    console.log('-'.repeat(60));
    for (const { node } of organized) {
      const g = node.group;
      console.log(`  ${g.name}`);
      console.log(`    URL: ${g.urlname}`);
      console.log(`    Location: ${g.city}, ${g.state || g.country}`);
      console.log(`    Members: ${g.memberships.count}`);
      console.log('');
    }
  }
  
  if (member.length > 0) {
    console.log('\nGroups You Belong To:');
    console.log('-'.repeat(60));
    for (const { node } of member) {
      const g = node.group;
      console.log(`  ${g.name} (${g.urlname})`);
    }
  }
  
  console.log(`\nTotal: ${organized.length} organized, ${member.length} member`);
}

// Get group details
async function getGroup(urlname, args) {
  const token = getToken();
  
  const query = `
    query GetGroup($urlname: String!) {
      groupByUrlname(urlname: $urlname) {
        id
        name
        urlname
        description
        city
        state
        country
        timezone
        link
        isOrganizer
        isPrivate
        foundedDate
        memberships {
          count
        }
        organizer {
          id
          name
        }
        topics {
          edges {
            node {
              id
              name
            }
          }
        }
        upcomingEvents(input: { first: 5 }) {
          count
          edges {
            node {
              id
              title
              dateTime
            }
          }
        }
        pastEvents(input: { first: 5 }) {
          count
        }
      }
    }
  `;
  
  const data = await graphqlRequest(query, { urlname }, token);
  const g = data.groupByUrlname;
  
  if (!g) {
    console.error(`Error: Group "${urlname}" not found.`);
    process.exit(1);
  }
  
  if (args.verbose) {
    console.log(JSON.stringify(data, null, 2));
    return;
  }
  
  console.log(`\n${g.name}`);
  console.log('='.repeat(g.name.length));
  console.log(`\nURL: ${g.link}`);
  console.log(`URL Name: ${g.urlname}`);
  console.log(`Location: ${g.city}, ${g.state || g.country}`);
  console.log(`Timezone: ${g.timezone}`);
  console.log(`Founded: ${formatDate(g.foundedDate)}`);
  console.log(`Members: ${g.memberships.count}`);
  console.log(`Private: ${g.isPrivate ? 'Yes' : 'No'}`);
  console.log(`You are organizer: ${g.isOrganizer ? 'Yes' : 'No'}`);
  console.log(`Organizer: ${g.organizer.name}`);
  
  if (g.topics.edges.length > 0) {
    console.log(`\nTopics: ${g.topics.edges.map(e => e.node.name).join(', ')}`);
  }
  
  console.log(`\nUpcoming Events: ${g.upcomingEvents.count}`);
  if (g.upcomingEvents.edges.length > 0) {
    for (const { node } of g.upcomingEvents.edges) {
      console.log(`  - ${node.title} (${formatDate(node.dateTime)})`);
    }
  }
  
  console.log(`\nPast Events: ${g.pastEvents.count}`);
  
  if (g.description) {
    console.log(`\nDescription:\n${g.description.substring(0, 500)}${g.description.length > 500 ? '...' : ''}`);
  }
}

// List group members
async function listMembers(urlname, args) {
  const token = getToken();
  const limit = parseInt(args.limit) || 20;
  
  const query = `
    query GetGroupMembers($urlname: String!, $first: Int) {
      groupByUrlname(urlname: $urlname) {
        id
        name
        memberships(input: { first: $first }) {
          count
          edges {
            node {
              id
              status
              role
              joinedDate
              member {
                id
                name
                city
                state
                country
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
  
  console.log(`\nMembers of ${g.name} (${g.memberships.count} total)\n`);
  console.log('-'.repeat(70));
  
  for (const { node } of g.memberships.edges) {
    const m = node.member;
    const role = node.role ? ` [${node.role}]` : '';
    const location = m.city ? ` - ${m.city}, ${m.state || m.country}` : '';
    console.log(`${m.name}${role}${location}`);
    console.log(`  ID: ${m.id} | Joined: ${formatDate(node.joinedDate)}`);
  }
  
  if (g.memberships.count > limit) {
    console.log(`\n... and ${g.memberships.count - limit} more members`);
  }
}

// Get group statistics
async function getStats(urlname, args) {
  const token = getToken();
  
  const query = `
    query GetGroupStats($urlname: String!) {
      groupByUrlname(urlname: $urlname) {
        id
        name
        memberships {
          count
        }
        upcomingEvents(input: { first: 1 }) {
          count
        }
        pastEvents(input: { first: 1 }) {
          count
        }
        foundedDate
      }
    }
  `;
  
  const data = await graphqlRequest(query, { urlname }, token);
  const g = data.groupByUrlname;
  
  if (!g) {
    console.error(`Error: Group "${urlname}" not found.`);
    process.exit(1);
  }
  
  if (args.verbose) {
    console.log(JSON.stringify(data, null, 2));
    return;
  }
  
  console.log(`\nStatistics for ${g.name}\n`);
  console.log('-'.repeat(40));
  console.log(`Members: ${g.memberships.count}`);
  console.log(`Upcoming Events: ${g.upcomingEvents.count}`);
  console.log(`Past Events: ${g.pastEvents.count}`);
  console.log(`Founded: ${formatDate(g.foundedDate)}`);
}

// Main
async function main() {
  const args = parseArgs(process.argv.slice(2));
  const command = args._[0];
  
  try {
    switch (command) {
      case 'list':
        await listGroups(args);
        break;
      case 'get':
        if (!args._[1]) {
          console.error('Error: Group URL name required');
          console.error('Usage: node groups.js get <urlname>');
          process.exit(1);
        }
        await getGroup(args._[1], args);
        break;
      case 'members':
        if (!args._[1]) {
          console.error('Error: Group URL name required');
          console.error('Usage: node groups.js members <urlname>');
          process.exit(1);
        }
        await listMembers(args._[1], args);
        break;
      case 'stats':
        if (!args._[1]) {
          console.error('Error: Group URL name required');
          console.error('Usage: node groups.js stats <urlname>');
          process.exit(1);
        }
        await getStats(args._[1], args);
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
