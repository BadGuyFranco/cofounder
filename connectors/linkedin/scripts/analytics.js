#!/usr/bin/env node

/**
 * LinkedIn Analytics
 * Get engagement metrics for posts and organization pages.
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
  showHelp('LinkedIn Analytics', {
    'Commands': [
      'post <postUrn>              Get analytics for a specific post',
      'org <orgId>                 Get organization page analytics',
      'shares <orgId>              Get share statistics for organization',
      'help                        Show this help'
    ],
    'Options': [
      '--start <date>              Start date (YYYY-MM-DD)',
      '--end <date>                End date (YYYY-MM-DD)',
      '--verbose                   Show full API response'
    ],
    'Examples': [
      'node analytics.js post urn:li:ugcPost:1234567890',
      'node analytics.js post urn:li:share:1234567890',
      'node analytics.js org 12345678',
      'node analytics.js shares 12345678 --start 2024-01-01 --end 2024-01-31'
    ],
    'Available Metrics': [
      'Post Analytics:',
      '  - Impressions (unique and total)',
      '  - Clicks (total)',
      '  - Likes, Comments, Shares',
      '  - Engagement rate',
      '',
      'Organization Analytics:',
      '  - Follower count and demographics',
      '  - Page views',
      '  - Unique visitors'
    ],
    'Notes': [
      'Post analytics require the post to be at least a few hours old.',
      'Organization analytics require admin access and r_organization_social scope.',
      'Some metrics may not be available for all post types.'
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

// Get analytics for a specific post
async function getPostAnalytics(postUrn, args) {
  const token = getToken();
  
  console.log(`Fetching analytics for ${postUrn}...\n`);
  
  // URL encode the post URN
  const encodedUrn = encodeURIComponent(postUrn);
  
  try {
    // Get social actions (likes, comments, shares)
    const socialEndpoint = `/socialActions/${encodedUrn}`;
    const socialData = await apiRequest('GET', socialEndpoint, token);
    
    if (args.verbose) {
      console.log('Social Actions:');
      console.log(JSON.stringify(socialData, null, 2));
      console.log('');
    }
    
    console.log('Post Engagement:');
    console.log('=================');
    console.log(`Post URN: ${postUrn}`);
    console.log('');
    
    // Likes summary
    if (socialData.likesSummary) {
      console.log(`Reactions: ${socialData.likesSummary.totalLikes || 0}`);
      if (socialData.likesSummary.likedByCurrentUser) {
        console.log('  (You reacted to this post)');
      }
    }
    
    // Comments summary
    if (socialData.commentsSummary) {
      console.log(`Comments: ${socialData.commentsSummary.totalFirstLevelComments || 0}`);
      if (socialData.commentsSummary.aggregatedTotalComments) {
        console.log(`  (Total including replies: ${socialData.commentsSummary.aggregatedTotalComments})`);
      }
    }
    
    // Try to get share statistics
    try {
      const shareStatsEndpoint = `/organizationalEntityShareStatistics?q=organizationalEntity&organizationalEntity=${encodedUrn}`;
      const shareStats = await apiRequest('GET', shareStatsEndpoint, token);
      
      if (args.verbose) {
        console.log('\nShare Statistics:');
        console.log(JSON.stringify(shareStats, null, 2));
      }
      
      if (shareStats.elements && shareStats.elements.length > 0) {
        const stats = shareStats.elements[0].totalShareStatistics;
        console.log('');
        console.log('Impressions & Reach:');
        console.log(`  Impressions: ${stats.impressionCount || 'N/A'}`);
        console.log(`  Unique Impressions: ${stats.uniqueImpressionsCount || 'N/A'}`);
        console.log(`  Clicks: ${stats.clickCount || 'N/A'}`);
        console.log(`  Shares: ${stats.shareCount || 'N/A'}`);
        console.log(`  Engagement: ${stats.engagement || 'N/A'}`);
      }
    } catch (e) {
      // Share statistics may not be available for personal posts
      if (args.verbose) {
        console.log('\nNote: Detailed impression statistics not available for this post.');
        console.log('(This is normal for personal posts - org posts have more analytics)');
      }
    }
    
  } catch (error) {
    if (error.status === 403) {
      console.log('Unable to fetch analytics.');
      console.log('This may be due to privacy settings or the post being too new.');
    } else if (error.status === 404) {
      console.log('Post not found. Check that the URN is correct.');
    } else {
      throw error;
    }
  }
}

// Get organization page analytics
async function getOrgAnalytics(orgId, args) {
  const token = getToken();
  
  const cleanId = orgId.includes('urn:li:organization:') 
    ? extractIdFromUrn(orgId) 
    : orgId;
  
  console.log(`Fetching analytics for organization ${cleanId}...\n`);
  
  const orgUrn = `urn:li:organization:${cleanId}`;
  const encodedUrn = encodeURIComponent(orgUrn);
  
  try {
    // Get page statistics
    const endpoint = `/organizationPageStatistics?q=organization&organization=${encodedUrn}`;
    const response = await apiRequest('GET', endpoint, token);
    
    if (args.verbose) {
      console.log(JSON.stringify(response, null, 2));
      return;
    }
    
    console.log('Organization Page Analytics:');
    console.log('============================');
    console.log(`Organization: ${orgUrn}`);
    console.log('');
    
    if (response.elements && response.elements.length > 0) {
      const stats = response.elements[0];
      
      if (stats.views) {
        console.log('Page Views:');
        console.log(`  All Page Views: ${stats.views.allPageViews?.pageViews || 'N/A'}`);
        console.log(`  Mobile Views: ${stats.views.mobilePageViews?.pageViews || 'N/A'}`);
        console.log(`  Desktop Views: ${stats.views.desktopPageViews?.pageViews || 'N/A'}`);
      }
      
      if (stats.clicks) {
        console.log('');
        console.log('Clicks:');
        console.log(`  Career Page: ${stats.clicks.careerPageClicks?.clicks || 'N/A'}`);
        console.log(`  Jobs Page: ${stats.clicks.jobsPageClicks?.clicks || 'N/A'}`);
      }
    } else {
      console.log('No analytics data available for this organization.');
    }
    
  } catch (error) {
    if (error.status === 403) {
      console.log('Unable to fetch organization analytics.');
      console.log('You need admin access and r_organization_social scope.');
    } else {
      throw error;
    }
  }
}

// Get share statistics for organization
async function getShareStats(orgId, args) {
  const token = getToken();
  
  const cleanId = orgId.includes('urn:li:organization:') 
    ? extractIdFromUrn(orgId) 
    : orgId;
  
  console.log(`Fetching share statistics for organization ${cleanId}...\n`);
  
  const orgUrn = `urn:li:organization:${cleanId}`;
  const encodedUrn = encodeURIComponent(orgUrn);
  
  // Build date range if provided
  let timeRange = '';
  if (args.start && args.end) {
    const startTime = new Date(args.start).getTime();
    const endTime = new Date(args.end).getTime();
    timeRange = `&timeIntervals.timeGranularityType=DAY&timeIntervals.timeRange.start=${startTime}&timeIntervals.timeRange.end=${endTime}`;
  }
  
  try {
    const endpoint = `/organizationalEntityShareStatistics?q=organizationalEntity&organizationalEntity=${encodedUrn}${timeRange}`;
    const response = await apiRequest('GET', endpoint, token);
    
    if (args.verbose) {
      console.log(JSON.stringify(response, null, 2));
      return;
    }
    
    console.log('Share Statistics:');
    console.log('=================');
    console.log(`Organization: ${orgUrn}`);
    console.log('');
    
    if (response.elements && response.elements.length > 0) {
      const stats = response.elements[0].totalShareStatistics;
      
      console.log('Totals:');
      console.log(`  Share Count: ${stats.shareCount || 0}`);
      console.log(`  Like Count: ${stats.likeCount || 0}`);
      console.log(`  Comment Count: ${stats.commentCount || 0}`);
      console.log(`  Impression Count: ${stats.impressionCount || 0}`);
      console.log(`  Unique Impressions: ${stats.uniqueImpressionsCount || 0}`);
      console.log(`  Click Count: ${stats.clickCount || 0}`);
      console.log(`  Engagement: ${stats.engagement || 0}`);
      
      // If we have time series data
      if (response.elements[0].timeIntervals) {
        console.log('\nTime Series Data:');
        for (const interval of response.elements[0].timeIntervals) {
          console.log(`  ${new Date(interval.timeRange.start).toLocaleDateString()}: ${interval.totalShareStatistics.impressionCount || 0} impressions`);
        }
      }
    } else {
      console.log('No share statistics available.');
    }
    
  } catch (error) {
    if (error.status === 403) {
      console.log('Unable to fetch share statistics.');
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
      case 'post':
        if (!args._[1]) {
          console.error('Error: Post URN required');
          console.error('Usage: node analytics.js post <postUrn>');
          process.exit(1);
        }
        await getPostAnalytics(args._[1], args);
        break;
      case 'org':
        if (!args._[1]) {
          console.error('Error: Organization ID required');
          console.error('Usage: node analytics.js org <orgId>');
          process.exit(1);
        }
        await getOrgAnalytics(args._[1], args);
        break;
      case 'shares':
        if (!args._[1]) {
          console.error('Error: Organization ID required');
          console.error('Usage: node analytics.js shares <orgId>');
          process.exit(1);
        }
        await getShareStats(args._[1], args);
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
