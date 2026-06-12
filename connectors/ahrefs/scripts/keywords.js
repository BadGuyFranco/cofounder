/**
 * Ahrefs Keywords - organic ranking data.
 *
 * organic   Keywords the domain ranks for. Use --min-position/--max-position
 *           to isolate quick wins (e.g. positions 11-20).
 */

import {
  apiGet, parseFlags, normalizeDomain, output, outputError, today
} from './utils.js';

const ORGANIC_SELECT = 'keyword,best_position,volume,keyword_difficulty,cpc,best_position_url,sum_traffic';

function showHelp() {
  console.log(`
Ahrefs Keywords - organic ranking data

Usage: node scripts/keywords.js <command> [options]

Commands:
  organic    Keywords the domain ranks for
  help       Show this help

Options:
  --domain <d>           Target domain (required)
  --date <YYYY-MM-DD>    Report date (default: today)
  --country <cc>         Two-letter country code (optional)
  --limit <n>            Max rows (default 100)
  --min-position <n>     Filter: only keywords ranking at or below this position
  --max-position <n>     Filter: only keywords ranking at or above this position
  --order-by <col:dir>   Override sort, e.g. volume:desc
  --select <cols>        Override returned columns (comma-separated)
  --mode <m>             exact | prefix | domain | subdomains (default: subdomains)
  --protocol <p>         both | http | https (default: both)

Examples:
  node scripts/keywords.js organic --domain example.com --limit 200
  node scripts/keywords.js organic --domain example.com --min-position 11 --max-position 20
`);
}

// Find the array of keyword rows across possible response shapes
function extractRows(data) {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.keywords)) return data.keywords;
  if (Array.isArray(data?.organic_keywords)) return data.organic_keywords;
  for (const v of Object.values(data || {})) {
    if (Array.isArray(v)) return v;
  }
  return null;
}

async function organic(flags) {
  if (!flags.domain) throw new Error('--domain required. Usage: organic --domain example.com');

  const data = await apiGet('/v3/site-explorer/organic-keywords', {
    target: normalizeDomain(flags.domain),
    date: flags.date || today(),
    country: flags.country,
    select: flags.select || ORGANIC_SELECT,
    order_by: flags['order-by'] || 'volume:desc',
    limit: flags.limit || 100,
    mode: flags.mode || 'subdomains',
    protocol: flags.protocol || 'both'
  });

  const hasFilter = flags['min-position'] || flags['max-position'];
  if (hasFilter) {
    const rows = extractRows(data);
    if (!rows) {
      // Unknown shape - return raw so nothing is silently dropped
      output(data);
      return;
    }
    const min = Number(flags['min-position'] || 1);
    const max = Number(flags['max-position'] || 1000);
    const filtered = rows.filter(
      (r) => typeof r.best_position === 'number' && r.best_position >= min && r.best_position <= max
    );
    output({ filtered: true, min_position: min, max_position: max, count: filtered.length, keywords: filtered });
    return;
  }

  output(data);
}

async function main() {
  const { flags, positional } = parseFlags(process.argv.slice(2));
  const command = positional[0] || 'help';

  if (command === 'help') {
    showHelp();
    return;
  }

  try {
    switch (command) {
      case 'organic':
        await organic(flags);
        break;
      default:
        console.error(`Unknown command: ${command}`);
        showHelp();
        process.exit(1);
    }
  } catch (error) {
    outputError(error.message);
  }
}

main();
