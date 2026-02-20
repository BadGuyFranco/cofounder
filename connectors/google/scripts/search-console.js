#!/usr/bin/env node
/**
 * Google Search Console Operations
 * Query search analytics, inspect URLs, manage sitemaps, and audit SEO data.
 *
 * Usage:
 *   node search-console.js sites --account user@example.com
 *   node search-console.js search-analytics --site https://example.com/ --account user@example.com
 *   node search-console.js top-queries --site https://example.com/ --rows 25 --account user@example.com
 *   node search-console.js top-pages --site https://example.com/ --rows 25 --account user@example.com
 *   node search-console.js ctr-opportunities --site https://example.com/ --account user@example.com
 *   node search-console.js url-inspect --site https://example.com/ --url https://example.com/page --account user@example.com
 *   node search-console.js sitemaps --site https://example.com/ --account user@example.com
 *   node search-console.js submit-sitemap --site https://example.com/ --sitemap https://example.com/sitemap.xml --account user@example.com
 *   node search-console.js delete-sitemap --site https://example.com/ --sitemap https://example.com/sitemap.xml --account user@example.com
 */

// Dependency check (must be first, before any npm imports)
import { ensureDeps } from '../../../system/shared/ensure-deps.js';
ensureDeps(import.meta.url);

// npm packages (dynamic import after dependency check)
const { google } = await import('googleapis');

// Built-in Node.js modules
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';

// Local modules
import { getAuthClient } from './auth.js';
import {
  parseArgs,
  output,
  outputError,
  showHelp,
  requireApi,
  getMemoryDir
} from './utils.js';

const SITES_CACHE_PATH = join(getMemoryDir(), 'search-console-sites.json');

/**
 * Load the sites cache file.
 */
function loadSitesCache() {
  if (!existsSync(SITES_CACHE_PATH)) return {};
  try {
    return JSON.parse(readFileSync(SITES_CACHE_PATH, 'utf-8'));
  } catch {
    return {};
  }
}

/**
 * Save the sites cache file.
 */
function saveSitesCache(cache) {
  const memDir = getMemoryDir();
  if (!existsSync(memDir)) mkdirSync(memDir, { recursive: true });
  writeFileSync(SITES_CACHE_PATH, JSON.stringify(cache, null, 2));
}

/**
 * Get verified properties for an account from the cache.
 * Returns an array of property objects or null if not cached.
 */
export function getCachedSites(email) {
  const cache = loadSitesCache();
  return cache[email]?.properties || null;
}

// -------------------------------------------------------------------
// API clients
// -------------------------------------------------------------------

async function getWebmastersApi(email) {
  requireApi(email, 'search_console', 'search-console.js');
  const auth = await getAuthClient(email);
  return google.webmasters({ version: 'v3', auth });
}

async function getSearchConsoleApi(email) {
  requireApi(email, 'search_console', 'search-console.js');
  const auth = await getAuthClient(email);
  return google.searchconsole({ version: 'v1', auth });
}

// -------------------------------------------------------------------
// Helpers
// -------------------------------------------------------------------

/**
 * Format a site URL for GSC API calls.
 * Accepts bare domains (example.com), URLs (https://example.com/),
 * or sc-domain: prefix. Returns the most likely correct GSC property format.
 */
function formatSiteUrl(site) {
  if (site.startsWith('sc-domain:') || site.startsWith('http')) {
    return site;
  }
  // Bare domain: try sc-domain prefix (domain property covers all protocols/subdomains)
  return `sc-domain:${site}`;
}

/**
 * Get default date range: start 28 days ago, end yesterday.
 */
function defaultDateRange() {
  const end = new Date();
  end.setDate(end.getDate() - 1);
  const start = new Date();
  start.setDate(start.getDate() - 29);
  return {
    startDate: start.toISOString().slice(0, 10),
    endDate: end.toISOString().slice(0, 10)
  };
}

/**
 * Pad a string to a fixed width, truncating if needed.
 */
function col(str, width) {
  const s = String(str ?? '');
  if (s.length > width) return s.slice(0, width - 1) + '.';
  return s.padEnd(width);
}

/**
 * Format a number with commas.
 */
function fmtNum(n) {
  return Number(n ?? 0).toLocaleString();
}

/**
 * Format CTR as a percentage.
 */
function fmtCtr(n) {
  return (Number(n ?? 0) * 100).toFixed(1) + '%';
}

/**
 * Format position to one decimal place.
 */
function fmtPos(n) {
  return Number(n ?? 0).toFixed(1);
}

// -------------------------------------------------------------------
// Commands
// -------------------------------------------------------------------

/**
 * List all verified Search Console properties for the account.
 */
async function listSites(email) {
  const wm = await getWebmastersApi(email);
  const res = await wm.sites.list();
  const sites = res.data.siteEntry || [];

  if (sites.length === 0) {
    output('No Search Console properties found for this account.');
    output('Add your site at: https://search.google.com/search-console/welcome');
    return;
  }

  // Auto-save to cache so other tools can look up properties without running this command
  const cache = loadSitesCache();
  cache[email] = {
    last_updated: new Date().toISOString().slice(0, 10),
    properties: sites.map(s => ({
      siteUrl: s.siteUrl,
      permission: s.permissionLevel,
      domain: s.siteUrl.replace('sc-domain:', '').replace(/^https?:\/\//, '').replace(/\/$/, '')
    }))
  };
  saveSitesCache(cache);

  console.log(`\nSearch Console Properties (${sites.length})\n`);
  console.log(col('Property URL', 55) + col('Permission', 15));
  console.log('-'.repeat(70));
  for (const site of sites) {
    console.log(col(site.siteUrl, 55) + col(site.permissionLevel, 15));
  }
  console.log('');
}

/**
 * Query search analytics.
 */
async function searchAnalytics(email, flags) {
  if (!flags.site) {
    console.error('Error: --site is required');
    console.error('Example: node search-console.js search-analytics --site https://example.com/');
    process.exit(1);
  }

  const siteUrl = formatSiteUrl(flags.site);
  const { startDate, endDate } = defaultDateRange();
  const dimensions = flags.dimensions
    ? flags.dimensions.split(',').map(d => d.trim())
    : ['query'];
  const rows = parseInt(flags.rows || '10', 10);
  const searchType = flags['search-type'] || 'web';

  const body = {
    startDate: flags['start-date'] || startDate,
    endDate: flags['end-date'] || endDate,
    dimensions,
    rowLimit: Math.min(rows, 25000),
    searchType
  };

  if (flags['filter-dimension'] && flags['filter-expression']) {
    body.dimensionFilterGroups = [{
      filters: [{
        dimension: flags['filter-dimension'],
        operator: flags['filter-operator'] || 'contains',
        expression: flags['filter-expression']
      }]
    }];
  }

  const wm = await getWebmastersApi(email);
  const res = await wm.searchanalytics.query({ siteUrl, requestBody: body });
  const rows_ = res.data.rows || [];

  if (rows_.length === 0) {
    output(`No data found for ${siteUrl} in the requested date range.`);
    return;
  }

  if (flags.json) {
    output(rows_);
    return;
  }

  const dimLabel = dimensions.join(' + ');
  console.log(`\nSearch Analytics: ${siteUrl}`);
  console.log(`Date range: ${body.startDate} to ${body.endDate}  |  Dimensions: ${dimLabel}  |  Rows: ${rows_.length}\n`);

  const keyWidth = Math.min(60, Math.max(30, process.stdout.columns - 45 || 50));
  console.log(col(dimLabel.toUpperCase(), keyWidth) + col('Clicks', 9) + col('Impr.', 10) + col('CTR', 8) + col('Pos.', 7));
  console.log('-'.repeat(keyWidth + 34));
  for (const row of rows_) {
    const key = row.keys ? row.keys.join(' | ') : '';
    console.log(
      col(key, keyWidth) +
      col(fmtNum(row.clicks), 9) +
      col(fmtNum(row.impressions), 10) +
      col(fmtCtr(row.ctr), 8) +
      col(fmtPos(row.position), 7)
    );
  }
  console.log('');
}

/**
 * Shortcut: top queries by clicks.
 */
async function topQueries(email, flags) {
  await searchAnalytics(email, {
    ...flags,
    dimensions: 'query',
    rows: flags.rows || '25'
  });
}

/**
 * Shortcut: top pages by clicks.
 */
async function topPages(email, flags) {
  await searchAnalytics(email, {
    ...flags,
    dimensions: 'page',
    rows: flags.rows || '25'
  });
}

/**
 * CTR opportunities: queries with high impressions and low CTR.
 * These are the highest-leverage on-page optimization targets.
 */
async function ctrOpportunities(email, flags) {
  if (!flags.site) {
    console.error('Error: --site is required');
    process.exit(1);
  }

  const siteUrl = formatSiteUrl(flags.site);
  const { startDate, endDate } = defaultDateRange();
  const minImpressions = parseInt(flags['min-impressions'] || '100', 10);
  const rows = parseInt(flags.rows || '200', 10);

  const body = {
    startDate: flags['start-date'] || startDate,
    endDate: flags['end-date'] || endDate,
    dimensions: ['query'],
    rowLimit: rows,
    searchType: 'web'
  };

  const wm = await getWebmastersApi(email);
  const res = await wm.searchanalytics.query({ siteUrl, requestBody: body });
  const allRows = res.data.rows || [];

  // Filter: min impressions, sort by CTR ascending
  const opportunities = allRows
    .filter(r => r.impressions >= minImpressions)
    .sort((a, b) => a.ctr - b.ctr)
    .slice(0, parseInt(flags.limit || '50', 10));

  if (opportunities.length === 0) {
    output(`No queries found with ${minImpressions}+ impressions in the date range.`);
    return;
  }

  if (flags.json) {
    output(opportunities);
    return;
  }

  console.log(`\nCTR Opportunities: ${siteUrl}`);
  console.log(`Queries with ${minImpressions}+ impressions, sorted by lowest CTR (title/description optimization targets)\n`);
  console.log(`Date range: ${body.startDate} to ${body.endDate}  |  Showing top ${opportunities.length} results\n`);

  const keyWidth = Math.min(55, process.stdout.columns - 40 || 45);
  console.log(col('QUERY', keyWidth) + col('Impr.', 10) + col('CTR', 8) + col('Clicks', 9) + col('Pos.', 7));
  console.log('-'.repeat(keyWidth + 34));
  for (const row of opportunities) {
    const key = row.keys ? row.keys[0] : '';
    console.log(
      col(key, keyWidth) +
      col(fmtNum(row.impressions), 10) +
      col(fmtCtr(row.ctr), 8) +
      col(fmtNum(row.clicks), 9) +
      col(fmtPos(row.position), 7)
    );
  }
  console.log('\nFix: Update title tags and meta descriptions for these queries to improve CTR.\n');
}

/**
 * Inspect a URL for indexation status, crawl info, and mobile usability.
 */
async function inspectUrl(email, flags) {
  if (!flags.site || !flags.url) {
    console.error('Error: --site and --url are both required');
    console.error('Example: node search-console.js url-inspect --site https://example.com/ --url https://example.com/page');
    process.exit(1);
  }

  const siteUrl = formatSiteUrl(flags.site);
  const sc = await getSearchConsoleApi(email);

  const res = await sc.urlInspection.index.inspect({
    requestBody: {
      inspectionUrl: flags.url,
      siteUrl
    }
  });

  const result = res.data.inspectionResult;

  if (flags.json) {
    output(result);
    return;
  }

  const idx = result.indexStatusResult || {};
  const mobile = result.mobileUsabilityResult || {};
  const rich = result.richResultsResult || {};

  console.log(`\nURL Inspection: ${flags.url}\n`);

  // Indexation
  console.log('--- Indexation ---');
  console.log(`  Verdict:        ${idx.verdict || 'N/A'}`);
  console.log(`  Coverage state: ${idx.coverageState || 'N/A'}`);
  console.log(`  Last crawled:   ${idx.lastCrawlTime ? new Date(idx.lastCrawlTime).toLocaleString() : 'Never'}`);
  console.log(`  Crawled as:     ${idx.crawledAs || 'N/A'}`);
  console.log(`  Page fetch:     ${idx.pageFetchState || 'N/A'}`);
  console.log(`  Indexing state: ${idx.indexingState || 'N/A'}`);
  console.log(`  Robots.txt:     ${idx.robotsTxtState || 'N/A'}`);

  if (idx.googleCanonical || idx.userCanonical) {
    console.log('\n  Canonicals:');
    console.log(`    Google selected: ${idx.googleCanonical || 'N/A'}`);
    console.log(`    User declared:   ${idx.userCanonical || 'N/A'}`);
    if (idx.googleCanonical && idx.userCanonical && idx.googleCanonical !== idx.userCanonical) {
      console.log('    WARNING: Google canonical differs from user-declared canonical.');
    }
  }

  if (idx.sitemap && idx.sitemap.length > 0) {
    console.log(`\n  In sitemaps: ${idx.sitemap.join(', ')}`);
  }

  if (idx.referringUrls && idx.referringUrls.length > 0) {
    console.log(`\n  Referring URLs (up to 3):`);
    for (const url of idx.referringUrls.slice(0, 3)) {
      console.log(`    - ${url}`);
    }
  }

  // Mobile usability
  console.log('\n--- Mobile Usability ---');
  console.log(`  Verdict: ${mobile.verdict || 'N/A'}`);
  if (mobile.issues && mobile.issues.length > 0) {
    for (const issue of mobile.issues) {
      console.log(`  Issue: ${issue.issueType || JSON.stringify(issue)}`);
    }
  }

  // Rich results
  if (rich.verdict || (rich.detectedItems && rich.detectedItems.length > 0)) {
    console.log('\n--- Rich Results ---');
    console.log(`  Verdict: ${rich.verdict || 'N/A'}`);
    if (rich.detectedItems) {
      for (const item of rich.detectedItems) {
        const name = item.richResultType || 'Unknown type';
        const issueCount = (item.items || []).reduce((acc, i) => acc + (i.issues || []).length, 0);
        console.log(`  Type: ${name}  (${issueCount} issue${issueCount !== 1 ? 's' : ''})`);
      }
    }
  }

  if (result.inspectionResultLink) {
    console.log(`\n  Full report: ${result.inspectionResultLink}`);
  }
  console.log('');
}

/**
 * List sitemaps for a property.
 */
async function listSitemaps(email, flags) {
  if (!flags.site) {
    console.error('Error: --site is required');
    process.exit(1);
  }

  const siteUrl = formatSiteUrl(flags.site);
  const wm = await getWebmastersApi(email);
  const res = await wm.sitemaps.list({ siteUrl });
  const sitemaps = res.data.sitemap || [];

  if (sitemaps.length === 0) {
    output(`No sitemaps found for ${siteUrl}.`);
    output(`Submit one: node search-console.js submit-sitemap --site ${flags.site} --sitemap https://yourdomain.com/sitemap.xml`);
    return;
  }

  if (flags.json) {
    output(sitemaps);
    return;
  }

  console.log(`\nSitemaps for ${siteUrl} (${sitemaps.length})\n`);
  console.log(col('Sitemap URL', 60) + col('Submitted', 12) + col('Indexed', 9) + col('Status', 12) + col('Last downloaded', 22));
  console.log('-'.repeat(115));
  for (const sm of sitemaps) {
    const submitted = sm.contents
      ? sm.contents.reduce((acc, c) => acc + (parseInt(c.submitted, 10) || 0), 0)
      : 'N/A';
    const indexed = sm.contents
      ? sm.contents.reduce((acc, c) => acc + (parseInt(c.indexed, 10) || 0), 0)
      : 'N/A';
    const lastDownloaded = sm.lastDownloaded
      ? new Date(sm.lastDownloaded).toLocaleDateString()
      : 'Never';
    const isPending = sm.isPending ? 'Pending' : (sm.errors > 0 ? 'Has errors' : 'OK');
    console.log(
      col(sm.path, 60) +
      col(submitted, 12) +
      col(indexed, 9) +
      col(isPending, 12) +
      col(lastDownloaded, 22)
    );
  }
  console.log('');
}

/**
 * Submit or resubmit a sitemap.
 */
async function submitSitemap(email, flags) {
  if (!flags.site || !flags.sitemap) {
    console.error('Error: --site and --sitemap are both required');
    console.error('Example: node search-console.js submit-sitemap --site https://example.com/ --sitemap https://example.com/sitemap.xml');
    process.exit(1);
  }

  const siteUrl = formatSiteUrl(flags.site);
  const feedpath = flags.sitemap;
  const wm = await getWebmastersApi(email);

  await wm.sitemaps.submit({ siteUrl, feedpath });
  console.log(`\nSitemap submitted successfully.`);
  console.log(`  Site:    ${siteUrl}`);
  console.log(`  Sitemap: ${feedpath}`);
  console.log(`\nGoogle will process the sitemap shortly. Check status with:`);
  console.log(`  node search-console.js sitemaps --site ${flags.site}`);
  console.log('');
}

/**
 * Delete a sitemap from a property.
 */
async function deleteSitemap(email, flags) {
  if (!flags.site || !flags.sitemap) {
    console.error('Error: --site and --sitemap are both required');
    process.exit(1);
  }

  const siteUrl = formatSiteUrl(flags.site);
  const feedpath = flags.sitemap;
  const wm = await getWebmastersApi(email);

  await wm.sitemaps.delete({ siteUrl, feedpath });
  console.log(`\nSitemap deleted from Search Console.`);
  console.log(`  Site:    ${siteUrl}`);
  console.log(`  Sitemap: ${feedpath}\n`);
}

// -------------------------------------------------------------------
// CLI
// -------------------------------------------------------------------

function printHelp() {
  showHelp('Google Search Console', {
    'Commands': [
      'sites                         List all verified Search Console properties',
      'search-analytics              Query search performance data',
      'top-queries                   Top queries by clicks (shortcut)',
      'top-pages                     Top pages by clicks (shortcut)',
      'ctr-opportunities             Queries with high impressions and low CTR',
      'url-inspect                   Inspect a URL for indexation and mobile usability',
      'sitemaps                      List sitemaps for a property',
      'submit-sitemap                Submit or resubmit a sitemap',
      'delete-sitemap                Delete a sitemap from a property',
      'help                          Show this help'
    ],
    'Required Options': [
      '--account EMAIL               Google account email',
      '--site URL                    Search Console property URL (most commands)',
      '--url URL                     Page URL to inspect (url-inspect only)',
      '--sitemap URL                 Sitemap URL (submit-sitemap, delete-sitemap)'
    ],
    'Search Analytics Options': [
      '--dimensions "query,page"     Comma-separated dimensions (query, page, country, device, date)',
      '--rows N                      Number of rows to return (default: 10, max: 25000)',
      '--start-date YYYY-MM-DD       Start date (default: 28 days ago)',
      '--end-date YYYY-MM-DD         End date (default: yesterday)',
      '--search-type web|image|video Search type (default: web)',
      '--filter-dimension dim        Filter dimension (query, page, country, device)',
      '--filter-operator op          Filter operator (contains, equals, notContains, notEquals)',
      '--filter-expression val       Filter value',
      '--json                        Output raw JSON'
    ],
    'CTR Opportunities Options': [
      '--min-impressions N           Minimum impressions to include (default: 100)',
      '--rows N                      Rows to fetch before filtering (default: 200)',
      '--limit N                     Max results to show (default: 50)',
      '--start-date YYYY-MM-DD       Start date (default: 28 days ago)',
      '--end-date YYYY-MM-DD         End date (default: yesterday)'
    ],
    'Site URL Formats': [
      'https://example.com/          URL-prefix property (exact URL required)',
      'sc-domain:example.com         Domain property (covers all subdomains + protocols)',
      'example.com                   Auto-converted to sc-domain:example.com'
    ],
    'Examples': [
      'node search-console.js sites --account user@example.com',
      'node search-console.js top-queries --site https://example.com/ --rows 25 --account user@example.com',
      'node search-console.js ctr-opportunities --site example.com --min-impressions 500 --account user@example.com',
      'node search-console.js search-analytics --site https://example.com/ --dimensions "query,page" --rows 50 --account user@example.com',
      'node search-console.js url-inspect --site https://example.com/ --url https://example.com/blog/post --account user@example.com',
      'node search-console.js sitemaps --site example.com --account user@example.com',
      'node search-console.js submit-sitemap --site https://example.com/ --sitemap https://example.com/sitemap.xml --account user@example.com'
    ],
    'Setup': [
      'Requires search_console API enabled: node auth.js configure-apis --account EMAIL --apis "+search_console"',
      'Requires webmasters OAuth scope: re-run auth.js setup if tokens were created before this scope was added'
    ]
  });
}

async function main() {
  const { command, flags } = parseArgs();
  const email = flags.account || flags.a;

  if (command === 'help' || flags.help || flags.h || !command || command === 'help') {
    printHelp();
    return;
  }

  if (!email) {
    console.error('Error: --account is required');
    console.error('Example: node search-console.js sites --account user@example.com');
    process.exit(1);
  }

  try {
    switch (command) {
      case 'sites':
        await listSites(email);
        break;
      case 'search-analytics':
        await searchAnalytics(email, flags);
        break;
      case 'top-queries':
        await topQueries(email, flags);
        break;
      case 'top-pages':
        await topPages(email, flags);
        break;
      case 'ctr-opportunities':
        await ctrOpportunities(email, flags);
        break;
      case 'url-inspect':
        await inspectUrl(email, flags);
        break;
      case 'sitemaps':
        await listSitemaps(email, flags);
        break;
      case 'submit-sitemap':
        await submitSitemap(email, flags);
        break;
      case 'delete-sitemap':
        await deleteSitemap(email, flags);
        break;
      default:
        console.error(`Unknown command: ${command}`);
        printHelp();
        process.exit(1);
    }
  } catch (error) {
    // Provide a helpful message for the most common failure: missing scope
    if (error.message && error.message.includes('insufficient authentication scopes')) {
      console.error('\nError: Missing OAuth scope for Search Console.');
      console.error('Re-run setup to add the webmasters scope:');
      console.error(`  node auth.js setup --account ${email} --client-id YOUR_ID --client-secret YOUR_SECRET`);
      console.error('\nOr if you need to add the scope to an existing setup, re-authorize the account.');
    } else {
      outputError(error);
    }
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main();
}
