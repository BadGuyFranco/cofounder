#!/usr/bin/env node
/**
 * Google Ads API Operations
 * Manage campaigns, ad groups, keywords, and pull performance data.
 *
 * Requires a Google Ads developer token and customer ID in addition to OAuth.
 * Store these in /memory/connectors/google/.env:
 *   GOOGLE_ADS_DEVELOPER_TOKEN=your_developer_token
 *   GOOGLE_ADS_CUSTOMER_ID=1234567890  (without hyphens)
 *
 * Usage:
 *   node ads.js customers --account user@example.com
 *   node ads.js campaigns --account user@example.com
 *   node ads.js performance --account user@example.com
 *   node ads.js keywords --campaign CAMPAIGN_ID --account user@example.com
 */

// Dependency check (must be first, before any npm imports)
import { ensureDeps } from '../../../system/shared/ensure-deps.js';
ensureDeps(import.meta.url);

// Local modules
import {
  parseArgs,
  output,
  outputError,
  showHelp,
  requireApi,
  loadEnvFile,
  loadConfig
} from './utils.js';
import { getAuthClient } from './auth.js';

const ADS_BASE = 'https://googleads.googleapis.com/v18';

/**
 * Build authenticated headers for Google Ads REST API
 */
async function getAdsHeaders(email) {
  const env = loadEnvFile();
  const developerToken = env.GOOGLE_ADS_DEVELOPER_TOKEN;
  const loginCustomerId = env.GOOGLE_ADS_LOGIN_CUSTOMER_ID || env.GOOGLE_ADS_CUSTOMER_ID;

  if (!developerToken) {
    throw new Error(
      'GOOGLE_ADS_DEVELOPER_TOKEN not found in /memory/connectors/google/.env\n' +
      'Apply for a developer token at: https://developers.google.com/google-ads/api/docs/get-started/dev-token'
    );
  }

  const auth = await getAuthClient(email);
  const tokenResponse = await auth.getAccessToken();
  const accessToken = tokenResponse.token;

  const headers = {
    'Authorization': `Bearer ${accessToken}`,
    'developer-token': developerToken,
    'Content-Type': 'application/json'
  };

  if (loginCustomerId) {
    headers['login-customer-id'] = loginCustomerId.replace(/-/g, '');
  }

  return headers;
}

/**
 * Execute a Google Ads Query Language (GAQL) query
 */
async function runQuery(email, customerId, gaql) {
  const headers = await getAdsHeaders(email);
  const cid = customerId.replace(/-/g, '');

  const response = await fetch(`${ADS_BASE}/customers/${cid}/googleAds:searchStream`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ query: gaql })
  });

  if (!response.ok) {
    const text = await response.text();
    let msg = `Google Ads API error ${response.status}`;
    try {
      const data = JSON.parse(text);
      msg = data[0]?.error?.message || msg;
    } catch {}
    throw new Error(msg);
  }

  const text = await response.text();
  // searchStream returns NDJSON - one JSON object per line
  const results = [];
  for (const line of text.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    try {
      const parsed = JSON.parse(trimmed);
      if (parsed.results) results.push(...parsed.results);
    } catch {}
  }
  return results;
}

/**
 * List accessible customer accounts
 */
async function listCustomers(email) {
  const headers = await getAdsHeaders(email);

  const response = await fetch(`${ADS_BASE}/customers:listAccessibleCustomers`, {
    headers
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Failed to list customers: ${text}`);
  }

  const data = await response.json();
  return (data.resourceNames || []).map(name => ({
    resourceName: name,
    customerId: name.replace('customers/', '')
  }));
}

/**
 * List campaigns for a customer
 */
async function listCampaigns(email, customerId) {
  const rows = await runQuery(email, customerId, `
    SELECT
      campaign.id,
      campaign.name,
      campaign.status,
      campaign.advertising_channel_type,
      campaign.bidding_strategy_type,
      campaign_budget.amount_micros,
      metrics.impressions,
      metrics.clicks,
      metrics.cost_micros,
      metrics.conversions,
      metrics.average_cpc
    FROM campaign
    WHERE campaign.status != 'REMOVED'
    ORDER BY metrics.impressions DESC
    LIMIT 50
  `);

  return rows.map(r => ({
    id: r.campaign?.id,
    name: r.campaign?.name,
    status: r.campaign?.status,
    channelType: r.campaign?.advertisingChannelType,
    biddingStrategy: r.campaign?.biddingStrategyType,
    dailyBudget: r.campaignBudget?.amountMicros
      ? (parseInt(r.campaignBudget.amountMicros) / 1000000).toFixed(2)
      : null,
    impressions: parseInt(r.metrics?.impressions || '0'),
    clicks: parseInt(r.metrics?.clicks || '0'),
    spend: r.metrics?.costMicros
      ? (parseInt(r.metrics.costMicros) / 1000000).toFixed(2)
      : '0.00',
    conversions: parseFloat(r.metrics?.conversions || '0').toFixed(1),
    avgCpc: r.metrics?.averageCpc
      ? (parseInt(r.metrics.averageCpc) / 1000000).toFixed(2)
      : null
  }));
}

/**
 * Account-level performance summary
 */
async function getPerformance(email, customerId, options = {}) {
  const dateRange = options.start
    ? `segments.date BETWEEN '${options.start}' AND '${options.end || new Date().toISOString().slice(0, 10)}'`
    : `segments.date DURING LAST_30_DAYS`;

  const rows = await runQuery(email, customerId, `
    SELECT
      metrics.impressions,
      metrics.clicks,
      metrics.cost_micros,
      metrics.conversions,
      metrics.conversions_value,
      metrics.ctr,
      metrics.average_cpc,
      metrics.average_cpm,
      metrics.interaction_rate
    FROM customer
    WHERE ${dateRange}
    LIMIT 1
  `);

  if (!rows.length) return null;
  const m = rows[0].metrics;
  return {
    impressions: parseInt(m?.impressions || '0'),
    clicks: parseInt(m?.clicks || '0'),
    spend: ((parseInt(m?.costMicros || '0')) / 1000000).toFixed(2),
    conversions: parseFloat(m?.conversions || '0').toFixed(1),
    conversionValue: parseFloat(m?.conversionsValue || '0').toFixed(2),
    ctr: (parseFloat(m?.ctr || '0') * 100).toFixed(2) + '%',
    avgCpc: ((parseInt(m?.averageCpc || '0')) / 1000000).toFixed(2),
    avgCpm: ((parseInt(m?.averageCpm || '0')) / 1000000).toFixed(2)
  };
}

/**
 * List keywords for a campaign or all campaigns
 */
async function listKeywords(email, customerId, options = {}) {
  const campaignFilter = options.campaign
    ? `AND campaign.id = ${options.campaign}`
    : '';

  const rows = await runQuery(email, customerId, `
    SELECT
      campaign.name,
      ad_group.name,
      ad_group_criterion.keyword.text,
      ad_group_criterion.keyword.match_type,
      ad_group_criterion.status,
      metrics.impressions,
      metrics.clicks,
      metrics.cost_micros,
      metrics.average_cpc,
      metrics.conversions
    FROM keyword_view
    WHERE ad_group_criterion.status != 'REMOVED'
      AND segments.date DURING LAST_30_DAYS
      ${campaignFilter}
    ORDER BY metrics.impressions DESC
    LIMIT ${parseInt(options.limit) || 50}
  `);

  return rows.map(r => ({
    campaign: r.campaign?.name,
    adGroup: r.adGroup?.name,
    keyword: r.adGroupCriterion?.keyword?.text,
    matchType: r.adGroupCriterion?.keyword?.matchType,
    status: r.adGroupCriterion?.status,
    impressions: parseInt(r.metrics?.impressions || '0'),
    clicks: parseInt(r.metrics?.clicks || '0'),
    spend: ((parseInt(r.metrics?.costMicros || '0')) / 1000000).toFixed(2),
    avgCpc: ((parseInt(r.metrics?.averageCpc || '0')) / 1000000).toFixed(2),
    conversions: parseFloat(r.metrics?.conversions || '0').toFixed(1)
  }));
}

/**
 * List ad groups
 */
async function listAdGroups(email, customerId, options = {}) {
  const campaignFilter = options.campaign
    ? `AND campaign.id = ${options.campaign}`
    : '';

  const rows = await runQuery(email, customerId, `
    SELECT
      campaign.name,
      ad_group.id,
      ad_group.name,
      ad_group.status,
      ad_group.type,
      metrics.impressions,
      metrics.clicks,
      metrics.cost_micros,
      metrics.conversions
    FROM ad_group
    WHERE ad_group.status != 'REMOVED'
      AND segments.date DURING LAST_30_DAYS
      ${campaignFilter}
    ORDER BY metrics.impressions DESC
    LIMIT ${parseInt(options.limit) || 50}
  `);

  return rows.map(r => ({
    campaign: r.campaign?.name,
    id: r.adGroup?.id,
    name: r.adGroup?.name,
    status: r.adGroup?.status,
    type: r.adGroup?.type,
    impressions: parseInt(r.metrics?.impressions || '0'),
    clicks: parseInt(r.metrics?.clicks || '0'),
    spend: ((parseInt(r.metrics?.costMicros || '0')) / 1000000).toFixed(2),
    conversions: parseFloat(r.metrics?.conversions || '0').toFixed(1)
  }));
}

// CLI
function printHelp() {
  showHelp('Google Ads API Operations', {
    'Setup Required': [
      'Add to /memory/connectors/google/.env:',
      '  GOOGLE_ADS_DEVELOPER_TOKEN=your_token',
      '  GOOGLE_ADS_CUSTOMER_ID=1234567890',
      '  GOOGLE_ADS_LOGIN_CUSTOMER_ID=MCC_ID  (if using manager account)',
      '',
      'Get a developer token: https://developers.google.com/google-ads/api/docs/get-started/dev-token'
    ],
    'Commands': [
      'customers                   List accessible Ads customer accounts',
      'campaigns                   List campaigns with performance metrics',
      'ad-groups                   List ad groups',
      'keywords                    List keywords with performance',
      'performance                 Account-level performance summary',
      'query GAQL                  Run a raw GAQL query',
      'help                        Show this help'
    ],
    'Options': [
      '--account EMAIL             Google account (required)',
      '--customer ID               Customer/account ID (if not set in .env)',
      '--campaign ID               Filter by campaign ID',
      '--start DATE                Start date YYYY-MM-DD',
      '--end DATE                  End date YYYY-MM-DD',
      '--limit N                   Max rows (default: 50)',
      '--json                      Output as JSON'
    ],
    'Examples': [
      'node ads.js customers --account user@example.com',
      'node ads.js campaigns --account user@example.com',
      'node ads.js performance --account user@example.com',
      'node ads.js keywords --account user@example.com',
      'node ads.js keywords --campaign 12345 --account user@example.com',
      'node ads.js ad-groups --account user@example.com'
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
    requireApi(email, 'ads', 'ads.js');
  }

  // Resolve customer ID: flag > .env
  function getCustomerId() {
    if (flags.customer) return flags.customer;
    const env = loadEnvFile();
    const cid = env.GOOGLE_ADS_CUSTOMER_ID;
    if (!cid) {
      throw new Error(
        'Customer ID required. Set GOOGLE_ADS_CUSTOMER_ID in /memory/connectors/google/.env or use --customer ID'
      );
    }
    return cid;
  }

  try {
    switch (command) {
      case 'customers': {
        const customers = await listCustomers(email);
        if (flags.json) {
          output(customers);
        } else {
          console.log(`\nAccessible Customers (${customers.length}):\n`);
          for (const c of customers) {
            console.log(`  ID: ${c.customerId}`);
          }
        }
        break;
      }

      case 'campaigns': {
        const cid = getCustomerId();
        const campaigns = await listCampaigns(email, cid);
        if (flags.json) {
          output(campaigns);
        } else {
          console.log(`\nCampaigns (${campaigns.length}):\n`);
          for (const c of campaigns) {
            console.log(`  [${c.status}] ${c.name}`);
            console.log(`    ID: ${c.id}  Type: ${c.channelType}  Budget: $${c.dailyBudget}/day`);
            console.log(`    Impressions: ${c.impressions.toLocaleString()}  Clicks: ${c.clicks.toLocaleString()}  Spend: $${c.spend}  Conv: ${c.conversions}`);
            console.log('');
          }
        }
        break;
      }

      case 'performance': {
        const cid = getCustomerId();
        const perf = await getPerformance(email, cid, { start: flags.start, end: flags.end });
        if (!perf) {
          console.log('No data found for the specified period.');
        } else if (flags.json) {
          output(perf);
        } else {
          console.log('\nAccount Performance Summary:\n');
          console.log(`  Impressions:  ${perf.impressions.toLocaleString()}`);
          console.log(`  Clicks:       ${perf.clicks.toLocaleString()}`);
          console.log(`  CTR:          ${perf.ctr}`);
          console.log(`  Spend:        $${perf.spend}`);
          console.log(`  Avg CPC:      $${perf.avgCpc}`);
          console.log(`  Conversions:  ${perf.conversions}`);
          console.log(`  Conv Value:   $${perf.conversionValue}`);
        }
        break;
      }

      case 'keywords': {
        const cid = getCustomerId();
        const keywords = await listKeywords(email, cid, { campaign: flags.campaign, limit: flags.limit });
        if (flags.json) {
          output(keywords);
        } else {
          console.log(`\nKeywords (${keywords.length}):\n`);
          for (const k of keywords) {
            console.log(`  [${k.matchType}] ${k.keyword}`);
            console.log(`    Campaign: ${k.campaign}  Ad Group: ${k.adGroup}`);
            console.log(`    Impressions: ${k.impressions.toLocaleString()}  Clicks: ${k.clicks}  Spend: $${k.spend}  Avg CPC: $${k.avgCpc}`);
            console.log('');
          }
        }
        break;
      }

      case 'ad-groups': {
        const cid = getCustomerId();
        const groups = await listAdGroups(email, cid, { campaign: flags.campaign, limit: flags.limit });
        if (flags.json) {
          output(groups);
        } else {
          console.log(`\nAd Groups (${groups.length}):\n`);
          for (const g of groups) {
            console.log(`  [${g.status}] ${g.name}`);
            console.log(`    Campaign: ${g.campaign}  ID: ${g.id}`);
            console.log(`    Impressions: ${g.impressions.toLocaleString()}  Clicks: ${g.clicks}  Spend: $${g.spend}`);
            console.log('');
          }
        }
        break;
      }

      case 'query': {
        if (!args[0]) throw new Error('GAQL query required');
        const cid = getCustomerId();
        const rows = await runQuery(email, cid, args.join(' '));
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
