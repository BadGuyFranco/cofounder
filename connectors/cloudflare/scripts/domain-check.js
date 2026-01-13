#!/usr/bin/env node
/**
 * Domain Availability Check Script
 * Check if domains are available for registration using RDAP protocol.
 * 
 * Note: This uses RDAP (Registration Data Access Protocol), not Cloudflare API.
 * RDAP is the official ICANN protocol - completely free, no account required.
 */

import { parseArgs, output, outputError } from './utils.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Cache for RDAP bootstrap data
const BOOTSTRAP_CACHE_FILE = path.join(__dirname, '..', '.rdap-bootstrap.json');
const BOOTSTRAP_URL = 'https://data.iana.org/rdap/dns.json';
const CACHE_MAX_AGE_MS = 24 * 60 * 60 * 1000; // 24 hours

// Cloudflare TLD registry
const CLOUDFLARE_TLDS_FILE = path.join(__dirname, '..', 'data', 'cloudflare-tlds.json');

function showHelp() {
  console.log(`
Domain Check Script - Check domain availability using RDAP

Usage: node scripts/domain-check.js <command> [options]

Commands:
  check <domain>                  Check if a single domain is available
  bulk <domain1> <domain2> ...    Check multiple domains
  suggest <name>                  Check name across popular TLDs
  cloudflare <name>               Check name across Cloudflare TLDs with pricing
  cf-tlds                         List Cloudflare-supported TLDs and prices
  tlds                            List all RDAP-supported TLDs
  help                            Show this help

Options:
  --tlds <list>             Comma-separated TLDs for suggest (default: com,net,org,io,co,app,dev,ai)
  --refresh                 Force refresh of RDAP server cache
  --max-price <usd>         Max yearly price filter for cloudflare command (e.g., --max-price 15)
  --sort <field>            Sort cf-tlds by: price, name (default: price)

Examples:
  node scripts/domain-check.js check coolstartup.com
  node scripts/domain-check.js bulk example.com example.net example.org
  node scripts/domain-check.js suggest coolstartup
  node scripts/domain-check.js cloudflare myapp
  node scripts/domain-check.js cloudflare myapp --max-price 15
  node scripts/domain-check.js cf-tlds
  node scripts/domain-check.js cf-tlds --max-price 10

Output:
  available: true   = Domain can be registered
  available: false  = Domain is already taken

Note: Uses RDAP protocol (official ICANN standard). Free, no account needed.
Note: Cloudflare commands use local pricing data (update data/cloudflare-tlds.json as needed).
`);
}

/**
 * Load or fetch RDAP bootstrap data
 */
async function getBootstrapData(forceRefresh = false) {
  // Check cache
  if (!forceRefresh && fs.existsSync(BOOTSTRAP_CACHE_FILE)) {
    const stat = fs.statSync(BOOTSTRAP_CACHE_FILE);
    const age = Date.now() - stat.mtimeMs;
    
    if (age < CACHE_MAX_AGE_MS) {
      const cached = JSON.parse(fs.readFileSync(BOOTSTRAP_CACHE_FILE, 'utf-8'));
      return cached;
    }
  }

  // Fetch fresh data
  console.log('Fetching RDAP bootstrap data from IANA...');
  const response = await fetch(BOOTSTRAP_URL);
  
  if (!response.ok) {
    throw new Error(`Failed to fetch RDAP bootstrap: ${response.status}`);
  }

  const data = await response.json();
  
  // Build TLD -> RDAP URL map
  const tldMap = {};
  for (const service of data.services || []) {
    const tlds = service[0];
    const urls = service[1];
    const rdapUrl = urls[0]; // Use first URL
    
    for (const tld of tlds) {
      tldMap[tld.toLowerCase()] = rdapUrl;
    }
  }

  // Cache it
  fs.writeFileSync(BOOTSTRAP_CACHE_FILE, JSON.stringify(tldMap, null, 2));
  console.log(`Cached ${Object.keys(tldMap).length} TLDs\n`);
  
  return tldMap;
}

/**
 * Get RDAP URL for a TLD
 */
function getRdapUrl(tldMap, tld) {
  const url = tldMap[tld.toLowerCase()];
  if (!url) {
    return null;
  }
  
  // Normalize URL format
  let base = url.endsWith('/') ? url : url + '/';
  
  // Some registries use different path formats
  if (!base.includes('/domain')) {
    base += 'domain/';
  } else if (!base.endsWith('/')) {
    base += '/';
  }
  
  return base;
}

/**
 * Check if a domain is available
 */
async function checkDomain(domain, tldMap) {
  const parts = domain.toLowerCase().split('.');
  if (parts.length < 2) {
    return { domain, available: null, error: 'Invalid domain format' };
  }

  const tld = parts[parts.length - 1];
  const rdapBase = getRdapUrl(tldMap, tld);
  
  if (!rdapBase) {
    return { domain, available: null, error: `TLD .${tld} not supported by RDAP` };
  }

  const rdapUrl = `${rdapBase}${domain}`;
  
  try {
    const response = await fetch(rdapUrl, {
      method: 'HEAD', // Just need status code
      headers: { 'Accept': 'application/rdap+json' }
    });

    if (response.status === 200) {
      return { domain, available: false, status: 'taken' };
    } else if (response.status === 404) {
      return { domain, available: true, status: 'available' };
    } else {
      return { domain, available: null, error: `Unexpected status: ${response.status}` };
    }
  } catch (error) {
    return { domain, available: null, error: error.message };
  }
}

/**
 * Check single domain
 */
async function checkSingle(domain, flags) {
  const tldMap = await getBootstrapData(flags.refresh);
  const result = await checkDomain(domain, tldMap);
  
  if (result.available === true) {
    console.log(`✓ ${result.domain} is AVAILABLE`);
  } else if (result.available === false) {
    console.log(`✗ ${result.domain} is TAKEN`);
  } else {
    console.log(`? ${result.domain}: ${result.error}`);
  }
  
  output(result);
}

/**
 * Check multiple domains
 */
async function checkBulk(domains, flags) {
  const tldMap = await getBootstrapData(flags.refresh);
  const results = [];

  for (const domain of domains) {
    const result = await checkDomain(domain, tldMap);
    results.push(result);
    
    if (result.available === true) {
      console.log(`✓ ${result.domain} - AVAILABLE`);
    } else if (result.available === false) {
      console.log(`✗ ${result.domain} - taken`);
    } else {
      console.log(`? ${result.domain} - ${result.error}`);
    }
  }

  console.log('');
  const available = results.filter(r => r.available === true);
  const taken = results.filter(r => r.available === false);
  
  console.log(`Summary: ${available.length} available, ${taken.length} taken`);
  
  if (available.length > 0) {
    console.log(`\nAvailable domains:`);
    available.forEach(r => console.log(`  ${r.domain}`));
  }
}

/**
 * Suggest domains across TLDs
 */
async function suggestDomains(name, flags) {
  const defaultTlds = 'com,net,org,io,co,app,dev,ai';
  const tlds = (flags.tlds || defaultTlds).split(',').map(t => t.trim());
  
  const domains = tlds.map(tld => `${name}.${tld}`);
  
  console.log(`Checking "${name}" across ${tlds.length} TLDs...\n`);
  
  await checkBulk(domains, flags);
}

/**
 * List supported TLDs
 */
async function listTlds(flags) {
  const tldMap = await getBootstrapData(flags.refresh);
  const tlds = Object.keys(tldMap).sort();
  
  console.log(`${tlds.length} TLDs with RDAP support:\n`);
  
  // Group by first letter
  const grouped = {};
  for (const tld of tlds) {
    const letter = tld[0].toUpperCase();
    if (!grouped[letter]) grouped[letter] = [];
    grouped[letter].push(tld);
  }

  for (const letter of Object.keys(grouped).sort()) {
    console.log(`${letter}: ${grouped[letter].join(', ')}`);
  }
}

/**
 * Load Cloudflare TLD registry
 */
function loadCloudflareTlds() {
  if (!fs.existsSync(CLOUDFLARE_TLDS_FILE)) {
    throw new Error(`Cloudflare TLD registry not found: ${CLOUDFLARE_TLDS_FILE}`);
  }
  
  const data = JSON.parse(fs.readFileSync(CLOUDFLARE_TLDS_FILE, 'utf-8'));
  return data.tlds;
}

/**
 * List Cloudflare TLDs with pricing
 */
async function listCloudflareTlds(flags) {
  const cfTlds = loadCloudflareTlds();
  const maxPrice = flags['max-price'] ? parseFloat(flags['max-price']) : null;
  const sortBy = flags.sort || 'price';
  
  let tlds = Object.entries(cfTlds).map(([tld, info]) => ({
    tld,
    price: info.price,
    renewal: info.renewal
  }));
  
  // Filter by max price
  if (maxPrice !== null) {
    tlds = tlds.filter(t => t.price <= maxPrice);
  }
  
  // Sort
  if (sortBy === 'price') {
    tlds.sort((a, b) => a.price - b.price);
  } else {
    tlds.sort((a, b) => a.tld.localeCompare(b.tld));
  }
  
  console.log(`Cloudflare Registrar TLDs${maxPrice ? ` (max $${maxPrice}/yr)` : ''}:\n`);
  console.log('TLD'.padEnd(20) + 'Price/yr'.padEnd(12) + 'Renewal/yr');
  console.log('-'.repeat(44));
  
  for (const t of tlds) {
    console.log(`.${t.tld}`.padEnd(20) + `$${t.price.toFixed(2)}`.padEnd(12) + `$${t.renewal.toFixed(2)}`);
  }
  
  console.log(`\nTotal: ${tlds.length} TLDs`);
  console.log(`\nNote: Prices are Cloudflare wholesale (at-cost). Update data/cloudflare-tlds.json as needed.`);
}

/**
 * Search across Cloudflare TLDs with pricing
 */
async function searchCloudflare(name, flags) {
  const cfTlds = loadCloudflareTlds();
  const tldMap = await getBootstrapData(flags.refresh);
  const maxPrice = flags['max-price'] ? parseFloat(flags['max-price']) : null;
  
  // Get TLDs to check, filtered by max price
  let tldList = Object.entries(cfTlds);
  if (maxPrice !== null) {
    tldList = tldList.filter(([_, info]) => info.price <= maxPrice);
  }
  
  // Sort by price (cheapest first)
  tldList.sort((a, b) => a[1].price - b[1].price);
  
  const domains = tldList.map(([tld, _]) => `${name}.${tld}`);
  
  console.log(`Checking "${name}" across ${tldList.length} Cloudflare TLDs${maxPrice ? ` (max $${maxPrice}/yr)` : ''}...\n`);
  
  const results = [];
  
  for (const [tld, info] of tldList) {
    const domain = `${name}.${tld}`;
    const result = await checkDomain(domain, tldMap);
    result.price = info.price;
    result.renewal = info.renewal;
    results.push(result);
    
    const priceStr = `$${info.price.toFixed(2)}/yr`;
    
    if (result.available === true) {
      console.log(`✓ ${domain.padEnd(25)} ${priceStr.padEnd(12)} AVAILABLE`);
    } else if (result.available === false) {
      console.log(`✗ ${domain.padEnd(25)} ${priceStr.padEnd(12)} taken`);
    } else {
      console.log(`? ${domain.padEnd(25)} ${priceStr.padEnd(12)} ${result.error}`);
    }
  }
  
  console.log('');
  const available = results.filter(r => r.available === true);
  const taken = results.filter(r => r.available === false);
  
  console.log(`Summary: ${available.length} available, ${taken.length} taken`);
  
  if (available.length > 0) {
    console.log(`\nAvailable domains (sorted by price):`);
    available.sort((a, b) => a.price - b.price);
    for (const r of available) {
      console.log(`  ${r.domain.padEnd(25)} $${r.price.toFixed(2)}/yr`);
    }
    
    const cheapest = available[0];
    console.log(`\nCheapest: ${cheapest.domain} at $${cheapest.price.toFixed(2)}/yr`);
  }
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
      case 'check':
        if (!args._[1]) throw new Error('Domain required');
        await checkSingle(args._[1], args);
        break;

      case 'bulk':
        const domains = args._.slice(1);
        if (domains.length === 0) throw new Error('At least one domain required');
        await checkBulk(domains, args);
        break;

      case 'suggest':
        if (!args._[1]) throw new Error('Name required');
        await suggestDomains(args._[1], args);
        break;

      case 'cloudflare':
      case 'cf':
        if (!args._[1]) throw new Error('Name required');
        await searchCloudflare(args._[1], args);
        break;

      case 'cf-tlds':
      case 'cloudflare-tlds':
        await listCloudflareTlds(args);
        break;

      case 'tlds':
        await listTlds(args);
        break;

      default:
        // Assume it's a domain check
        if (command.includes('.')) {
          await checkSingle(command, args);
        } else {
          console.error(`Unknown command: ${command}`);
          showHelp();
          process.exit(1);
        }
    }
  } catch (error) {
    outputError(error);
  }
}

main();
