#!/usr/bin/env node

/**
 * LinkedIn Organizations Management
 * Manage company pages and organization posts.
 */

import { fileURLToPath } from 'url';
import path from 'path';
import {
  loadEnv, getToken, parseArgs, apiRequest, handleError, showHelp,
  formatDate, extractIdFromUrn
} from './utils.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
loadEnv(path.join(__dirname, '..'));

// Help documentation
function printHelp() {
  showHelp('LinkedIn Organizations', {
    'Commands': [
      'list                        List organizations you admin',
      'get <orgId>                 Get organization details',
      'followers <orgId>           Get follower statistics',
      'help                        Show this help'
    ],
    'Options': [
      '--verbose                   Show full API response'
    ],
    'Examples': [
      'node organizations.js list',
      'node organizations.js get 12345678',
      'node organizations.js get urn:li:organization:12345678',
      'node organizations.js followers 12345678'
    ],
    'Posting to Organizations': [
      'To post on behalf of an organization:',
      '',
      '1. Get the organization URN: node organizations.js list',
      '2. Post with org as author: node posts.js create --text "..." --author urn:li:organization:ID',
      '',
      'You need the w_organization_social scope and admin access to the page.'
    ],
    'Notes': [
      'You must have admin access to the organization to see it in the list.',
      'Organization IDs can be found in the URL when viewing the company page.',
      'The r_organization_social scope is needed to read organization data.',
      'The w_organization_social scope is needed to post on behalf of organizations.'
    ]
  });
}

// Get current user's person URN
async function getMyPersonUrn(token) {
  const response = await fetch('https://api.linkedin.com/v2/userinfo', {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });
  
  if (!response.ok) {
    throw new Error('Failed to get user profile');
  }
  
  const profile = await response.json();
  return `urn:li:person:${profile.sub}`;
}

// List organizations user has admin access to
async function listOrganizations(args) {
  const token = getToken();
  
  console.log('Fetching organizations you administer...\n');
  
  // Get current user's person URN
  const personUrn = await getMyPersonUrn(token);
  
  // Query organizationAcls to find orgs user has access to
  const endpoint = `/organizationAcls?q=roleAssignee&role=ADMINISTRATOR&state=APPROVED&projection=(elements*(organizationalTarget))`;
  
  try {
    const response = await apiRequest('GET', endpoint, token);
    
    if (args.verbose) {
      console.log(JSON.stringify(response, null, 2));
      return;
    }
    
    const elements = response.elements || [];
    
    if (elements.length === 0) {
      console.log('No organizations found where you have admin access.');
      console.log('\nNote: You need the r_organization_social scope and admin access to company pages.');
      return;
    }
    
    console.log(`Found ${elements.length} organization(s):\n`);
    
    // Get details for each org
    for (const acl of elements) {
      const orgUrn = acl.organizationalTarget;
      const orgId = extractIdFromUrn(orgUrn);
      
      console.log(`- Organization: ${orgUrn}`);
      console.log(`  ID: ${orgId}`);
      
      // Try to get more details
      try {
        const orgDetails = await apiRequest('GET', `/organizations/${orgId}`, token);
        console.log(`  Name: ${orgDetails.localizedName || 'N/A'}`);
        console.log(`  Vanity Name: ${orgDetails.vanityName || 'N/A'}`);
        if (orgDetails.localizedWebsite) {
          console.log(`  Website: ${orgDetails.localizedWebsite}`);
        }
      } catch (e) {
        // Details may not be available
      }
      console.log('');
    }
    
    console.log('To post as an organization, use:');
    console.log('  node posts.js create --text "Your post" --author urn:li:organization:ID');
    
  } catch (error) {
    if (error.status === 403) {
      console.log('Unable to list organizations.');
      console.log('\nThis may be because:');
      console.log('1. You don\'t have the r_organization_social scope');
      console.log('2. Your LinkedIn app doesn\'t have the required products enabled');
      console.log('3. You don\'t have admin access to any company pages');
      console.log('\nTo add organization scopes, re-authenticate with:');
      console.log('  node auth.js flow --scopes "openid,profile,w_member_social,r_organization_social,w_organization_social"');
    } else {
      throw error;
    }
  }
}

// Get organization details
async function getOrganization(orgId, args) {
  const token = getToken();
  
  // Handle both ID and URN formats
  const cleanId = orgId.includes('urn:li:organization:') 
    ? extractIdFromUrn(orgId) 
    : orgId;
  
  console.log(`Fetching organization ${cleanId}...\n`);
  
  try {
    const response = await apiRequest('GET', `/organizations/${cleanId}`, token);
    
    if (args.verbose) {
      console.log(JSON.stringify(response, null, 2));
      return;
    }
    
    console.log('Organization Details:');
    console.log('=====================');
    console.log(`ID: ${response.id}`);
    console.log(`URN: urn:li:organization:${response.id}`);
    console.log(`Name: ${response.localizedName || 'N/A'}`);
    console.log(`Vanity Name: ${response.vanityName || 'N/A'}`);
    console.log(`Website: ${response.localizedWebsite || 'N/A'}`);
    console.log(`Description: ${response.localizedDescription?.substring(0, 200) || 'N/A'}${response.localizedDescription?.length > 200 ? '...' : ''}`);
    
    if (response.logoV2) {
      console.log(`Logo: Available`);
    }
    
    if (response.industries) {
      console.log(`Industries: ${response.industries.join(', ')}`);
    }
    
    if (response.staffCountRange) {
      console.log(`Company Size: ${response.staffCountRange}`);
    }
    
    if (response.headquarter) {
      const hq = response.headquarter;
      console.log(`Headquarters: ${[hq.city, hq.geographicArea, hq.country].filter(Boolean).join(', ')}`);
    }
    
  } catch (error) {
    if (error.status === 403) {
      console.log('Unable to access organization details.');
      console.log('You may need admin access or the r_organization_social scope.');
    } else if (error.status === 404) {
      console.log('Organization not found.');
      console.log('Check that the ID is correct.');
    } else {
      throw error;
    }
  }
}

// Get follower statistics
async function getFollowerStats(orgId, args) {
  const token = getToken();
  
  const cleanId = orgId.includes('urn:li:organization:') 
    ? extractIdFromUrn(orgId) 
    : orgId;
  
  console.log(`Fetching follower statistics for organization ${cleanId}...\n`);
  
  try {
    // Get follower count
    const orgUrn = `urn:li:organization:${cleanId}`;
    const endpoint = `/networkSizes/${encodeURIComponent(orgUrn)}?edgeType=COMPANY_FOLLOWED_BY_MEMBER`;
    
    const response = await apiRequest('GET', endpoint, token);
    
    if (args.verbose) {
      console.log(JSON.stringify(response, null, 2));
      return;
    }
    
    console.log('Follower Statistics:');
    console.log('====================');
    console.log(`Organization: ${orgUrn}`);
    console.log(`Follower Count: ${response.firstDegreeSize || 'N/A'}`);
    
  } catch (error) {
    if (error.status === 403) {
      console.log('Unable to access follower statistics.');
      console.log('You may need admin access or additional scopes.');
    } else {
      throw error;
    }
  }
}

// Main
async function main() {
  const args = parseArgs(process.argv.slice(2));
  const command = args._[0];
  
  try {
    switch (command) {
      case 'list':
        await listOrganizations(args);
        break;
      case 'get':
        if (!args._[1]) {
          console.error('Error: Organization ID required');
          console.error('Usage: node organizations.js get <orgId>');
          process.exit(1);
        }
        await getOrganization(args._[1], args);
        break;
      case 'followers':
        if (!args._[1]) {
          console.error('Error: Organization ID required');
          console.error('Usage: node organizations.js followers <orgId>');
          process.exit(1);
        }
        await getFollowerStats(args._[1], args);
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
