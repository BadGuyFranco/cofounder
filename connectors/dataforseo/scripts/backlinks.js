#!/usr/bin/env node
/**
 * DataForSEO Backlinks API
 * Domain backlink summary, referring domains, and link gap vs. competitors.
 *
 * Usage:
 *   node backlinks.js summary --domain example.com
 *   node backlinks.js referring-domains --domain example.com --limit 50
 *   node backlinks.js link-gap --domain example.com --competitor competitor.com
 */

// Dependency check (must be first, before any npm imports)
import { ensureDeps } from '../../../system/shared/ensure-deps.js';
ensureDeps(import.meta.url);

import { fileURLToPath } from 'url';
import { apiPost, parseFlags, normalizeDomain, output, outputError, printCost } from './utils.js';

function printHelp() {
  console.log(`
DataForSEO Backlinks API

COMMANDS
  summary            Total backlinks, referring domains, rank, and anchor distribution
  referring-domains  List top referring domains with their rank and link count
  link-gap           Domains linking to a competitor but not to your domain

OPTIONS
  --domain DOMAIN         Target domain
  --competitor DOMAIN     Competitor domain (for link-gap)
  --limit N               Max results to return (default: 50)
  --json                  Output raw JSON

EXAMPLES
  node backlinks.js summary --domain example.com
  node backlinks.js referring-domains --domain example.com --limit 100
  node backlinks.js link-gap --domain example.com --competitor competitor.com --limit 50

COST
  ~$0.002 per summary call
  ~$0.002 per referring-domains call
  ~$0.002 per link-gap call
`);
}

async function cmdSummary(flags) {
  if (!flags.domain) outputError('--domain is required');

  const domain = normalizeDomain(flags.domain);
  console.log(`\nBacklink summary for ${domain}\n`);

  const { result, cost } = await apiPost('/backlinks/summary/live', [{
    target: domain,
    include_subdomains: true
  }]);

  const data = result[0];
  if (!data) {
    console.log('No backlink data available for this domain.');
    printCost(cost);
    return;
  }

  if (flags.json) return output(data);

  const rank = data.rank || 'N/A';
  const backlinks = (data.backlinks || 0).toLocaleString();
  const referringDomains = (data.referring_domains || 0).toLocaleString();
  const referringIPs = (data.referring_ips || 0).toLocaleString();
  const dofollow = (data.backlinks_spam_score !== undefined)
    ? `${(100 - (data.backlinks_spam_score || 0)).toFixed(0)}% dofollow`
    : '';

  console.log(`  Domain Rank:         ${rank}`);
  console.log(`  Total Backlinks:     ${backlinks}${dofollow ? '  (' + dofollow + ')' : ''}`);
  console.log(`  Referring Domains:   ${referringDomains}`);
  console.log(`  Referring IPs:       ${referringIPs}`);

  if (data.referring_domains_nofollow !== undefined) {
    console.log(`  Nofollow Domains:    ${(data.referring_domains_nofollow || 0).toLocaleString()}`);
  }

  if (data.broken_backlinks !== undefined) {
    console.log(`  Broken Backlinks:    ${(data.broken_backlinks || 0).toLocaleString()}  (point to 404s - reclaim these)`);
  }

  if (data.referring_domains_gov) {
    console.log(`  .gov Referring:      ${data.referring_domains_gov}`);
  }
  if (data.referring_domains_edu) {
    console.log(`  .edu Referring:      ${data.referring_domains_edu}`);
  }

  // Anchor text distribution
  if (data.anchors && data.anchors.length > 0) {
    console.log(`\n  Top Anchors:`);
    for (const anchor of data.anchors.slice(0, 8)) {
      const text = anchor.anchor || '(no text / image)';
      const count = (anchor.backlinks || 0).toLocaleString();
      console.log(`    ${text.padEnd(35)} ${count} links`);
    }
  }

  printCost(cost);
}

async function cmdReferringDomains(flags) {
  if (!flags.domain) outputError('--domain is required');

  const domain = normalizeDomain(flags.domain);
  const limit = parseInt(flags.limit || '50', 10);

  console.log(`\nTop referring domains for ${domain} (limit: ${limit})\n`);

  const { result, cost } = await apiPost('/backlinks/referring_domains/live', [{
    target: domain,
    include_subdomains: true,
    limit,
    order_by: ['referring_pages,desc']
  }]);

  const items = result[0]?.items || [];

  if (flags.json) return output(items);

  if (items.length === 0) {
    console.log('No referring domains found.');
    printCost(cost);
    return;
  }

  console.log(`  ${'Domain'.padEnd(45)} ${'Rank'.padStart(5)}  ${'Links'.padStart(6)}  Follow`);
  console.log(`  ${'-'.repeat(45)} ${'-----'.padStart(5)}  ${'------'.padStart(6)}  ------`);

  for (const item of items) {
    const d = (item.domain || '').padEnd(45);
    const rank = String(item.rank || 'N/A').padStart(5);
    const links = String(item.referring_pages || 0).padStart(6);
    const follow = item.dofollow ? 'dofollow' : 'nofollow';
    console.log(`  ${d} ${rank}  ${links}  ${follow}`);
  }

  printCost(cost);
}

async function cmdLinkGap(flags) {
  if (!flags.domain) outputError('--domain is required');
  if (!flags.competitor) outputError('--competitor is required');

  const domain = normalizeDomain(flags.domain);
  const competitor = normalizeDomain(flags.competitor);
  const limit = parseInt(flags.limit || '50', 10);

  console.log(`\nLink gap: domains linking to ${competitor} but NOT ${domain} (limit: ${limit})\n`);

  const { result, cost } = await apiPost('/backlinks/domain_intersection/live', [{
    targets: { [competitor]: 'target', [domain]: 'target' },
    exclude_targets: [domain],
    limit,
    order_by: ['rank,desc']
  }]);

  const items = result[0]?.items || [];

  if (flags.json) return output(items);

  if (items.length === 0) {
    console.log('No gap domains found, or both domains have similar link profiles.');
    printCost(cost);
    return;
  }

  console.log(`  These domains link to ${competitor} - reach out for a link to ${domain}:\n`);
  console.log(`  ${'Domain'.padEnd(45)} ${'Rank'.padStart(5)}`);
  console.log(`  ${'-'.repeat(45)} -----`);

  for (const item of items) {
    const d = (item.domain || '').padEnd(45);
    const rank = String(item.rank || 'N/A').padStart(5);
    console.log(`  ${d} ${rank}`);
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
      case 'summary':            await cmdSummary(flags); break;
      case 'referring-domains':  await cmdReferringDomains(flags); break;
      case 'link-gap':           await cmdLinkGap(flags); break;
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
