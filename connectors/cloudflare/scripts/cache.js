#!/usr/bin/env node
/**
 * Cloudflare Cache Script
 * Purge cached content from your zones.
 */

import { parseArgs, apiRequest, resolveZoneId, output, outputError, parseJSON } from './utils.js';

function showHelp() {
  console.log(`
Cache Script - Purge Cloudflare cache

Usage: node scripts/cache.js <command> [options]

Commands:
  purge-all <zone>        Purge all cached content
  purge-urls <zone>       Purge specific URLs
  purge-tags <zone>       Purge by cache tags
  purge-hosts <zone>      Purge by hostnames
  help                    Show this help

Options:
  --urls <json>           JSON array of URLs to purge
  --tags <json>           JSON array of cache tags to purge
  --hosts <json>          JSON array of hostnames to purge

Examples:
  node scripts/cache.js purge-all example.com
  node scripts/cache.js purge-urls example.com --urls '["https://example.com/page1", "https://example.com/page2"]'
  node scripts/cache.js purge-tags example.com --tags '["product-123", "category-abc"]'
  node scripts/cache.js purge-hosts example.com --hosts '["www.example.com", "api.example.com"]'
`);
}

async function purgeAll(zoneIdentifier) {
  const zoneId = await resolveZoneId(zoneIdentifier);
  
  const data = await apiRequest(`/zones/${zoneId}/purge_cache`, {
    method: 'POST',
    body: { purge_everything: true }
  });

  console.log('Cache purged: All content cleared');
  output(data.result);
}

async function purgeUrls(zoneIdentifier, flags) {
  if (!flags.urls) {
    throw new Error('--urls is required. Provide JSON array of URLs.');
  }

  const urls = parseJSON(flags.urls, 'urls');
  if (!Array.isArray(urls) || urls.length === 0) {
    throw new Error('--urls must be a non-empty JSON array of URLs');
  }

  const zoneId = await resolveZoneId(zoneIdentifier);
  
  const data = await apiRequest(`/zones/${zoneId}/purge_cache`, {
    method: 'POST',
    body: { files: urls }
  });

  console.log(`Cache purged: ${urls.length} URL(s) cleared`);
  output(data.result);
}

async function purgeTags(zoneIdentifier, flags) {
  if (!flags.tags) {
    throw new Error('--tags is required. Provide JSON array of cache tags.');
  }

  const tags = parseJSON(flags.tags, 'tags');
  if (!Array.isArray(tags) || tags.length === 0) {
    throw new Error('--tags must be a non-empty JSON array of cache tags');
  }

  const zoneId = await resolveZoneId(zoneIdentifier);
  
  const data = await apiRequest(`/zones/${zoneId}/purge_cache`, {
    method: 'POST',
    body: { tags: tags }
  });

  console.log(`Cache purged: ${tags.length} tag(s) cleared`);
  output(data.result);
}

async function purgeHosts(zoneIdentifier, flags) {
  if (!flags.hosts) {
    throw new Error('--hosts is required. Provide JSON array of hostnames.');
  }

  const hosts = parseJSON(flags.hosts, 'hosts');
  if (!Array.isArray(hosts) || hosts.length === 0) {
    throw new Error('--hosts must be a non-empty JSON array of hostnames');
  }

  const zoneId = await resolveZoneId(zoneIdentifier);
  
  const data = await apiRequest(`/zones/${zoneId}/purge_cache`, {
    method: 'POST',
    body: { hosts: hosts }
  });

  console.log(`Cache purged: ${hosts.length} host(s) cleared`);
  output(data.result);
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
      case 'purge-all':
        if (!args._[1]) {
          throw new Error('Zone ID or domain name required. Usage: purge-all <zone>');
        }
        await purgeAll(args._[1]);
        break;

      case 'purge-urls':
        if (!args._[1]) {
          throw new Error('Zone ID or domain name required. Usage: purge-urls <zone> --urls [...]');
        }
        await purgeUrls(args._[1], args);
        break;

      case 'purge-tags':
        if (!args._[1]) {
          throw new Error('Zone ID or domain name required. Usage: purge-tags <zone> --tags [...]');
        }
        await purgeTags(args._[1], args);
        break;

      case 'purge-hosts':
        if (!args._[1]) {
          throw new Error('Zone ID or domain name required. Usage: purge-hosts <zone> --hosts [...]');
        }
        await purgeHosts(args._[1], args);
        break;

      default:
        console.error(`Unknown command: ${command}`);
        showHelp();
        process.exit(1);
    }
  } catch (error) {
    outputError(error);
  }
}

main();
