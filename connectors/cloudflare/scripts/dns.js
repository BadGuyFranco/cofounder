#!/usr/bin/env node
/**
 * Cloudflare DNS Script
 * Manage DNS records for your zones.
 */

import { parseArgs, apiRequest, fetchAllPages, resolveZoneId, output, outputError, parseJSON } from './utils.js';

function showHelp() {
  console.log(`
DNS Script - Manage Cloudflare DNS records

Usage: node scripts/dns.js <command> [options]

Commands:
  list <zone>                     List all DNS records for a zone
  get <zone> <record-id>          Get a specific DNS record
  create <zone>                   Create a new DNS record
  update <zone> <record-id>       Update a DNS record
  delete <zone> <record-id>       Delete a DNS record
  help                            Show this help

Create/Update Options:
  --type <type>           Record type (A, AAAA, CNAME, MX, TXT, SRV, etc.)
  --name <name>           Record name (use @ for root)
  --content <content>     Record content (IP, hostname, etc.)
  --ttl <seconds>         Time to live (1 = automatic, default: 1)
  --proxied               Enable Cloudflare proxy (orange cloud)
  --priority <num>        MX priority (required for MX records)
  --data <json>           JSON data for complex records (SRV, etc.)

List Options:
  --type <type>           Filter by record type
  --name <name>           Filter by name (exact match)
  --content <content>     Filter by content (exact match)

Examples:
  node scripts/dns.js list example.com
  node scripts/dns.js list example.com --type A
  node scripts/dns.js create example.com --type A --name www --content 192.0.2.1 --proxied
  node scripts/dns.js create example.com --type MX --name @ --content mail.example.com --priority 10
  node scripts/dns.js create example.com --type TXT --name @ --content "v=spf1 include:_spf.google.com ~all"
  node scripts/dns.js update example.com abc123 --content 192.0.2.2
  node scripts/dns.js delete example.com abc123
`);
}

async function listRecords(zoneIdentifier, flags) {
  const zoneId = await resolveZoneId(zoneIdentifier);
  
  let endpoint = `/zones/${zoneId}/dns_records`;
  const params = [];

  if (flags.type) {
    params.push(`type=${encodeURIComponent(flags.type)}`);
  }
  if (flags.name) {
    params.push(`name=${encodeURIComponent(flags.name)}`);
  }
  if (flags.content) {
    params.push(`content=${encodeURIComponent(flags.content)}`);
  }

  if (params.length > 0) {
    endpoint += '?' + params.join('&');
  }

  const records = await fetchAllPages(endpoint);
  
  // Simplified output
  const simplified = records.map(r => ({
    id: r.id,
    type: r.type,
    name: r.name,
    content: r.content,
    proxied: r.proxied,
    ttl: r.ttl,
    priority: r.priority
  }));

  output(simplified);
}

async function getRecord(zoneIdentifier, recordId) {
  const zoneId = await resolveZoneId(zoneIdentifier);
  const data = await apiRequest(`/zones/${zoneId}/dns_records/${recordId}`);
  output(data.result);
}

async function createRecord(zoneIdentifier, flags) {
  const zoneId = await resolveZoneId(zoneIdentifier);

  if (!flags.type) {
    throw new Error('--type is required (A, AAAA, CNAME, MX, TXT, SRV, etc.)');
  }
  if (!flags.name) {
    throw new Error('--name is required (use @ for root domain)');
  }

  const record = {
    type: flags.type.toUpperCase(),
    name: flags.name === '@' ? flags.name : flags.name,
    ttl: flags.ttl ? parseInt(flags.ttl) : 1
  };

  // Handle different record types
  if (flags.data) {
    record.data = parseJSON(flags.data, 'data');
  } else if (flags.content) {
    record.content = flags.content;
  } else {
    throw new Error('--content or --data is required');
  }

  if (flags.proxied !== undefined) {
    record.proxied = flags.proxied === true || flags.proxied === 'true';
  }

  if (flags.priority !== undefined) {
    record.priority = parseInt(flags.priority);
  }

  // MX records require priority
  if (record.type === 'MX' && record.priority === undefined) {
    throw new Error('--priority is required for MX records');
  }

  const data = await apiRequest(`/zones/${zoneId}/dns_records`, {
    method: 'POST',
    body: record
  });

  console.log(`Created DNS record: ${data.result.type} ${data.result.name}`);
  output(data.result);
}

async function updateRecord(zoneIdentifier, recordId, flags) {
  const zoneId = await resolveZoneId(zoneIdentifier);

  // First get existing record
  const existing = await apiRequest(`/zones/${zoneId}/dns_records/${recordId}`);
  const record = existing.result;

  // Update fields if provided
  if (flags.type) record.type = flags.type.toUpperCase();
  if (flags.name) record.name = flags.name;
  if (flags.content) record.content = flags.content;
  if (flags.ttl) record.ttl = parseInt(flags.ttl);
  if (flags.priority !== undefined) record.priority = parseInt(flags.priority);
  if (flags.proxied !== undefined) {
    record.proxied = flags.proxied === true || flags.proxied === 'true';
  }
  if (flags.data) {
    record.data = parseJSON(flags.data, 'data');
  }

  const data = await apiRequest(`/zones/${zoneId}/dns_records/${recordId}`, {
    method: 'PUT',
    body: record
  });

  console.log(`Updated DNS record: ${data.result.type} ${data.result.name}`);
  output(data.result);
}

async function deleteRecord(zoneIdentifier, recordId) {
  const zoneId = await resolveZoneId(zoneIdentifier);

  // Get record info first for confirmation message
  const existing = await apiRequest(`/zones/${zoneId}/dns_records/${recordId}`);
  const record = existing.result;

  await apiRequest(`/zones/${zoneId}/dns_records/${recordId}`, {
    method: 'DELETE'
  });

  console.log(`Deleted DNS record: ${record.type} ${record.name} -> ${record.content}`);
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
      case 'list':
        if (!args._[1]) {
          throw new Error('Zone ID or domain name required. Usage: list <zone>');
        }
        await listRecords(args._[1], args);
        break;

      case 'get':
        if (!args._[1] || !args._[2]) {
          throw new Error('Zone and record ID required. Usage: get <zone> <record-id>');
        }
        await getRecord(args._[1], args._[2]);
        break;

      case 'create':
        if (!args._[1]) {
          throw new Error('Zone ID or domain name required. Usage: create <zone> [options]');
        }
        await createRecord(args._[1], args);
        break;

      case 'update':
        if (!args._[1] || !args._[2]) {
          throw new Error('Zone and record ID required. Usage: update <zone> <record-id> [options]');
        }
        await updateRecord(args._[1], args._[2], args);
        break;

      case 'delete':
        if (!args._[1] || !args._[2]) {
          throw new Error('Zone and record ID required. Usage: delete <zone> <record-id>');
        }
        await deleteRecord(args._[1], args._[2]);
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
