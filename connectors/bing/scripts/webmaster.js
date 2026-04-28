#!/usr/bin/env node
/**
 * Bing Webmaster Tools
 * Site management, sitemap submission, crawl stats, URL submission,
 * and keyword data via the Bing Webmaster API.
 *
 * API key stored at /memory/connectors/bing/.env as BING_WEBMASTER_API_KEY.
 *
 * Usage:
 *   node webmaster.js sites
 *   node webmaster.js sitemaps --site https://example.com
 *   node webmaster.js add-sitemap --site https://example.com --sitemap https://example.com/sitemap.xml
 *   node webmaster.js remove-sitemap --site https://example.com --sitemap https://example.com/sitemap.xml
 *   node webmaster.js crawl-stats --site https://example.com
 *   node webmaster.js crawl-issues --site https://example.com
 *   node webmaster.js submit-url --site https://example.com --url https://example.com/new-page
 *   node webmaster.js submit-urls --site https://example.com --urls https://example.com/a,https://example.com/b
 *   node webmaster.js keyword-stats --query "example keyword"
 */

// Dependency check (must be first, before any npm imports)
import { ensureDeps } from '../../../system/shared/ensure-deps.js';
ensureDeps(import.meta.url);

import { fileURLToPath } from 'url';
import {
  apiRequest,
  parseFlags,
  output,
  outputError,
  loadSitesCache,
  saveSitesCache
} from './utils.js';

// ---------------------------------------------------------------------------
// Help
// ---------------------------------------------------------------------------

function printHelp() {
  console.log(`
Bing Webmaster Tools

COMMANDS
  sites                     List all verified sites in your Bing Webmaster account
  sitemaps                  List sitemaps for a site
  add-sitemap               Submit a sitemap to Bing
  remove-sitemap            Remove a sitemap from Bing
  crawl-stats               Get crawl statistics for a site (last 30 days)
  crawl-issues              Get crawl errors and issues for a site
  submit-url                Submit a single URL for Bing indexing
  submit-urls               Batch submit up to 10 URLs for Bing indexing
  keyword-stats             Get search keyword statistics

OPTIONS
  --site URL                Site URL (e.g., https://example.com)
  --sitemap URL             Sitemap URL (for add-sitemap and remove-sitemap)
  --url URL                 URL to submit (for submit-url)
  --urls URL1,URL2,...      Comma-separated URLs to submit (for submit-urls)
  --query "keyword"         Search query (for keyword-stats)
  --country CODE            Country code for keyword-stats (default: us)
  --language CODE           Language code for keyword-stats (default: en-US)
  --json                    Output raw JSON

EXAMPLES
  node webmaster.js sites
  node webmaster.js sitemaps --site https://example.com
  node webmaster.js add-sitemap --site https://example.com --sitemap https://example.com/sitemap.xml
  node webmaster.js crawl-stats --site https://example.com
  node webmaster.js crawl-issues --site https://example.com
  node webmaster.js submit-url --site https://example.com --url https://example.com/new-page
  node webmaster.js keyword-stats --query "best seo tools"

SETUP
  1. Go to https://www.bing.com/webmasters/
  2. Sign in with your Microsoft account
  3. Verify your sites (add meta tag or upload BingSiteAuth.xml)
  4. Click account icon > API Access > Generate API Key
  5. Add to /memory/connectors/bing/.env:
     BING_WEBMASTER_API_KEY=your_key_here

API DOCS
  https://learn.microsoft.com/en-us/bingwebmaster/getting-access
`);
}

// ---------------------------------------------------------------------------
// Commands
// ---------------------------------------------------------------------------

async function cmdSites(flags) {
  const data = await apiRequest('GetUserSites');
  const sites = Array.isArray(data) ? data : (data?.value || []);

  saveSitesCache(sites);

  if (flags.json) return output(sites);

  if (sites.length === 0) {
    console.log('No verified sites found.');
    console.log('Add and verify your sites at https://www.bing.com/webmasters/');
    return;
  }

  console.log(`\nVerified Sites (${sites.length})\n`);
  for (const site of sites) {
    const url = site.Url || site;
    const verified = site.IsVerified !== false ? 'Verified' : 'Unverified';
    console.log(`  ${url}  [${verified}]`);
  }
  console.log(`\nSaved to /memory/connectors/bing/sites.json`);
}

async function cmdSitemaps(flags) {
  if (!flags.site) outputError('--site is required');

  console.log(`\nNote: Bing's sitemap management API is no longer available.`);
  console.log(`To view or submit sitemaps, use the Bing Webmaster Tools dashboard:`);
  console.log(`  https://www.bing.com/webmasters/sitemaps?siteUrl=${encodeURIComponent(flags.site)}`);
}

async function cmdAddSitemap(flags) {
  if (!flags.site) outputError('--site is required');
  if (!flags.sitemap) outputError('--sitemap is required');

  console.log(`\nNote: Bing's sitemap submission API is no longer available.`);
  console.log(`To submit a sitemap, use the Bing Webmaster Tools dashboard:`);
  console.log(`  https://www.bing.com/webmasters/sitemaps?siteUrl=${encodeURIComponent(flags.site)}`);
  console.log(`\nAlternative: submit individual URLs for faster indexing:`);
  console.log(`  node webmaster.js submit-urls --site ${flags.site} --urls URL1,URL2,...`);
}

async function cmdRemoveSitemap(flags) {
  if (!flags.site) outputError('--site is required');
  if (!flags.sitemap) outputError('--sitemap is required');

  console.log(`\nNote: Bing's sitemap management API is no longer available.`);
  console.log(`To manage sitemaps, use the Bing Webmaster Tools dashboard:`);
  console.log(`  https://www.bing.com/webmasters/sitemaps?siteUrl=${encodeURIComponent(flags.site)}`);
}

async function cmdCrawlStats(flags) {
  if (!flags.site) outputError('--site is required');

  const data = await apiRequest('GetCrawlStats', {
    params: { siteUrl: flags.site }
  });

  if (flags.json) return output(data);

  const stats = Array.isArray(data) ? data : (data?.value || [data]);

  console.log(`\nCrawl Statistics for ${flags.site}\n`);

  if (stats.length === 0 || !stats[0]) {
    console.log('No crawl stats available. Site may be newly added or not yet crawled.');
    return;
  }

  const totals = { crawled: 0, errors: 0, blocked: 0 };

  for (const day of stats.slice(-7)) {
    if (!day) continue;
    const date = day.CrawlDate?.slice(0, 10) || day.Date?.slice(0, 10) || '';
    const crawled = day.PagesCrawled || day.CrawlCount || 0;
    const errors = day.CrawlErrors || day.ErrorCount || 0;
    const blocked = day.PageBlocked || 0;
    totals.crawled += crawled;
    totals.errors += errors;
    totals.blocked += blocked;
    console.log(`  ${date.padEnd(12)}  Crawled: ${String(crawled).padStart(5)}  Errors: ${String(errors).padStart(4)}  Blocked: ${String(blocked).padStart(4)}`);
  }

  console.log(`\n  7-day totals:`);
  console.log(`    Pages crawled: ${totals.crawled}`);
  console.log(`    Crawl errors:  ${totals.errors}`);
  console.log(`    Pages blocked: ${totals.blocked}`);

  if (totals.errors > 0) {
    console.log(`\nRun crawl-issues to see detailed error breakdown.`);
  }
}

async function cmdCrawlIssues(flags) {
  if (!flags.site) outputError('--site is required');

  const data = await apiRequest('GetCrawlIssues', {
    params: { siteUrl: flags.site }
  });
  const issues = Array.isArray(data) ? data : (data?.value || []);

  if (flags.json) return output(issues);

  if (issues.length === 0) {
    console.log(`No crawl issues found for ${flags.site}`);
    return;
  }

  console.log(`\nCrawl Issues for ${flags.site}\n`);

  const byType = {};
  for (const issue of issues) {
    const type = issue.IssueType || issue.Type || issue.ErrorType || 'Unknown';
    if (!byType[type]) byType[type] = [];
    byType[type].push(issue);
  }

  for (const [type, items] of Object.entries(byType)) {
    console.log(`  ${type} (${items.length})`);
    for (const item of items.slice(0, 5)) {
      const url = item.Url || item.PageUrl || '';
      if (url) console.log(`    - ${url}`);
    }
    if (items.length > 5) {
      console.log(`    ... and ${items.length - 5} more`);
    }
  }

  console.log(`\nTotal issues: ${issues.length}`);
}

async function cmdSubmitUrl(flags) {
  if (!flags.site) outputError('--site is required');
  if (!flags.url) outputError('--url is required');

  await apiRequest('SubmitUrl', {
    method: 'POST',
    body: { siteUrl: flags.site, url: flags.url }
  });

  console.log(`URL submitted for Bing indexing.`);
  console.log(`  Site: ${flags.site}`);
  console.log(`  URL:  ${flags.url}`);
}

async function cmdSubmitUrls(flags) {
  if (!flags.site) outputError('--site is required');
  if (!flags.urls) outputError('--urls is required (comma-separated)');

  const urlList = flags.urls.split(',').map(u => u.trim()).filter(Boolean);

  if (urlList.length > 10) {
    outputError('Bing allows a maximum of 10 URLs per batch submission. Split into multiple calls.');
  }

  await apiRequest('SubmitUrlBatch', {
    method: 'POST',
    body: { siteUrl: flags.site, urlList }
  });

  console.log(`${urlList.length} URL(s) submitted for Bing indexing.`);
  console.log(`  Site: ${flags.site}`);
  for (const url of urlList) {
    console.log(`  - ${url}`);
  }
}

async function cmdKeywordStats(flags) {
  if (!flags.query) outputError('--query is required');

  const country = flags.country || 'us';
  const language = flags.language || 'en-US';

  const data = await apiRequest('GetKeywordStats', {
    params: {
      query: flags.query,
      country,
      language
    }
  });

  if (flags.json) return output(data);

  const stats = Array.isArray(data) ? data : (data?.value || [data]);

  console.log(`\nKeyword Stats for "${flags.query}" (${country}/${language})\n`);

  if (!stats.length || !stats[0]) {
    console.log('No data available for this keyword.');
    return;
  }

  // Monthly data
  let totalImpressions = 0;
  let totalClicks = 0;

  for (const month of stats.slice(-6)) {
    if (!month) continue;
    const date = month.Date?.slice(0, 7) || '';
    const impressions = month.Impressions || 0;
    const clicks = month.Clicks || 0;
    const ctr = impressions > 0 ? ((clicks / impressions) * 100).toFixed(1) : '0.0';
    totalImpressions += impressions;
    totalClicks += clicks;
    console.log(`  ${date.padEnd(10)}  Impressions: ${String(impressions).padStart(8)}  Clicks: ${String(clicks).padStart(6)}  CTR: ${ctr}%`);
  }

  if (totalImpressions > 0) {
    const avgCtr = ((totalClicks / totalImpressions) * 100).toFixed(1);
    console.log(`\n  6-month totals:`);
    console.log(`    Total impressions: ${totalImpressions.toLocaleString()}`);
    console.log(`    Total clicks:      ${totalClicks.toLocaleString()}`);
    console.log(`    Average CTR:       ${avgCtr}%`);
  }
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  const { flags, positional } = parseFlags(process.argv.slice(2));
  const command = positional[0] || 'help';

  if (command === 'help' || flags.help || flags.h) {
    printHelp();
    return;
  }

  try {
    switch (command) {
      case 'sites':         await cmdSites(flags); break;
      case 'sitemaps':      await cmdSitemaps(flags); break;
      case 'add-sitemap':   await cmdAddSitemap(flags); break;
      case 'remove-sitemap': await cmdRemoveSitemap(flags); break;
      case 'crawl-stats':   await cmdCrawlStats(flags); break;
      case 'crawl-issues':  await cmdCrawlIssues(flags); break;
      case 'submit-url':    await cmdSubmitUrl(flags); break;
      case 'submit-urls':   await cmdSubmitUrls(flags); break;
      case 'keyword-stats': await cmdKeywordStats(flags); break;
      default:
        console.error(`Unknown command: ${command}`);
        printHelp();
        process.exit(1);
    }
  } catch (err) {
    if (err.message.includes('401') || err.message.toLowerCase().includes('unauthorized')) {
      console.error(`\nAuthentication failed. Your API key may be invalid or expired.`);
      console.error(`Generate a new key at https://www.bing.com/webmasters/ > API Access.`);
    } else if (err.message.includes('403') || err.message.toLowerCase().includes('forbidden')) {
      console.error(`\nAccess denied. Verify that the site is verified in your Bing Webmaster account.`);
      console.error(`Check your sites at https://www.bing.com/webmasters/`);
    } else {
      console.error(`\nError: ${err.message}`);
    }
    process.exit(1);
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main();
}
