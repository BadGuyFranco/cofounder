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
  
  // First get Pro Networks the user administers
  const proQuery = `
    query GetMyProNetworks {
      self {
        id
        name
        organizedGroupCount
        isOrganizer
        adminProNetworks {
          id
          name
          urlname
        }
      }
    }
  `;
  
  const proData = await graphqlRequest(proQuery, {}, token);
  
  if (args.verbose) {
    console.log(JSON.stringify(proData, null, 2));
  }
  
  console.log(`\nGroups for ${proData.self.name}:\n`);
  console.log(`You organize ${proData.self.organizedGroupCount} group(s)\n`);
  
  // Get groups from each Pro Network
  const networks = proData.self.adminProNetworks || [];
  
  if (networks.length > 0) {
    for (const network of networks) {
      const networkQuery = `
        query GetProNetworkGroups($urlname: ID!) {
          proNetwork(urlname: $urlname) {
            id
            name
            groupsSearch(input: { first: 50 }) {
              edges {
                node {
                  id
                  name
                  urlname
                  city
                  state
                  country
                  link
                }
              }
            }
          }
        }
      `;
      
      const networkData = await graphqlRequest(networkQuery, { urlname: network.urlname }, token);
      
      if (args.verbose) {
        console.log(JSON.stringify(networkData, null, 2));
      }
      
      const groups = networkData.proNetwork.groupsSearch.edges;
      
      console.log(`Pro Network: ${network.name}`);
      console.log('-'.repeat(60));
      
      for (const { node: g } of groups) {
        console.log(`  ${g.name}`);
        console.log(`    URL: ${g.urlname}`);
        console.log(`    Location: ${g.city}, ${g.state || g.country}`);
        console.log('');
      }
    }
  } else {
    console.log('No Pro Networks found. You may organize individual groups outside of a Pro Network.');
  }
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
        isPrimaryOrganizer
        isMember
        isPrivate
        foundedDate
        stats {
          memberCounts {
            all
          }
        }
        organizer {
          id
          name
        }
        events {
          edges {
            node {
              id
              title
              dateTime
            }
          }
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
  console.log(`Members: ${g.stats?.memberCounts?.all || 'N/A'}`);
  console.log(`Private: ${g.isPrivate ? 'Yes' : 'No'}`);
  console.log(`You are primary organizer: ${g.isPrimaryOrganizer ? 'Yes' : 'No'}`);
  console.log(`You are member: ${g.isMember ? 'Yes' : 'No'}`);
  console.log(`Organizer: ${g.organizer?.name || 'N/A'}`);
  
  console.log(`\nUpcoming Events:`);
  if (g.events.edges.length > 0) {
    for (const { node } of g.events.edges) {
      console.log(`  - ${node.title} (${formatDate(node.dateTime)})`);
    }
  } else {
    console.log('  None scheduled');
  }
  
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
