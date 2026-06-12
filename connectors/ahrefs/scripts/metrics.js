/**
 * Ahrefs Metrics - domain-level snapshots.
 *
 * dr        Domain Rating for a target and optional competitors
 * overview  DR + backlink stats + organic metrics for one domain
 * limits    Your API unit allowance and usage this period
 */

import {
  apiGet, apiGetPublic, extractDr, parseFlags, normalizeDomain, splitList,
  output, outputError, today
} from './utils.js';

function showHelp() {
  console.log(`
Ahrefs Metrics - domain-level snapshots

Usage: node scripts/metrics.js <command> [options]

Commands:
  dr          Domain Rating for a domain (+ optional competitors). FREE, no key.
  overview    DR + backlink stats + organic metrics for one domain. Needs paid key.
  limits      API unit allowance and usage this billing period. Needs paid key.
  help        Show this help

Options:
  --domain <d>            Target domain (required for dr, overview)
  --competitors <a,b,c>   Comma-separated competitor domains (dr only)
  --date <YYYY-MM-DD>     Report date for overview (default: today)
  --protocol <p>          both | http | https (default: both)
  --country <cc>          Two-letter country code (overview metrics)

Examples:
  node scripts/metrics.js dr --domain example.com
  node scripts/metrics.js dr --domain example.com --competitors a.com,b.com,c.com
  node scripts/metrics.js overview --domain example.com
  node scripts/metrics.js limits
`);
}

// `dr` uses the public domain-rating-free endpoint: no API key, no units, any domain.
async function dr(flags) {
  if (!flags.domain) throw new Error('--domain required. Usage: dr --domain example.com');

  const targets = [normalizeDomain(flags.domain)];
  if (flags.competitors) targets.push(...splitList(flags.competitors).map(normalizeDomain));

  const results = [];
  for (const target of targets) {
    const data = await apiGetPublic('/v3/public/domain-rating-free', { target, output: 'json' });
    results.push({ target, domain_rating: extractDr(data) });
  }
  output({ source: 'public domain-rating-free (no key, no units)', results });
}

async function overview(flags) {
  if (!flags.domain) throw new Error('--domain required. Usage: overview --domain example.com');
  const target = normalizeDomain(flags.domain);
  const date = flags.date || today();
  const protocol = flags.protocol || 'both';

  const [domainRating, backlinksStats, metrics] = await Promise.all([
    apiGet('/v3/site-explorer/domain-rating', { target, date }),
    apiGet('/v3/site-explorer/backlinks-stats', { target, date, protocol }),
    apiGet('/v3/site-explorer/metrics', { target, date, protocol, country: flags.country })
  ]);

  output({
    target,
    date,
    domain_rating: extractDr(domainRating),
    domain_rating_raw: domainRating,
    backlinks_stats: backlinksStats,
    organic_metrics: metrics
  });
}

async function limits() {
  const data = await apiGet('/v3/subscription-info/limits-and-usage', {});
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
      case 'dr':
        await dr(flags);
        break;
      case 'overview':
        await overview(flags);
        break;
      case 'limits':
        await limits();
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
