#!/usr/bin/env node

/**
 * Publer Analytics Script
 * View post performance, charts, hashtags, best times, and competitor analysis.
 *
 * API Reference: https://publer.com/docs
 * 
 * Analytics Endpoints:
 * - Charts: Dashboard chart data
 * - Post Insights: Per-post metrics
 * - Hashtag Analysis: Hashtag performance
 * - Best Times to Post: Optimal posting times
 * - Member: Team member activity
 * - Competitor Analysis: Competitor tracking
 *
 * Usage:
 *   node analytics.js charts
 *   node analytics.js post <id>
 *   node analytics.js posts --account <id>
 *   node analytics.js hashtags
 *   node analytics.js best-times
 *   node analytics.js members
 *   node analytics.js competitors
 *   node analytics.js help
 */

import { parseArgs, apiRequest } from './utils.js';

/**
 * Get available charts and chart data
 */
async function getCharts(flags, verbose) {
  const params = new URLSearchParams();
  
  if (flags.account) {
    params.append('account_id', flags.account);
  }
  if (flags.start) {
    params.append('start_date', flags.start);
  }
  if (flags.end) {
    params.append('end_date', flags.end);
  }
  if (flags.period) {
    params.append('period', flags.period);
  }
  if (flags.type) {
    params.append('chart_type', flags.type);
  }
  
  const queryString = params.toString();
  const endpoint = `/analytics/charts${queryString ? '?' + queryString : ''}`;
  
  const data = await apiRequest(endpoint);
  
  console.log('Analytics Charts:\n');
  
  if (data.charts) {
    for (const chart of data.charts) {
      console.log(`${chart.name || chart.type}:`);
      if (chart.data) {
        console.log(JSON.stringify(chart.data, null, 2));
      }
      console.log('');
    }
  } else {
    console.log(JSON.stringify(data, null, 2));
  }
  
  if (verbose) {
    console.log('\nFull response:');
    console.log(JSON.stringify(data, null, 2));
  }
  
  return data;
}

/**
 * Get analytics for a specific post
 */
async function getPostAnalytics(postId, verbose) {
  const data = await apiRequest(`/analytics/posts/${postId}`);
  
  console.log(`Analytics for Post: ${postId}\n`);
  
  const metrics = [
    ['impressions', 'Impressions'],
    ['reach', 'Reach'],
    ['engagement', 'Engagement'],
    ['engagement_rate', 'Engagement Rate'],
    ['likes', 'Likes'],
    ['comments', 'Comments'],
    ['shares', 'Shares'],
    ['saves', 'Saves'],
    ['clicks', 'Clicks'],
    ['link_clicks', 'Link Clicks'],
    ['video_views', 'Video Views'],
    ['reactions', 'Reactions'],
    ['retweets', 'Retweets'],
    ['repins', 'Repins']
  ];
  
  for (const [key, label] of metrics) {
    if (data[key] !== undefined) {
      const value = key === 'engagement_rate' 
        ? `${(data[key] * 100).toFixed(2)}%` 
        : data[key];
      console.log(`${label}: ${value}`);
    }
  }
  
  if (verbose) {
    console.log('\nFull response:');
    console.log(JSON.stringify(data, null, 2));
  }
  
  return data;
}

/**
 * Get post insights with filtering
 */
async function getPostInsights(flags, verbose) {
  const params = new URLSearchParams();
  
  if (flags.account) {
    params.append('account_id', flags.account);
  }
  if (flags.start) {
    params.append('start_date', flags.start);
  }
  if (flags.end) {
    params.append('end_date', flags.end);
  }
  if (flags.period) {
    params.append('period', flags.period);
  }
  if (flags.sort) {
    params.append('sort_by', flags.sort);
  }
  if (flags.order) {
    params.append('order', flags.order);
  }
  if (flags.limit) {
    params.append('limit', flags.limit);
  }
  if (flags.page) {
    params.append('page', flags.page);
  }
  
  const queryString = params.toString();
  const endpoint = `/analytics/posts${queryString ? '?' + queryString : ''}`;
  
  const data = await apiRequest(endpoint);
  
  const posts = Array.isArray(data) ? data : (data.posts || data.data || []);
  
  console.log(`Post Insights (${posts.length} posts):\n`);
  
  for (const post of posts) {
    const text = post.text ? post.text.substring(0, 50) + '...' : 'No text';
    console.log(`- ${text}`);
    console.log(`  ID: ${post.id || post._id}`);
    if (post.engagement !== undefined) console.log(`  Engagement: ${post.engagement}`);
    if (post.impressions !== undefined) console.log(`  Impressions: ${post.impressions}`);
    if (post.reach !== undefined) console.log(`  Reach: ${post.reach}`);
    console.log('');
  }
  
  if (verbose) {
    console.log('\nFull response:');
    console.log(JSON.stringify(data, null, 2));
  }
  
  return data;
}

/**
 * Get hashtag analysis
 */
async function getHashtagAnalysis(flags, verbose) {
  const params = new URLSearchParams();
  
  if (flags.account) {
    params.append('account_id', flags.account);
  }
  if (flags.start) {
    params.append('start_date', flags.start);
  }
  if (flags.end) {
    params.append('end_date', flags.end);
  }
  if (flags.period) {
    params.append('period', flags.period);
  }
  
  const queryString = params.toString();
  const endpoint = `/analytics/hashtags${queryString ? '?' + queryString : ''}`;
  
  const data = await apiRequest(endpoint);
  
  console.log('Hashtag Analysis:\n');
  
  const hashtags = Array.isArray(data) ? data : (data.hashtags || data.data || []);
  
  for (const tag of hashtags) {
    console.log(`#${tag.name || tag.hashtag}`);
    if (tag.posts_count !== undefined) console.log(`  Posts: ${tag.posts_count}`);
    if (tag.engagement !== undefined) console.log(`  Engagement: ${tag.engagement}`);
    if (tag.avg_engagement !== undefined) console.log(`  Avg Engagement: ${tag.avg_engagement}`);
    if (tag.reach !== undefined) console.log(`  Reach: ${tag.reach}`);
    console.log('');
  }
  
  if (verbose) {
    console.log('\nFull response:');
    console.log(JSON.stringify(data, null, 2));
  }
  
  return data;
}

/**
 * Get best times to post
 */
async function getBestTimes(flags, verbose) {
  const params = new URLSearchParams();
  
  if (flags.account) {
    params.append('account_id', flags.account);
  }
  if (flags.period) {
    params.append('period', flags.period);
  }
  
  const queryString = params.toString();
  const endpoint = `/analytics/best-times${queryString ? '?' + queryString : ''}`;
  
  const data = await apiRequest(endpoint);
  
  console.log('Best Times to Post:\n');
  
  if (data.best_times) {
    for (const time of data.best_times) {
      console.log(`${time.day || time.day_of_week}: ${time.time || time.hour}`);
      if (time.engagement !== undefined) console.log(`  Expected Engagement: ${time.engagement}`);
      if (time.score !== undefined) console.log(`  Score: ${time.score}`);
    }
  } else if (data.heatmap) {
    console.log('Engagement Heatmap:');
    console.log(JSON.stringify(data.heatmap, null, 2));
  } else {
    console.log(JSON.stringify(data, null, 2));
  }
  
  if (verbose) {
    console.log('\nFull response:');
    console.log(JSON.stringify(data, null, 2));
  }
  
  return data;
}

/**
 * Get member analytics
 */
async function getMemberAnalytics(flags, verbose) {
  const params = new URLSearchParams();
  
  if (flags.start) {
    params.append('start_date', flags.start);
  }
  if (flags.end) {
    params.append('end_date', flags.end);
  }
  if (flags.period) {
    params.append('period', flags.period);
  }
  
  const queryString = params.toString();
  const endpoint = `/analytics/members${queryString ? '?' + queryString : ''}`;
  
  const data = await apiRequest(endpoint);
  
  console.log('Member Analytics:\n');
  
  const members = Array.isArray(data) ? data : (data.members || data.data || []);
  
  for (const member of members) {
    console.log(`${member.name || member.email}`);
    if (member.posts_created !== undefined) console.log(`  Posts Created: ${member.posts_created}`);
    if (member.posts_published !== undefined) console.log(`  Posts Published: ${member.posts_published}`);
    if (member.posts_scheduled !== undefined) console.log(`  Posts Scheduled: ${member.posts_scheduled}`);
    if (member.last_active !== undefined) console.log(`  Last Active: ${member.last_active}`);
    console.log('');
  }
  
  if (verbose) {
    console.log('\nFull response:');
    console.log(JSON.stringify(data, null, 2));
  }
  
  return data;
}

/**
 * Get competitor analysis
 */
async function getCompetitorAnalysis(flags, verbose) {
  const params = new URLSearchParams();
  
  if (flags.account) {
    params.append('account_id', flags.account);
  }
  if (flags.start) {
    params.append('start_date', flags.start);
  }
  if (flags.end) {
    params.append('end_date', flags.end);
  }
  if (flags.period) {
    params.append('period', flags.period);
  }
  
  const queryString = params.toString();
  const endpoint = `/analytics/competitors${queryString ? '?' + queryString : ''}`;
  
  const data = await apiRequest(endpoint);
  
  console.log('Competitor Analysis:\n');
  
  const competitors = Array.isArray(data) ? data : (data.competitors || data.data || []);
  
  for (const comp of competitors) {
    console.log(`${comp.name || comp.username || comp.handle}`);
    if (comp.followers !== undefined) console.log(`  Followers: ${comp.followers}`);
    if (comp.followers_change !== undefined) {
      const sign = comp.followers_change >= 0 ? '+' : '';
      console.log(`  Followers Change: ${sign}${comp.followers_change}`);
    }
    if (comp.posts_count !== undefined) console.log(`  Posts: ${comp.posts_count}`);
    if (comp.avg_engagement !== undefined) console.log(`  Avg Engagement: ${comp.avg_engagement}`);
    if (comp.engagement_rate !== undefined) console.log(`  Engagement Rate: ${(comp.engagement_rate * 100).toFixed(2)}%`);
    console.log('');
  }
  
  if (verbose) {
    console.log('\nFull response:');
    console.log(JSON.stringify(data, null, 2));
  }
  
  return data;
}

/**
 * Get summary/overview analytics
 */
async function getSummary(flags, verbose) {
  const params = new URLSearchParams();
  
  if (flags.account) {
    params.append('account_id', flags.account);
  }
  if (flags.start) {
    params.append('start_date', flags.start);
  }
  if (flags.end) {
    params.append('end_date', flags.end);
  }
  if (flags.period) {
    params.append('period', flags.period);
  }
  
  const queryString = params.toString();
  const endpoint = `/analytics/summary${queryString ? '?' + queryString : ''}`;
  
  const data = await apiRequest(endpoint);
  
  console.log('Analytics Summary:\n');
  
  const metrics = [
    ['total_posts', 'Total Posts'],
    ['posts_published', 'Posts Published'],
    ['posts_scheduled', 'Posts Scheduled'],
    ['total_impressions', 'Total Impressions'],
    ['total_reach', 'Total Reach'],
    ['total_engagement', 'Total Engagement'],
    ['avg_engagement', 'Avg Engagement'],
    ['engagement_rate', 'Engagement Rate'],
    ['followers', 'Followers'],
    ['followers_change', 'Followers Change']
  ];
  
  for (const [key, label] of metrics) {
    if (data[key] !== undefined) {
      let value = data[key];
      if (key === 'engagement_rate') {
        value = `${(value * 100).toFixed(2)}%`;
      } else if (key === 'followers_change') {
        const sign = value >= 0 ? '+' : '';
        value = `${sign}${value}`;
      }
      console.log(`${label}: ${value}`);
    }
  }
  
  if (data.by_platform) {
    console.log('\nBy Platform:');
    for (const [platform, stats] of Object.entries(data.by_platform)) {
      console.log(`  ${platform}:`);
      if (stats.posts !== undefined) console.log(`    Posts: ${stats.posts}`);
      if (stats.impressions !== undefined) console.log(`    Impressions: ${stats.impressions}`);
      if (stats.engagement !== undefined) console.log(`    Engagement: ${stats.engagement}`);
    }
  }
  
  if (verbose) {
    console.log('\nFull response:');
    console.log(JSON.stringify(data, null, 2));
  }
  
  return data;
}

/**
 * Show help
 */
function showHelp() {
  console.log('Publer Analytics Script');
  console.log('');
  console.log('Commands:');
  console.log('  summary                  Get analytics overview/summary');
  console.log('  charts                   Get dashboard chart data');
  console.log('  post <id>                Get analytics for a specific post');
  console.log('  posts                    Get post insights with filtering');
  console.log('  hashtags                 Get hashtag analysis');
  console.log('  best-times               Get best times to post');
  console.log('  members                  Get team member analytics');
  console.log('  competitors              Get competitor analysis');
  console.log('  help                     Show this help');
  console.log('');
  console.log('Date Range Options:');
  console.log('  --start <date>           Start date (YYYY-MM-DD)');
  console.log('  --end <date>             End date (YYYY-MM-DD)');
  console.log('  --period <period>        Predefined period (7d, 30d, 90d, 12m)');
  console.log('');
  console.log('Filter Options:');
  console.log('  --account <id>           Filter by social account ID');
  console.log('  --sort <field>           Sort by field (engagement, impressions, reach)');
  console.log('  --order <order>          Sort order (asc, desc)');
  console.log('  --limit <n>              Number of results to return');
  console.log('  --page <n>               Page number for pagination');
  console.log('');
  console.log('Chart Options:');
  console.log('  --type <type>            Chart type (engagement, reach, followers, etc.)');
  console.log('');
  console.log('General Options:');
  console.log('  --verbose                Show full API responses');
  console.log('');
  console.log('Examples:');
  console.log('  # Get analytics summary');
  console.log('  node analytics.js summary --period 30d');
  console.log('');
  console.log('  # Get chart data');
  console.log('  node analytics.js charts --account acc123 --period 7d');
  console.log('');
  console.log('  # Get specific post analytics');
  console.log('  node analytics.js post post123');
  console.log('');
  console.log('  # Get top posts by engagement');
  console.log('  node analytics.js posts --sort engagement --order desc --limit 10');
  console.log('');
  console.log('  # Get hashtag performance');
  console.log('  node analytics.js hashtags --account acc123 --period 30d');
  console.log('');
  console.log('  # Get best posting times');
  console.log('  node analytics.js best-times --account acc123');
  console.log('');
  console.log('  # Get team member activity');
  console.log('  node analytics.js members --period 7d');
  console.log('');
  console.log('  # Get competitor insights');
  console.log('  node analytics.js competitors --account acc123');
}

/**
 * Main entry point
 */
async function main() {
  const args = parseArgs(process.argv.slice(2));
  const command = args._[0];
  const verbose = args.verbose || false;

  try {
    switch (command) {
      case 'summary':
        await getSummary(args, verbose);
        break;

      case 'charts':
        await getCharts(args, verbose);
        break;

      case 'post': {
        const postId = args._[1];
        if (!postId) {
          console.error('Error: Post ID is required');
          console.error('Usage: node analytics.js post <id>');
          process.exit(1);
        }
        await getPostAnalytics(postId, verbose);
        break;
      }

      case 'posts':
        await getPostInsights(args, verbose);
        break;

      case 'hashtags':
        await getHashtagAnalysis(args, verbose);
        break;

      case 'best-times':
        await getBestTimes(args, verbose);
        break;

      case 'members':
        await getMemberAnalytics(args, verbose);
        break;

      case 'competitors':
        await getCompetitorAnalysis(args, verbose);
        break;

      case 'help':
      default:
        showHelp();
        break;
    }
  } catch (error) {
    console.error('Error:', error.message);
    if (error.status) {
      console.error('Status:', error.status);
    }
    if (verbose && error.details) {
      console.error('Details:', JSON.stringify(error.details, null, 2));
    }
    process.exit(1);
  }
}

main();
