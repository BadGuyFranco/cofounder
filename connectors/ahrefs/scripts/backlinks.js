/**
 * Ahrefs Backlinks - link profile data.
 *
 * refdomains  Top referring domains, ranked by Domain Rating
 * anchors     Anchor text distribution
 */

import {
  apiGet, parseFlags, normalizeDomain, output, outputError
} from './utils.js';

const REFDOMAINS_SELECT = 'domain,domain_rating,dofollow_links,links_to_target,traffic_domain,first_seen,last_seen';
const ANCHORS_SELECT = 'anchor,refdomains,dofollow_links,first_seen,last_seen';

function showHelp() {
  console.log(`
Ahrefs Backlinks - link profile data

Usage: node scripts/backlinks.js <command> [options]

Commands:
  refdomains   Top referring domains, ranked by Domain Rating
  anchors      Anchor text distribution
  help         Show this help

Options:
  --domain <d>         Target domain (required)
  --limit <n>          Max rows (refdomains default 50, anchors default 30)
  --mode <m>           exact | prefix | domain | subdomains (default: subdomains)
  --protocol <p>       both | http | https (default: both)
  --order-by <col:dir> Override sort, e.g. domain_rating:desc
  --select <cols>      Override returned columns (comma-separated)
  --where <json>       Raw Ahrefs 'where' filter (advanced)

Examples:
  node scripts/backlinks.js refdomains --domain example.com --limit 50
  node scripts/backlinks.js anchors --domain example.com
`);
}

async function refdomains(flags) {
  if (!flags.domain) throw new Error('--domain required. Usage: refdomains --domain example.com');
  const data = await apiGet('/v3/site-explorer/refdomains', {
    target: normalizeDomain(flags.domain),
    select: flags.select || REFDOMAINS_SELECT,
    mode: flags.mode || 'subdomains',
    protocol: flags.protocol || 'both',
    order_by: flags['order-by'] || 'domain_rating:desc',
    limit: flags.limit || 50,
    where: flags.where
  });
  output(data);
}

async function anchors(flags) {
  if (!flags.domain) throw new Error('--domain required. Usage: anchors --domain example.com');
  const data = await apiGet('/v3/site-explorer/anchors', {
    target: normalizeDomain(flags.domain),
    select: flags.select || ANCHORS_SELECT,
    mode: flags.mode || 'subdomains',
    protocol: flags.protocol || 'both',
    order_by: flags['order-by'] || 'refdomains:desc',
    limit: flags.limit || 30,
    where: flags.where
  });
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
      case 'refdomains':
        await refdomains(flags);
        break;
      case 'anchors':
        await anchors(flags);
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
