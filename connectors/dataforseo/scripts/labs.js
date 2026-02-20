#!/usr/bin/env node
/**
 * DataForSEO Labs API
 * Domain rank overview, ranked keywords, competitor discovery,
 * keyword gap analysis, and keyword research.
 *
 * Usage:
 *   node labs.js domain-overview --domain example.com
 *   node labs.js ranked-keywords --domain example.com --limit 100
 *   node labs.js competitors --domain example.com
 *   node labs.js keyword-gap --domain example.com --competitor competitor.com
 *   node labs.js keyword-ideas --domain example.com --limit 50
 *   node labs.js search-volume --keywords "seo tool,rank tracker,keyword research"
 */

// Dependency check (must be first, before any npm imports)
import { ensureDeps } from '../../../system/shared/ensure-deps.js';
ensureDeps(import.meta.url);

import { fileURLToPath } from 'url';
import { apiPost, parseFlags, resolveLocation, normalizeDomain, output, outputError, printCost } from './utils.js';

function printHelp() {
  console.log(`
DataForSEO Labs API

COMMANDS
  domain-overview    Organic traffic, paid traffic, domain rank, top keywords snapshot
  ranked-keywords    All keywords a domain ranks for (with position + search volume)
  competitors        Discover competitor domains based on shared keyword rankings
  keyword-gap        Keywords a competitor ranks for that your domain does not
  keyword-ideas      Keyword suggestions and related keywords for a domain
  search-volume      Get monthly search volume for specific keywords

OPTIONS
  --domain DOMAIN           Target domain
  --competitor DOMAIN       Competitor domain (for keyword-gap)
  --keywords "kw1,kw2,..."  Keywords for search-volume (comma-separated)
  --location COUNTRY        Country code: us, uk, ca, au, de... (default: us)
  --limit N                 Max results (default: 100)
  --min-volume N            Minimum monthly search volume filter (default: 10)
  --json                    Output raw JSON

EXAMPLES
  node labs.js domain-overview --domain example.com
  node labs.js ranked-keywords --domain example.com --limit 200 --min-volume 50
  node labs.js competitors --domain example.com --location us
  node labs.js keyword-gap --domain example.com --competitor competitor.com --limit 100
  node labs.js keyword-ideas --domain example.com --limit 50
  node labs.js search-volume --keywords "seo tool,best rank tracker,keyword research tool"

COST
  ~$0.01-0.04 per domain-overview or ranked-keywords call
  ~$0.002 per competitors call
  ~$0.01 per keyword-gap call
  ~$0.001 per keyword in search-volume
`);
}

async function cmdDomainOverview(flags) {
  if (!flags.domain) outputError('--domain is required');

  const domain = normalizeDomain(flags.domain);
  const { locationCode, languageCode } = resolveLocation(flags.location);

  console.log(`\nDomain overview for ${domain} | ${flags.location || 'us'}\n`);

  const { result, cost } = await apiPost('/dataforseo_labs/google/domain_rank_overview/live', [{
    target: domain,
    location_code: locationCode,
    language_code: languageCode
  }]);

  const data = result[0]?.metrics?.organic;
  const paid = result[0]?.metrics?.paid;

  if (!data) {
    console.log('No domain data available. Domain may be too new or have no indexed content.');
    printCost(cost);
    return;
  }

  if (flags.json) return output(result[0]);

  console.log(`  Organic Keywords:    ${(data.count || 0).toLocaleString()}`);
  console.log(`  Est. Monthly Traffic:${String((data.etv || 0).toLocaleString()).padStart(12)}`);
  console.log(`  Avg. Traffic Cost:   $${(data.estimated_paid_traffic_cost || 0).toFixed(0)}/mo value`);
  console.log(`  Keywords in top 3:   ${(data.pos_1 || 0) + (data.pos_2_3 || 0)}`);
  console.log(`  Keywords in top 10:  ${(data.pos_4_10 || 0)}`);
  console.log(`  Keywords in top 20:  ${(data.pos_11_20 || 0)}`);
  console.log(`  Keywords pos 21-100: ${(data.pos_21_30 || 0) + (data.pos_31_40 || 0) + (data.pos_41_50 || 0) + (data.pos_51_60 || 0) + (data.pos_61_70 || 0) + (data.pos_71_80 || 0) + (data.pos_81_90 || 0) + (data.pos_91_100 || 0)}`);

  if (paid && paid.count > 0) {
    console.log(`\n  Paid Keywords:       ${(paid.count || 0).toLocaleString()}`);
    console.log(`  Est. Paid Traffic:   ${(paid.etv || 0).toLocaleString()}/mo`);
  }

  printCost(cost);
}

async function cmdRankedKeywords(flags) {
  if (!flags.domain) outputError('--domain is required');

  const domain = normalizeDomain(flags.domain);
  const { locationCode, languageCode } = resolveLocation(flags.location);
  const limit = parseInt(flags.limit || '100', 10);
  const minVolume = parseInt(flags['min-volume'] || '10', 10);

  console.log(`\nRanked keywords for ${domain} | limit: ${limit} | min volume: ${minVolume} | ${flags.location || 'us'}\n`);

  const { result, cost } = await apiPost('/dataforseo_labs/google/ranked_keywords/live', [{
    target: domain,
    location_code: locationCode,
    language_code: languageCode,
    limit,
    filters: ['keyword_data.keyword_info.search_volume', '>', minVolume],
    order_by: ['keyword_data.keyword_info.search_volume,desc']
  }]);

  const items = result[0]?.items || [];

  if (flags.json) return output(items);

  if (items.length === 0) {
    console.log('No ranked keywords found with the specified filters.');
    printCost(cost);
    return;
  }

  // Group by position bracket
  const top3 = items.filter(i => i.ranked_serp_element?.serp_item?.rank_absolute <= 3);
  const top10 = items.filter(i => {
    const pos = i.ranked_serp_element?.serp_item?.rank_absolute;
    return pos > 3 && pos <= 10;
  });
  const top20 = items.filter(i => {
    const pos = i.ranked_serp_element?.serp_item?.rank_absolute;
    return pos > 10 && pos <= 20;
  });
  const beyond = items.filter(i => {
    const pos = i.ranked_serp_element?.serp_item?.rank_absolute;
    return pos > 20;
  });

  function printGroup(label, group) {
    if (group.length === 0) return;
    console.log(`\n${label} (${group.length}):`);
    console.log(`  ${'Keyword'.padEnd(50)} ${'Pos'.padStart(4)}  ${'Volume'.padStart(8)}  ${'KD'.padStart(4)}`);
    console.log(`  ${'-'.repeat(50)} ----  --------  ----`);
    for (const item of group) {
      const kw = (item.keyword_data?.keyword || '').padEnd(50);
      const pos = String(item.ranked_serp_element?.serp_item?.rank_absolute || '?').padStart(4);
      const vol = String((item.keyword_data?.keyword_info?.search_volume || 0).toLocaleString()).padStart(8);
      const kd = String(item.keyword_data?.keyword_properties?.keyword_difficulty || '?').padStart(4);
      console.log(`  ${kw} ${pos}  ${vol}  ${kd}`);
    }
  }

  printGroup('Top 3', top3);
  printGroup('Positions 4-10', top10);
  printGroup('Positions 11-20 (quick win opportunities)', top20);
  if (beyond.length > 0) {
    console.log(`\nPositions 21+ (${beyond.length} keywords - longer term opportunities)`);
  }

  printCost(cost);
}

async function cmdCompetitors(flags) {
  if (!flags.domain) outputError('--domain is required');

  const domain = normalizeDomain(flags.domain);
  const { locationCode, languageCode } = resolveLocation(flags.location);
  const limit = parseInt(flags.limit || '10', 10);

  console.log(`\nCompetitor domains for ${domain} | ${flags.location || 'us'}\n`);

  const { result, cost } = await apiPost('/dataforseo_labs/google/competitors_domain/live', [{
    target: domain,
    location_code: locationCode,
    language_code: languageCode,
    limit
  }]);

  const items = result[0]?.items || [];

  if (flags.json) return output(items);

  if (items.length === 0) {
    console.log('No competitor data found.');
    printCost(cost);
    return;
  }

  console.log(`  ${'Domain'.padEnd(45)} ${'Shared KWs'.padStart(10)}  ${'Overlap %'.padStart(10)}`);
  console.log(`  ${'-'.repeat(45)} ----------  ----------`);

  for (const item of items) {
    const d = (item.domain || '').padEnd(45);
    const shared = String(item.intersections || 0).padStart(10);
    const overlap = item.se_type ? '' : String(((item.intersections / (result[0]?.total_count || 1)) * 100).toFixed(1) + '%').padStart(10);
    console.log(`  ${d} ${shared}  ${overlap}`);
  }

  console.log(`\nUse these domains with keyword-gap to find ranking opportunities.`);
  printCost(cost);
}

async function cmdKeywordGap(flags) {
  if (!flags.domain) outputError('--domain is required');
  if (!flags.competitor) outputError('--competitor is required');

  const domain = normalizeDomain(flags.domain);
  const competitor = normalizeDomain(flags.competitor);
  const { locationCode, languageCode } = resolveLocation(flags.location);
  const limit = parseInt(flags.limit || '100', 10);
  const minVolume = parseInt(flags['min-volume'] || '50', 10);

  console.log(`\nKeyword gap: ${competitor} ranks, ${domain} does not | limit: ${limit} | min volume: ${minVolume}\n`);

  const { result, cost } = await apiPost('/dataforseo_labs/google/domain_intersection/live', [{
    target1: competitor,
    target2: domain,
    location_code: locationCode,
    language_code: languageCode,
    limit,
    filters: ['keyword_data.keyword_info.search_volume', '>', minVolume],
    order_by: ['keyword_data.keyword_info.search_volume,desc'],
    intersections: false
  }]);

  const items = result[0]?.items || [];

  if (flags.json) return output(items);

  if (items.length === 0) {
    console.log('No keyword gap found with the specified filters. Try lowering --min-volume.');
    printCost(cost);
    return;
  }

  console.log(`  ${'Keyword'.padEnd(50)} ${'Volume'.padStart(8)}  ${'KD'.padStart(4)}  Competitor pos`);
  console.log(`  ${'-'.repeat(50)} --------  ----  --------------`);

  for (const item of items) {
    const kw = (item.keyword_data?.keyword || '').padEnd(50);
    const vol = String((item.keyword_data?.keyword_info?.search_volume || 0).toLocaleString()).padStart(8);
    const kd = String(item.keyword_data?.keyword_properties?.keyword_difficulty || '?').padStart(4);
    const compPos = item.first_position || '?';
    console.log(`  ${kw} ${vol}  ${kd}  ${compPos}`);
  }

  printCost(cost);
}

async function cmdKeywordIdeas(flags) {
  if (!flags.domain) outputError('--domain is required');

  const domain = normalizeDomain(flags.domain);
  const { locationCode, languageCode } = resolveLocation(flags.location);
  const limit = parseInt(flags.limit || '50', 10);

  console.log(`\nKeyword ideas for ${domain} | ${flags.location || 'us'}\n`);

  const { result, cost } = await apiPost('/keywords_data/google_ads/keywords_for_site/live', [{
    target: domain,
    location_code: locationCode,
    language_code: languageCode,
    limit
  }]);

  const items = result[0]?.items || result[0] || [];
  const list = Array.isArray(items) ? items : [];

  if (flags.json) return output(list);

  if (list.length === 0) {
    console.log('No keyword ideas found.');
    printCost(cost);
    return;
  }

  const sorted = list
    .filter(i => i.search_volume > 0)
    .sort((a, b) => (b.search_volume || 0) - (a.search_volume || 0));

  console.log(`  ${'Keyword'.padEnd(50)} ${'Volume'.padStart(8)}  ${'CPC'.padStart(6)}  Competition`);
  console.log(`  ${'-'.repeat(50)} --------  ------  -----------`);

  for (const item of sorted.slice(0, limit)) {
    const kw = (item.keyword || '').padEnd(50);
    const vol = String((item.search_volume || 0).toLocaleString()).padStart(8);
    const cpc = ('$' + (item.cpc || 0).toFixed(2)).padStart(6);
    const comp = item.competition_level || '';
    console.log(`  ${kw} ${vol}  ${cpc}  ${comp}`);
  }

  printCost(cost);
}

async function cmdSearchVolume(flags) {
  if (!flags.keywords) outputError('--keywords is required (comma-separated)');

  const keywords = flags.keywords.split(',').map(k => k.trim()).filter(Boolean);
  const { locationCode, languageCode } = resolveLocation(flags.location);

  console.log(`\nSearch volume for ${keywords.length} keyword(s) | ${flags.location || 'us'}\n`);

  const { result, cost } = await apiPost('/keywords_data/google_ads/search_volume/live', [{
    keywords,
    location_code: locationCode,
    language_code: languageCode
  }]);

  const items = result[0] || result || [];
  const list = Array.isArray(items) ? items : [];

  if (flags.json) return output(list);

  if (list.length === 0) {
    console.log('No volume data found.');
    printCost(cost);
    return;
  }

  const sorted = list.sort((a, b) => (b.search_volume || 0) - (a.search_volume || 0));

  console.log(`  ${'Keyword'.padEnd(50)} ${'Volume'.padStart(8)}  ${'CPC'.padStart(6)}  Competition`);
  console.log(`  ${'-'.repeat(50)} --------  ------  -----------`);

  for (const item of sorted) {
    const kw = (item.keyword || '').padEnd(50);
    const vol = String((item.search_volume || 0).toLocaleString()).padStart(8);
    const cpc = ('$' + (item.cpc || 0).toFixed(2)).padStart(6);
    const comp = item.competition_level || '';
    console.log(`  ${kw} ${vol}  ${cpc}  ${comp}`);
  }

  printCost(cost);
}

async function main() {
  const { flags, positional } = parseFlags(process.argv.slice(2));
  const command = positional[0] || 'help';

  if (command === 'help' || flags.help || flags.h) {
    printHelp();
    return;
  }

  try {
    switch (command) {
      case 'domain-overview':  await cmdDomainOverview(flags); break;
      case 'ranked-keywords':  await cmdRankedKeywords(flags); break;
      case 'competitors':      await cmdCompetitors(flags); break;
      case 'keyword-gap':      await cmdKeywordGap(flags); break;
      case 'keyword-ideas':    await cmdKeywordIdeas(flags); break;
      case 'search-volume':    await cmdSearchVolume(flags); break;
      default:
        console.error(`Unknown command: ${command}`);
        printHelp();
        process.exit(1);
    }
  } catch (err) {
    console.error(`\nError: ${err.message}`);
    process.exit(1);
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main();
}
