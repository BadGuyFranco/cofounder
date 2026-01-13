#!/usr/bin/env node

/**
 * LinkedIn Follower Statistics
 * Get follower counts and demographics for organizations.
 */

import { fileURLToPath } from 'url';
import path from 'path';
import {
  loadEnv, getToken, parseArgs, apiRequest, handleError, showHelp,
  extractIdFromUrn
} from './utils.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
loadEnv(path.join(__dirname, '..'));

// Help documentation
function printHelp() {
  showHelp('LinkedIn Follower Statistics', {
    'Commands': [
      'count <orgId>               Get follower count for organization',
      'demographics <orgId>        Get follower demographics',
      'growth <orgId>              Get follower growth over time',
      'help                        Show this help'
    ],
    'Options': [
      '--start <date>              Start date for growth (YYYY-MM-DD)',
      '--end <date>                End date for growth (YYYY-MM-DD)',
      '--verbose                   Show full API response'
    ],
    'Examples': [
      'node followers.js count 12345678',
      'node followers.js count urn:li:organization:12345678',
      'node followers.js demographics 12345678',
      'node followers.js growth 12345678 --start 2024-01-01 --end 2024-12-31'
    ],
    'Demographics Available': [
      '- Industry breakdown',
      '- Seniority levels',
      '- Company sizes',
      '- Geographic distribution',
      '- Job functions'
    ],
    'Notes': [
      'All commands require admin access to the organization.',
      'You need the r_organization_social scope.',
      'Personal profiles do not have follower APIs available.'
    ]
  });
}

// Get follower count
async function getFollowerCount(orgId, args) {
  const token = getToken();
  
  const cleanId = orgId.includes('urn:li:organization:') 
    ? extractIdFromUrn(orgId) 
    : orgId;
  
  console.log(`Fetching follower count for organization ${cleanId}...\n`);
  
  const orgUrn = `urn:li:organization:${cleanId}`;
  const encodedUrn = encodeURIComponent(orgUrn);
  
  try {
    const endpoint = `/networkSizes/${encodedUrn}?edgeType=COMPANY_FOLLOWED_BY_MEMBER`;
    const response = await apiRequest('GET', endpoint, token);
    
    if (args.verbose) {
      console.log(JSON.stringify(response, null, 2));
      return;
    }
    
    console.log('Follower Count:');
    console.log('================');
    console.log(`Organization: ${orgUrn}`);
    console.log(`Total Followers: ${response.firstDegreeSize || 'N/A'}`);
    
  } catch (error) {
    if (error.status === 403) {
      console.log('Unable to fetch follower count.');
      console.log('You need admin access to the organization and r_organization_social scope.');
    } else if (error.status === 404) {
      console.log('Organization not found. Check that the ID is correct.');
    } else {
      throw error;
    }
  }
}

// Get follower demographics
async function getFollowerDemographics(orgId, args) {
  const token = getToken();
  
  const cleanId = orgId.includes('urn:li:organization:') 
    ? extractIdFromUrn(orgId) 
    : orgId;
  
  console.log(`Fetching follower demographics for organization ${cleanId}...\n`);
  
  const orgUrn = `urn:li:organization:${cleanId}`;
  const encodedUrn = encodeURIComponent(orgUrn);
  
  try {
    const endpoint = `/organizationalEntityFollowerStatistics?q=organizationalEntity&organizationalEntity=${encodedUrn}`;
    const response = await apiRequest('GET', endpoint, token);
    
    if (args.verbose) {
      console.log(JSON.stringify(response, null, 2));
      return;
    }
    
    console.log('Follower Demographics:');
    console.log('======================');
    console.log(`Organization: ${orgUrn}`);
    console.log('');
    
    if (response.elements && response.elements.length > 0) {
      const stats = response.elements[0];
      
      // Follower counts by type
      if (stats.followerCountsByAssociationType) {
        console.log('By Association Type:');
        for (const item of stats.followerCountsByAssociationType) {
          console.log(`  ${item.associationType}: ${item.followerCounts?.organicFollowerCount || 0} organic, ${item.followerCounts?.paidFollowerCount || 0} paid`);
        }
        console.log('');
      }
      
      // By seniority
      if (stats.followerCountsBySeniority) {
        console.log('By Seniority:');
        for (const item of stats.followerCountsBySeniority) {
          const total = (item.followerCounts?.organicFollowerCount || 0) + (item.followerCounts?.paidFollowerCount || 0);
          if (total > 0) {
            console.log(`  ${item.seniority}: ${total}`);
          }
        }
        console.log('');
      }
      
      // By industry
      if (stats.followerCountsByIndustry) {
        console.log('By Industry (Top 10):');
        const sorted = [...stats.followerCountsByIndustry].sort((a, b) => {
          const totalA = (a.followerCounts?.organicFollowerCount || 0) + (a.followerCounts?.paidFollowerCount || 0);
          const totalB = (b.followerCounts?.organicFollowerCount || 0) + (b.followerCounts?.paidFollowerCount || 0);
          return totalB - totalA;
        }).slice(0, 10);
        
        for (const item of sorted) {
          const total = (item.followerCounts?.organicFollowerCount || 0) + (item.followerCounts?.paidFollowerCount || 0);
          if (total > 0) {
            console.log(`  ${item.industry}: ${total}`);
          }
        }
        console.log('');
      }
      
      // By function
      if (stats.followerCountsByFunction) {
        console.log('By Job Function (Top 10):');
        const sorted = [...stats.followerCountsByFunction].sort((a, b) => {
          const totalA = (a.followerCounts?.organicFollowerCount || 0) + (a.followerCounts?.paidFollowerCount || 0);
          const totalB = (b.followerCounts?.organicFollowerCount || 0) + (b.followerCounts?.paidFollowerCount || 0);
          return totalB - totalA;
        }).slice(0, 10);
        
        for (const item of sorted) {
          const total = (item.followerCounts?.organicFollowerCount || 0) + (item.followerCounts?.paidFollowerCount || 0);
          if (total > 0) {
            console.log(`  ${item.function}: ${total}`);
          }
        }
        console.log('');
      }
      
      // By company size
      if (stats.followerCountsByStaffCountRange) {
        console.log('By Company Size:');
        for (const item of stats.followerCountsByStaffCountRange) {
          const total = (item.followerCounts?.organicFollowerCount || 0) + (item.followerCounts?.paidFollowerCount || 0);
          if (total > 0) {
            console.log(`  ${item.staffCountRange}: ${total}`);
          }
        }
        console.log('');
      }
      
      // By geography
      if (stats.followerCountsByGeo) {
        console.log('By Geography (Top 10):');
        const sorted = [...stats.followerCountsByGeo].sort((a, b) => {
          const totalA = (a.followerCounts?.organicFollowerCount || 0) + (a.followerCounts?.paidFollowerCount || 0);
          const totalB = (b.followerCounts?.organicFollowerCount || 0) + (b.followerCounts?.paidFollowerCount || 0);
          return totalB - totalA;
        }).slice(0, 10);
        
        for (const item of sorted) {
          const total = (item.followerCounts?.organicFollowerCount || 0) + (item.followerCounts?.paidFollowerCount || 0);
          if (total > 0) {
            console.log(`  ${item.geo}: ${total}`);
          }
        }
      }
      
    } else {
      console.log('No demographic data available.');
    }
    
  } catch (error) {
    if (error.status === 403) {
      console.log('Unable to fetch demographics.');
      console.log('You need admin access and r_organization_social scope.');
    } else {
      throw error;
    }
  }
}

// Get follower growth over time
async function getFollowerGrowth(orgId, args) {
  const token = getToken();
  
  const cleanId = orgId.includes('urn:li:organization:') 
    ? extractIdFromUrn(orgId) 
    : orgId;
  
  console.log(`Fetching follower growth for organization ${cleanId}...\n`);
  
  const orgUrn = `urn:li:organization:${cleanId}`;
  const encodedUrn = encodeURIComponent(orgUrn);
  
  // Build time range
  let timeRange = '';
  if (args.start && args.end) {
    const startTime = new Date(args.start).getTime();
    const endTime = new Date(args.end).getTime();
    timeRange = `&timeIntervals.timeGranularityType=MONTH&timeIntervals.timeRange.start=${startTime}&timeIntervals.timeRange.end=${endTime}`;
  } else {
    // Default to last 12 months
    const endTime = Date.now();
    const startTime = endTime - (365 * 24 * 60 * 60 * 1000);
    timeRange = `&timeIntervals.timeGranularityType=MONTH&timeIntervals.timeRange.start=${startTime}&timeIntervals.timeRange.end=${endTime}`;
  }
  
  try {
    const endpoint = `/organizationalEntityFollowerStatistics?q=organizationalEntity&organizationalEntity=${encodedUrn}${timeRange}`;
    const response = await apiRequest('GET', endpoint, token);
    
    if (args.verbose) {
      console.log(JSON.stringify(response, null, 2));
      return;
    }
    
    console.log('Follower Growth:');
    console.log('=================');
    console.log(`Organization: ${orgUrn}`);
    console.log('');
    
    if (response.elements && response.elements.length > 0) {
      const stats = response.elements[0];
      
      if (stats.followerGains) {
        console.log('Monthly Growth:');
        for (const period of stats.followerGains) {
          const date = new Date(period.timeRange?.start).toLocaleDateString('en-US', { year: 'numeric', month: 'short' });
          const organic = period.followerGains?.organicFollowerGain || 0;
          const paid = period.followerGains?.paidFollowerGain || 0;
          const total = organic + paid;
          
          const bar = '█'.repeat(Math.min(Math.round(total / 10), 50));
          console.log(`  ${date}: ${total > 0 ? '+' : ''}${total} ${bar}`);
        }
      } else {
        console.log('No growth data available for the specified period.');
      }
    } else {
      console.log('No growth data available.');
    }
    
  } catch (error) {
    if (error.status === 403) {
      console.log('Unable to fetch growth data.');
      console.log('You need admin access and r_organization_social scope.');
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
      case 'count':
        if (!args._[1]) {
          console.error('Error: Organization ID required');
          console.error('Usage: node followers.js count <orgId>');
          process.exit(1);
        }
        await getFollowerCount(args._[1], args);
        break;
      case 'demographics':
        if (!args._[1]) {
          console.error('Error: Organization ID required');
          console.error('Usage: node followers.js demographics <orgId>');
          process.exit(1);
        }
        await getFollowerDemographics(args._[1], args);
        break;
      case 'growth':
        if (!args._[1]) {
          console.error('Error: Organization ID required');
          console.error('Usage: node followers.js growth <orgId>');
          process.exit(1);
        }
        await getFollowerGrowth(args._[1], args);
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
