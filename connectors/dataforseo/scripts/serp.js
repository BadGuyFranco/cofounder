#!/usr/bin/env node
/**
 * DataForSEO SERP API
 * Check keyword rankings and pull live SERP results.
 *
 * Usage:
 *   node serp.js rank-check --domain example.com --keywords "seo tool,rank tracker"
 *   node serp.js serp --keyword "best seo tools" --location us
 */

// Dependency check (must be first, before any npm imports)
import { ensureDeps } from '../../../system/shared/ensure-deps.js';
ensureDeps(import.meta.url);

import { fileURLToPath } from 'url';
import { apiPost, parseFlags, resolveLocation, normalizeDomain, output, outputError, printCost } from './utils.js';

function printHelp() {
  console.log(`
DataForSEO SERP API

COMMANDS
  rank-check    Check where a domain ranks for one or more keywords
  serp          Pull the full top-10 SERP for a keyword

OPTIONS
  --domain DOMAIN           Domain to check (for rank-check)
  --keywords "kw1,kw2,..."  Comma-separated keywords to check
  --keyword "phrase"        Single keyword (for serp command)
  --location COUNTRY        Country code: us, uk, ca, au, de, fr... (default: us)
  --depth N                 Search depth: 10, 20, 50, or 100 (default: 10)
  --json                    Output raw JSON

EXAMPLES
  node serp.js rank-check --domain example.com --keywords "seo software,rank tracker"
  node serp.js rank-check --domain example.com --keywords "keyword" --location uk --depth 100
  node serp.js serp --keyword "best seo tools 2026"

COST
  ~$0.002 per keyword per depth-10 check
  ~$0.004 per keyword per depth-100 check
`);
}

async function cmdRankCheck(flags) {
  if (!flags.domain) outputError('--domain is required');
  if (!flags.keywords) outputError('--keywords is required (comma-separated)');

  const domain = normalizeDomain(flags.domain);
  const keywords = flags.keywords.split(',').map(k => k.trim()).filter(Boolean);
  const { locationCode, languageCode } = resolveLocation(flags.location);
  const depth = parseInt(flags.depth || '100', 10);

  console.log(`\nChecking rankings for ${domain} | ${keywords.length} keyword(s) | depth ${depth} | ${flags.location || 'us'}\n`);

  const tasks = keywords.map(keyword => ({
    keyword,
    location_code: locationCode,
    language_code: languageCode,
    depth
  }));

  let totalCost = 0;
  const results = [];

  // DataForSEO accepts up to 100 tasks per request; batch if needed
  const BATCH_SIZE = 10;
  for (let i = 0; i < tasks.length; i += BATCH_SIZE) {
    const batch = tasks.slice(i, i + BATCH_SIZE);
    const { result, cost } = await apiPost('/serp/google/organic/live/regular', batch);
    totalCost += cost;

    for (const taskResult of result) {
      const keyword = taskResult.keyword;
      const items = taskResult.items || [];
      const organicItems = items.filter(item => item.type === 'organic');

      const match = organicItems.find(item => {
        const itemDomain = normalizeDomain(item.url || '');
        return itemDomain === domain || itemDomain.endsWith(`.${domain}`) || itemDomain.startsWith(`${domain}/`);
      });

      results.push({
        keyword,
        position: match ? match.rank_absolute : null,
        url: match ? match.url : null,
        title: match ? match.title : null
      });
    }
  }

  if (flags.json) return output(results);

  const found = results.filter(r => r.position !== null);
  const notFound = results.filter(r => r.position === null);

  if (found.length > 0) {
    console.log(`Ranking (top ${depth}):`);
    for (const r of found.sort((a, b) => a.position - b.position)) {
      console.log(`  #${String(r.position).padStart(3)}  ${r.keyword}`);
      if (r.url) console.log(`         ${r.url}`);
    }
  }

  if (notFound.length > 0) {
    console.log(`\nNot in top ${depth}:`);
    for (const r of notFound) {
      console.log(`  -    ${r.keyword}`);
    }
  }

  printCost(totalCost);
}

async function cmdSerp(flags) {
  if (!flags.keyword) outputError('--keyword is required');

  const { locationCode, languageCode } = resolveLocation(flags.location);

  console.log(`\nSERP for: "${flags.keyword}" | ${flags.location || 'us'}\n`);

  const { result, cost } = await apiPost('/serp/google/organic/live/regular', [{
    keyword: flags.keyword,
    location_code: locationCode,
    language_code: languageCode,
    depth: 10
  }]);

  const items = result[0]?.items?.filter(i => i.type === 'organic') || [];

  if (flags.json) return output(items);

  if (items.length === 0) {
    console.log('No organic results found.');
  } else {
    for (const item of items) {
      console.log(`  #${String(item.rank_absolute).padStart(2)}  ${item.title}`);
      console.log(`       ${item.url}`);
      if (item.description) {
        const desc = item.description.length > 120 ? item.description.slice(0, 120) + '...' : item.description;
        console.log(`       ${desc}`);
      }
      console.log('');
    }
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
      case 'rank-check': await cmdRankCheck(flags); break;
      case 'serp':       await cmdSerp(flags); break;
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
