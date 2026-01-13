#!/usr/bin/env node

/**
 * Make.com Teams Script
 * List teams and organizations to find team IDs for other operations.
 * 
 * Usage:
 *   node teams.js list
 *   node teams.js get <team-id>
 *   node teams.js organizations
 *   node teams.js me
 */

import { get, parseArgs, printTable, formatOutput } from './utils.js';

// List teams the user has access to
async function listTeams(organizationId, verbose) {
  // If no org ID provided, get organizations first
  if (!organizationId) {
    const orgsResponse = await get('/organizations');
    const orgs = orgsResponse.organizations || orgsResponse;
    
    if (!orgs || orgs.length === 0) {
      console.log('No organizations found.');
      return;
    }
    
    // Use the first organization by default
    organizationId = orgs[0].id;
    console.log(`Using organization: ${orgs[0].name} (ID: ${organizationId})\n`);
  }
  
  const response = await get('/teams', { organizationId });
  const teams = response.teams || response;
  
  if (verbose) {
    formatOutput(teams, true);
    return;
  }
  
  console.log(`Found ${teams.length} team(s):\n`);
  
  printTable(teams, [
    { key: 'id', label: 'ID' },
    { key: 'name', label: 'Name' },
    { key: 'organizationId', label: 'Org ID' }
  ]);
  
  console.log('\nUse the Team ID with other scripts:');
  console.log('  node scenarios.js list --team-id <id>');
  console.log('  node webhooks.js list --team-id <id>');
  console.log('  node data-stores.js list --team-id <id>');
}

// Get a specific team
async function getTeam(teamId, verbose) {
  const response = await get(`/teams/${teamId}`);
  const team = response.team || response;
  
  if (verbose) {
    formatOutput(team, true);
    return;
  }
  
  console.log(`Team: ${team.name}`);
  console.log(`ID: ${team.id}`);
  if (team.organizationId) {
    console.log(`Organization ID: ${team.organizationId}`);
  }
}

// List organizations
async function listOrganizations(verbose) {
  const response = await get('/organizations');
  const orgs = response.organizations || response;
  
  if (verbose) {
    formatOutput(orgs, true);
    return;
  }
  
  console.log(`Found ${orgs.length} organization(s):\n`);
  
  printTable(orgs, [
    { key: 'id', label: 'ID' },
    { key: 'name', label: 'Name' },
    { key: 'license', label: 'License' }
  ]);
  
  console.log('\nUse --org-id to filter teams by organization:');
  console.log('  node teams.js list --org-id <id>');
}

// Get current user info
async function getMe(verbose) {
  const response = await get('/users/me');
  const user = response.authUser || response.user || response;
  
  if (verbose) {
    formatOutput(response, true);
    return;
  }
  
  console.log(`User: ${user.name || user.email}`);
  console.log(`ID: ${user.id}`);
  console.log(`Email: ${user.email}`);
  if (user.timezone) {
    console.log(`Timezone: ${user.timezone}`);
  }
  if (user.locale) {
    console.log(`Locale: ${user.locale}`);
  }
}

// Show help
function showHelp() {
  console.log('Make.com Teams Script');
  console.log('');
  console.log('Find team IDs for use with other Make connector scripts.');
  console.log('');
  console.log('Commands:');
  console.log('  list [--org-id <id>]    List teams (optionally filter by organization)');
  console.log('  get <team-id>           Get team details');
  console.log('  organizations           List organizations');
  console.log('  me                      Get current user info');
  console.log('');
  console.log('Options:');
  console.log('  --org-id <id>    Filter teams by organization ID');
  console.log('  --verbose        Show full API responses');
  console.log('');
  console.log('Examples:');
  console.log('  node teams.js list');
  console.log('  node teams.js get 12345');
  console.log('  node teams.js organizations');
  console.log('  node teams.js me');
  console.log('');
  console.log('Use team IDs with other scripts:');
  console.log('  node scenarios.js list --team-id 12345');
  console.log('  node webhooks.js list --team-id 12345');
  console.log('  node data-stores.js list --team-id 12345');
}

// Main
async function main() {
  const args = parseArgs(process.argv.slice(2));
  const command = args._[0];
  const verbose = args.verbose || false;
  
  try {
    switch (command) {
      case 'list': {
        await listTeams(args['org-id'], verbose);
        break;
      }
      
      case 'get': {
        const teamId = args._[1];
        if (!teamId) {
          console.error('Error: Team ID is required');
          console.error('Usage: node teams.js get <team-id>');
          process.exit(1);
        }
        await getTeam(teamId, verbose);
        break;
      }
      
      case 'organizations':
      case 'orgs': {
        await listOrganizations(verbose);
        break;
      }
      
      case 'me': {
        await getMe(verbose);
        break;
      }
      
      case 'help':
      default:
        showHelp();
        process.exit(0);
    }
  } catch (error) {
    console.error('Error:', error.message);
    if (verbose) {
      console.error(error.stack);
    }
    process.exit(1);
  }
}

main();
