#!/usr/bin/env node
/**
 * Cloudflare Analytics Script
 * Get analytics data for your zones.
 */

import { parseArgs, apiRequest, resolveZoneId, output, outputError } from './utils.js';

function showHelp() {
  console.log(`
Analytics Script - Get Cloudflare zone analytics

Usage: node scripts/analytics.js <command> [options]

Commands:
  dashboard <zone>                Get dashboard analytics
  requests <zone>                 Get request analytics
  bandwidth <zone>                Get bandwidth analytics
  threats <zone>                  Get threat analytics
  performance <zone>              Get performance metrics
  help                            Show this help

Options:
  --since <duration>        Time range: -1h, -6h, -24h, -7d, -30d (default: -24h)
  --continuous              Get continuous data (vs aggregate)

Examples:
  node scripts/analytics.js dashboard example.com
  node scripts/analytics.js requests example.com --since -7d
  node scripts/analytics.js bandwidth example.com --since -30d
  node scripts/analytics.js threats example.com
  node scripts/analytics.js performance example.com --since -1h

Note: Analytics data may have up to 24-hour delay for free plans.
`);
}

function parseSince(since = '-24h') {
  const now = new Date();
  const match = since.match(/^-(\d+)(h|d)$/);
  
  if (!match) {
    throw new Error('Invalid --since format. Use -1h, -6h, -24h, -7d, or -30d');
  }

  const value = parseInt(match[1]);
  const unit = match[2];

  if (unit === 'h') {
    now.setHours(now.getHours() - value);
  } else if (unit === 'd') {
    now.setDate(now.getDate() - value);
  }

  return now.toISOString();
}

async function getDashboard(zoneIdentifier, flags) {
  const zoneId = await resolveZoneId(zoneIdentifier);
  const since = parseSince(flags.since);

  const data = await apiRequest(`/zones/${zoneId}/analytics/dashboard?since=${since}&continuous=${flags.continuous || false}`);
  
  // Simplify the output
  const result = data.result;
  const summary = {
    period: { since: result.since, until: result.until },
    totals: {
      requests: result.totals?.requests?.all,
      bandwidth: result.totals?.bandwidth?.all,
      threats: result.totals?.threats?.all,
      pageviews: result.totals?.pageviews?.all,
      uniques: result.totals?.uniques?.all
    }
  };
  
  output(summary);
}

async function getRequests(zoneIdentifier, flags) {
  const zoneId = await resolveZoneId(zoneIdentifier);
  const since = parseSince(flags.since);

  const data = await apiRequest(`/zones/${zoneId}/analytics/dashboard?since=${since}`);
  
  const result = data.result;
  const requests = {
    period: { since: result.since, until: result.until },
    totals: {
      all: result.totals?.requests?.all,
      cached: result.totals?.requests?.cached,
      uncached: result.totals?.requests?.uncached,
      ssl: {
        encrypted: result.totals?.requests?.ssl?.encrypted,
        unencrypted: result.totals?.requests?.ssl?.unencrypted
      }
    },
    by_country: result.totals?.requests?.country,
    by_status: result.totals?.requests?.http_status
  };
  
  output(requests);
}

async function getBandwidth(zoneIdentifier, flags) {
  const zoneId = await resolveZoneId(zoneIdentifier);
  const since = parseSince(flags.since);

  const data = await apiRequest(`/zones/${zoneId}/analytics/dashboard?since=${since}`);
  
  const result = data.result;
  const bandwidth = {
    period: { since: result.since, until: result.until },
    totals: {
      all: result.totals?.bandwidth?.all,
      cached: result.totals?.bandwidth?.cached,
      uncached: result.totals?.bandwidth?.uncached,
      ssl: {
        encrypted: result.totals?.bandwidth?.ssl?.encrypted,
        unencrypted: result.totals?.bandwidth?.ssl?.unencrypted
      }
    },
    by_content_type: result.totals?.bandwidth?.content_type,
    by_country: result.totals?.bandwidth?.country
  };
  
  // Convert bytes to human-readable
  bandwidth.totals_readable = {
    all: formatBytes(bandwidth.totals.all),
    cached: formatBytes(bandwidth.totals.cached),
    uncached: formatBytes(bandwidth.totals.uncached)
  };
  
  output(bandwidth);
}

async function getThreats(zoneIdentifier, flags) {
  const zoneId = await resolveZoneId(zoneIdentifier);
  const since = parseSince(flags.since);

  const data = await apiRequest(`/zones/${zoneId}/analytics/dashboard?since=${since}`);
  
  const result = data.result;
  const threats = {
    period: { since: result.since, until: result.until },
    totals: {
      all: result.totals?.threats?.all,
      by_type: result.totals?.threats?.type,
      by_country: result.totals?.threats?.country
    }
  };
  
  output(threats);
}

async function getPerformance(zoneIdentifier, flags) {
  const zoneId = await resolveZoneId(zoneIdentifier);
  const since = parseSince(flags.since);

  const data = await apiRequest(`/zones/${zoneId}/analytics/dashboard?since=${since}`);
  
  const result = data.result;
  const performance = {
    period: { since: result.since, until: result.until },
    cache_ratio: result.totals?.requests?.all > 0 
      ? ((result.totals?.requests?.cached / result.totals?.requests?.all) * 100).toFixed(2) + '%'
      : 'N/A',
    bandwidth_saved: result.totals?.bandwidth?.all > 0
      ? ((result.totals?.bandwidth?.cached / result.totals?.bandwidth?.all) * 100).toFixed(2) + '%'
      : 'N/A',
    ssl_percentage: result.totals?.requests?.all > 0
      ? ((result.totals?.requests?.ssl?.encrypted / result.totals?.requests?.all) * 100).toFixed(2) + '%'
      : 'N/A'
  };
  
  output(performance);
}

function formatBytes(bytes) {
  if (!bytes) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let i = 0;
  while (bytes >= 1024 && i < units.length - 1) {
    bytes /= 1024;
    i++;
  }
  return `${bytes.toFixed(2)} ${units[i]}`;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const command = args._[0] || 'help';

  if (command === 'help') {
    showHelp();
    return;
  }

  try {
    switch (command) {
      case 'dashboard':
        if (!args._[1]) throw new Error('Zone required');
        await getDashboard(args._[1], args);
        break;

      case 'requests':
        if (!args._[1]) throw new Error('Zone required');
        await getRequests(args._[1], args);
        break;

      case 'bandwidth':
        if (!args._[1]) throw new Error('Zone required');
        await getBandwidth(args._[1], args);
        break;

      case 'threats':
        if (!args._[1]) throw new Error('Zone required');
        await getThreats(args._[1], args);
        break;

      case 'performance':
        if (!args._[1]) throw new Error('Zone required');
        await getPerformance(args._[1], args);
        break;

      default:
        console.error(`Unknown command: ${command}`);
        showHelp();
        process.exit(1);
    }
  } catch (error) {
    outputError(error);
  }
}

main();
