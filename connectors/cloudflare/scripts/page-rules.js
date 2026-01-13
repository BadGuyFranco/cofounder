#!/usr/bin/env node
/**
 * Cloudflare Page Rules Script
 * Manage page rules for URL forwarding and redirects.
 */

import { parseArgs, apiRequest, resolveZoneId, output, outputError } from './utils.js';

function showHelp() {
  console.log(`
Page Rules Script - Manage Cloudflare page rules

Usage: node scripts/page-rules.js <command> [options]

Commands:
  list <zone>                     List all page rules for a zone
  get <zone> <rule-id>            Get a specific page rule
  create <zone>                   Create a new page rule (redirect)
  update <zone> <rule-id>         Update a page rule
  delete <zone> <rule-id>         Delete a page rule
  help                            Show this help

Create/Update Options:
  --url <pattern>         URL pattern to match (e.g., example.com/*)
  --destination <url>     Redirect destination URL (e.g., https://www.example.com/$1)
  --status <code>         Redirect status code (301 or 302, default: 301)
  --priority <num>        Rule priority (lower = higher priority)
  --disabled              Create rule as disabled

Examples:
  node scripts/page-rules.js list example.com
  node scripts/page-rules.js create example.com --url "example.com/*" --destination "https://www.example.com/\\$1" --status 301
  node scripts/page-rules.js create example.com --url "old.example.com/*" --destination "https://new.example.com/\\$1" --status 302
  node scripts/page-rules.js delete example.com abc123

Note: In shell, escape $ as \\$ for capture groups in destination URLs.
`);
}

async function listPageRules(zoneIdentifier) {
  const zoneId = await resolveZoneId(zoneIdentifier);
  const data = await apiRequest(`/zones/${zoneId}/pagerules`);
  const rules = data.result || [];

  // Simplified output
  const simplified = rules.map(r => {
    const target = r.targets?.[0]?.constraint?.value || 'unknown';
    const action = r.actions?.find(a => a.id === 'forwarding_url');
    
    return {
      id: r.id,
      url_pattern: target,
      destination: action?.value?.url,
      status_code: action?.value?.status_code,
      priority: r.priority,
      status: r.status
    };
  });

  output(simplified);
}

async function getPageRule(zoneIdentifier, ruleId) {
  const zoneId = await resolveZoneId(zoneIdentifier);
  const data = await apiRequest(`/zones/${zoneId}/pagerules/${ruleId}`);
  output(data.result);
}

async function createPageRule(zoneIdentifier, flags) {
  const zoneId = await resolveZoneId(zoneIdentifier);

  if (!flags.url) {
    throw new Error('--url is required (URL pattern to match)');
  }
  if (!flags.destination) {
    throw new Error('--destination is required (redirect destination URL)');
  }

  const rule = {
    targets: [
      {
        target: 'url',
        constraint: {
          operator: 'matches',
          value: flags.url
        }
      }
    ],
    actions: [
      {
        id: 'forwarding_url',
        value: {
          url: flags.destination,
          status_code: flags.status ? parseInt(flags.status) : 301
        }
      }
    ],
    status: flags.disabled ? 'disabled' : 'active'
  };

  if (flags.priority !== undefined) {
    rule.priority = parseInt(flags.priority);
  }

  const data = await apiRequest(`/zones/${zoneId}/pagerules`, {
    method: 'POST',
    body: rule
  });

  console.log(`Created page rule: ${flags.url} -> ${flags.destination}`);
  output(data.result);
}

async function updatePageRule(zoneIdentifier, ruleId, flags) {
  const zoneId = await resolveZoneId(zoneIdentifier);

  // First get existing rule
  const existing = await apiRequest(`/zones/${zoneId}/pagerules/${ruleId}`);
  const rule = existing.result;

  // Update fields if provided
  if (flags.url) {
    rule.targets[0].constraint.value = flags.url;
  }

  const forwardingAction = rule.actions.find(a => a.id === 'forwarding_url');
  if (forwardingAction) {
    if (flags.destination) {
      forwardingAction.value.url = flags.destination;
    }
    if (flags.status) {
      forwardingAction.value.status_code = parseInt(flags.status);
    }
  }

  if (flags.priority !== undefined) {
    rule.priority = parseInt(flags.priority);
  }

  if (flags.disabled !== undefined) {
    rule.status = flags.disabled ? 'disabled' : 'active';
  }

  const data = await apiRequest(`/zones/${zoneId}/pagerules/${ruleId}`, {
    method: 'PUT',
    body: rule
  });

  console.log(`Updated page rule: ${rule.targets[0].constraint.value}`);
  output(data.result);
}

async function deletePageRule(zoneIdentifier, ruleId) {
  const zoneId = await resolveZoneId(zoneIdentifier);

  // Get rule info first for confirmation message
  const existing = await apiRequest(`/zones/${zoneId}/pagerules/${ruleId}`);
  const rule = existing.result;
  const pattern = rule.targets?.[0]?.constraint?.value || 'unknown';

  await apiRequest(`/zones/${zoneId}/pagerules/${ruleId}`, {
    method: 'DELETE'
  });

  console.log(`Deleted page rule: ${pattern}`);
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
        await listPageRules(args._[1]);
        break;

      case 'get':
        if (!args._[1] || !args._[2]) {
          throw new Error('Zone and rule ID required. Usage: get <zone> <rule-id>');
        }
        await getPageRule(args._[1], args._[2]);
        break;

      case 'create':
        if (!args._[1]) {
          throw new Error('Zone ID or domain name required. Usage: create <zone> [options]');
        }
        await createPageRule(args._[1], args);
        break;

      case 'update':
        if (!args._[1] || !args._[2]) {
          throw new Error('Zone and rule ID required. Usage: update <zone> <rule-id> [options]');
        }
        await updatePageRule(args._[1], args._[2], args);
        break;

      case 'delete':
        if (!args._[1] || !args._[2]) {
          throw new Error('Zone and rule ID required. Usage: delete <zone> <rule-id>');
        }
        await deletePageRule(args._[1], args._[2]);
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
