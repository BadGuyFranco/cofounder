#!/usr/bin/env node
/**
 * Google Analytics (GA4) Operations
 * Query traffic, conversions, audiences, and real-time data via the Analytics Data API.
 *
 * Usage:
 *   node analytics.js properties --account user@example.com
 *   node analytics.js report --property PROPERTY_ID --account user@example.com
 *   node analytics.js top-pages --property PROPERTY_ID --account user@example.com
 *   node analytics.js top-sources --property PROPERTY_ID --account user@example.com
 *   node analytics.js realtime --property PROPERTY_ID --account user@example.com
 */

// Dependency check (must be first, before any npm imports)
import { ensureDeps } from '../../../system/shared/ensure-deps.js';
ensureDeps(import.meta.url);

// npm packages (dynamic import after dependency check)
const { google } = await import('googleapis');

// Local modules
import { getAuthClient } from './auth.js';
import {
  parseArgs,
  output,
  outputError,
  showHelp,
  requireApi
} from './utils.js';

/**
 * Get Analytics Data API instance (GA4)
 */
async function getAnalyticsApi(email) {
  const auth = await getAuthClient(email);
  return google.analyticsdata({ version: 'v1beta', auth });
}

/**
 * Get Analytics Admin API instance (for listing properties)
 */
async function getAdminApi(email) {
  const auth = await getAuthClient(email);
  return google.analyticsadmin({ version: 'v1alpha', auth });
}

/**
 * List GA4 properties accessible to the account
 */
async function listProperties(email) {
  const admin = await getAdminApi(email);
  const response = await admin.properties.list({ filter: 'parent:accounts/-' });
  return (response.data.properties || []).map(p => ({
    name: p.name,
    displayName: p.displayName,
    propertyType: p.propertyType,
    industryCategory: p.industryCategory,
    timeZone: p.timeZone,
    currencyCode: p.currencyCode,
    createTime: p.createTime
  }));
}

/**
 * Run a standard analytics report
 */
async function runReport(email, propertyId, options = {}) {
  const analytics = await getAnalyticsApi(email);

  const startDate = options.start || '30daysAgo';
  const endDate = options.end || 'today';
  const limit = parseInt(options.limit) || 25;

  const dimensions = options.dimensions
    ? options.dimensions.split(',').map(d => ({ name: d.trim() }))
    : [{ name: 'date' }];

  const metrics = options.metrics
    ? options.metrics.split(',').map(m => ({ name: m.trim() }))
    : [{ name: 'sessions' }, { name: 'activeUsers' }, { name: 'screenPageViews' }];

  const response = await analytics.properties.runReport({
    property: `properties/${propertyId}`,
    requestBody: {
      dateRanges: [{ startDate, endDate }],
      dimensions,
      metrics,
      limit
    }
  });

  const data = response.data;
  const dimHeaders = (data.dimensionHeaders || []).map(h => h.name);
  const metHeaders = (data.metricHeaders || []).map(h => h.name);

  return (data.rows || []).map(row => {
    const result = {};
    dimHeaders.forEach((h, i) => { result[h] = row.dimensionValues[i]?.value; });
    metHeaders.forEach((h, i) => { result[h] = row.metricValues[i]?.value; });
    return result;
  });
}

/**
 * Top pages by page views
 */
async function topPages(email, propertyId, options = {}) {
  const analytics = await getAnalyticsApi(email);

  const response = await analytics.properties.runReport({
    property: `properties/${propertyId}`,
    requestBody: {
      dateRanges: [{ startDate: options.start || '30daysAgo', endDate: options.end || 'today' }],
      dimensions: [{ name: 'pagePath' }, { name: 'pageTitle' }],
      metrics: [
        { name: 'screenPageViews' },
        { name: 'activeUsers' },
        { name: 'averageSessionDuration' },
        { name: 'bounceRate' }
      ],
      orderBys: [{ metric: { metricName: 'screenPageViews' }, desc: true }],
      limit: parseInt(options.limit) || 25
    }
  });

  const data = response.data;
  return (data.rows || []).map(row => ({
    path: row.dimensionValues[0]?.value,
    title: row.dimensionValues[1]?.value,
    pageViews: parseInt(row.metricValues[0]?.value || '0'),
    activeUsers: parseInt(row.metricValues[1]?.value || '0'),
    avgSessionDuration: parseFloat(row.metricValues[2]?.value || '0').toFixed(1),
    bounceRate: (parseFloat(row.metricValues[3]?.value || '0') * 100).toFixed(1) + '%'
  }));
}

/**
 * Top traffic sources
 */
async function topSources(email, propertyId, options = {}) {
  const analytics = await getAnalyticsApi(email);

  const response = await analytics.properties.runReport({
    property: `properties/${propertyId}`,
    requestBody: {
      dateRanges: [{ startDate: options.start || '30daysAgo', endDate: options.end || 'today' }],
      dimensions: [{ name: 'sessionSource' }, { name: 'sessionMedium' }],
      metrics: [
        { name: 'sessions' },
        { name: 'activeUsers' },
        { name: 'conversions' },
        { name: 'bounceRate' }
      ],
      orderBys: [{ metric: { metricName: 'sessions' }, desc: true }],
      limit: parseInt(options.limit) || 25
    }
  });

  const data = response.data;
  return (data.rows || []).map(row => ({
    source: row.dimensionValues[0]?.value,
    medium: row.dimensionValues[1]?.value,
    sessions: parseInt(row.metricValues[0]?.value || '0'),
    activeUsers: parseInt(row.metricValues[1]?.value || '0'),
    conversions: parseInt(row.metricValues[2]?.value || '0'),
    bounceRate: (parseFloat(row.metricValues[3]?.value || '0') * 100).toFixed(1) + '%'
  }));
}

/**
 * Audience overview: users, sessions, engagement
 */
async function audienceOverview(email, propertyId, options = {}) {
  const analytics = await getAnalyticsApi(email);

  const response = await analytics.properties.runReport({
    property: `properties/${propertyId}`,
    requestBody: {
      dateRanges: [{ startDate: options.start || '30daysAgo', endDate: options.end || 'today' }],
      dimensions: [{ name: 'date' }],
      metrics: [
        { name: 'activeUsers' },
        { name: 'newUsers' },
        { name: 'sessions' },
        { name: 'screenPageViews' },
        { name: 'averageSessionDuration' },
        { name: 'bounceRate' }
      ],
      orderBys: [{ dimension: { dimensionName: 'date' } }]
    }
  });

  const data = response.data;
  return (data.rows || []).map(row => ({
    date: row.dimensionValues[0]?.value,
    activeUsers: parseInt(row.metricValues[0]?.value || '0'),
    newUsers: parseInt(row.metricValues[1]?.value || '0'),
    sessions: parseInt(row.metricValues[2]?.value || '0'),
    pageViews: parseInt(row.metricValues[3]?.value || '0'),
    avgSessionDuration: parseFloat(row.metricValues[4]?.value || '0').toFixed(1),
    bounceRate: (parseFloat(row.metricValues[5]?.value || '0') * 100).toFixed(1) + '%'
  }));
}

/**
 * Real-time active users
 */
async function realtimeReport(email, propertyId) {
  const analytics = await getAnalyticsApi(email);

  const response = await analytics.properties.runRealtimeReport({
    property: `properties/${propertyId}`,
    requestBody: {
      dimensions: [{ name: 'country' }, { name: 'pagePath' }],
      metrics: [{ name: 'activeUsers' }],
      limit: 25
    }
  });

  const data = response.data;
  const total = data.totals?.[0]?.metricValues?.[0]?.value || '0';

  const rows = (data.rows || []).map(row => ({
    country: row.dimensionValues[0]?.value,
    page: row.dimensionValues[1]?.value,
    activeUsers: parseInt(row.metricValues[0]?.value || '0')
  }));

  return { totalActiveUsers: parseInt(total), breakdown: rows };
}

/**
 * Conversion events summary
 */
async function conversions(email, propertyId, options = {}) {
  const analytics = await getAnalyticsApi(email);

  const response = await analytics.properties.runReport({
    property: `properties/${propertyId}`,
    requestBody: {
      dateRanges: [{ startDate: options.start || '30daysAgo', endDate: options.end || 'today' }],
      dimensions: [{ name: 'eventName' }],
      metrics: [{ name: 'conversions' }, { name: 'totalRevenue' }],
      orderBys: [{ metric: { metricName: 'conversions' }, desc: true }],
      limit: parseInt(options.limit) || 25
    }
  });

  const data = response.data;
  return (data.rows || []).map(row => ({
    event: row.dimensionValues[0]?.value,
    conversions: parseInt(row.metricValues[0]?.value || '0'),
    revenue: parseFloat(row.metricValues[1]?.value || '0').toFixed(2)
  }));
}

// CLI
function printHelp() {
  showHelp('Google Analytics (GA4) Operations', {
    'Commands': [
      'properties                  List GA4 properties accessible to the account',
      'report                      Run a custom analytics report',
      'top-pages                   Top pages by page views',
      'top-sources                 Top traffic sources',
      'overview                    Daily audience overview (users, sessions, engagement)',
      'realtime                    Current active users on the site',
      'conversions                 Conversion events summary',
      'help                        Show this help'
    ],
    'Options': [
      '--account EMAIL             Google account (required)',
      '--property ID               GA4 property ID, e.g. 123456789 (required for most commands)',
      '--start DATE                Start date (YYYY-MM-DD or e.g. 30daysAgo, default: 30daysAgo)',
      '--end DATE                  End date (YYYY-MM-DD or e.g. today, default: today)',
      '--limit N                   Max rows returned (default: 25)',
      '--dimensions d1,d2          Comma-separated dimension names (for report command)',
      '--metrics m1,m2             Comma-separated metric names (for report command)',
      '--json                      Output as JSON'
    ],
    'Examples': [
      'node analytics.js properties --account user@example.com',
      'node analytics.js top-pages --property 123456789 --account user@example.com',
      'node analytics.js top-pages --property 123456789 --start 7daysAgo --limit 10 --account user@example.com',
      'node analytics.js top-sources --property 123456789 --account user@example.com',
      'node analytics.js overview --property 123456789 --start 2025-01-01 --end 2025-01-31 --account user@example.com',
      'node analytics.js realtime --property 123456789 --account user@example.com',
      'node analytics.js conversions --property 123456789 --account user@example.com',
      'node analytics.js report --property 123456789 --dimensions "city,deviceCategory" --metrics "sessions,activeUsers" --account user@example.com'
    ],
    'Finding Your Property ID': [
      'Run: node analytics.js properties --account user@example.com',
      'Or: GA4 > Admin > Property Settings > Property ID (numeric, not UA-...)'
    ]
  });
}

async function main() {
  const { command, args, flags } = parseArgs();

  const email = flags.account;

  if (command !== 'help' && !email) {
    console.error('Error: --account is required');
    process.exit(1);
  }

  if (command !== 'help') {
    requireApi(email, 'analytics', 'analytics.js');
  }

  try {
    switch (command) {
      case 'properties': {
        const props = await listProperties(email);
        if (flags.json) {
          output(props);
        } else {
          console.log(`\nGA4 Properties (${props.length}):\n`);
          for (const p of props) {
            const id = p.name.replace('properties/', '');
            console.log(`  ${p.displayName}`);
            console.log(`    ID: ${id}`);
            console.log(`    Type: ${p.propertyType}`);
            console.log(`    Timezone: ${p.timeZone}`);
            console.log('');
          }
        }
        break;
      }

      case 'top-pages': {
        if (!flags.property) throw new Error('--property ID required');
        const pages = await topPages(email, flags.property, { start: flags.start, end: flags.end, limit: flags.limit });
        if (flags.json) {
          output(pages);
        } else {
          console.log(`\nTop Pages (last ${flags.start || '30 days'}):\n`);
          for (const p of pages) {
            console.log(`  ${p.pageViews.toLocaleString()} views  ${p.path}`);
            console.log(`    Title: ${p.title}`);
            console.log(`    Users: ${p.activeUsers.toLocaleString()}  Avg time: ${p.avgSessionDuration}s  Bounce: ${p.bounceRate}`);
            console.log('');
          }
        }
        break;
      }

      case 'top-sources': {
        if (!flags.property) throw new Error('--property ID required');
        const sources = await topSources(email, flags.property, { start: flags.start, end: flags.end, limit: flags.limit });
        if (flags.json) {
          output(sources);
        } else {
          console.log(`\nTop Traffic Sources (last ${flags.start || '30 days'}):\n`);
          for (const s of sources) {
            console.log(`  ${s.sessions.toLocaleString()} sessions  ${s.source} / ${s.medium}`);
            console.log(`    Users: ${s.activeUsers.toLocaleString()}  Conversions: ${s.conversions}  Bounce: ${s.bounceRate}`);
            console.log('');
          }
        }
        break;
      }

      case 'overview': {
        if (!flags.property) throw new Error('--property ID required');
        const rows = await audienceOverview(email, flags.property, { start: flags.start, end: flags.end });
        if (flags.json) {
          output(rows);
        } else {
          const totals = rows.reduce((acc, r) => {
            acc.sessions += r.sessions;
            acc.activeUsers += r.activeUsers;
            acc.newUsers += r.newUsers;
            acc.pageViews += r.pageViews;
            return acc;
          }, { sessions: 0, activeUsers: 0, newUsers: 0, pageViews: 0 });
          console.log(`\nAudience Overview (${flags.start || '30daysAgo'} to ${flags.end || 'today'}):\n`);
          console.log(`  Sessions:     ${totals.sessions.toLocaleString()}`);
          console.log(`  Active Users: ${totals.activeUsers.toLocaleString()}`);
          console.log(`  New Users:    ${totals.newUsers.toLocaleString()}`);
          console.log(`  Page Views:   ${totals.pageViews.toLocaleString()}`);
          console.log('');
          if (flags.daily) {
            console.log('Daily breakdown:');
            for (const r of rows) {
              console.log(`  ${r.date}  sessions:${r.sessions}  users:${r.activeUsers}  views:${r.pageViews}`);
            }
          }
        }
        break;
      }

      case 'realtime': {
        if (!flags.property) throw new Error('--property ID required');
        const rt = await realtimeReport(email, flags.property);
        if (flags.json) {
          output(rt);
        } else {
          console.log(`\nReal-time: ${rt.totalActiveUsers} active users\n`);
          for (const r of rt.breakdown) {
            console.log(`  ${r.activeUsers} users  ${r.page}  (${r.country})`);
          }
        }
        break;
      }

      case 'conversions': {
        if (!flags.property) throw new Error('--property ID required');
        const convs = await conversions(email, flags.property, { start: flags.start, end: flags.end, limit: flags.limit });
        if (flags.json) {
          output(convs);
        } else {
          console.log(`\nConversions (last ${flags.start || '30 days'}):\n`);
          for (const c of convs) {
            console.log(`  ${c.conversions.toLocaleString()}  ${c.event}  (revenue: $${c.revenue})`);
          }
        }
        break;
      }

      case 'report': {
        if (!flags.property) throw new Error('--property ID required');
        const rows = await runReport(email, flags.property, {
          start: flags.start,
          end: flags.end,
          limit: flags.limit,
          dimensions: flags.dimensions,
          metrics: flags.metrics
        });
        output(rows);
        break;
      }

      case 'help':
      default:
        printHelp();
    }
  } catch (error) {
    outputError(error);
  }
}

main();
