#!/usr/bin/env node
/**
 * Cloudflare Email Routing Script
 * Manage email routing rules for your domains.
 */

import { parseArgs, apiRequest, fetchAllPages, resolveZoneId, output, outputError } from './utils.js';

function showHelp() {
  console.log(`
Email Routing Script - Manage Cloudflare email routing

Usage: node scripts/email-routing.js <command> [options]

Commands:
  status <zone>                   Get email routing status for a zone
  enable <zone>                   Enable email routing
  disable <zone>                  Disable email routing
  rules <zone>                    List email routing rules
  rule <zone> <rule-id>           Get a specific rule
  create <zone>                   Create an email routing rule
  update <zone> <rule-id>         Update a rule
  delete <zone> <rule-id>         Delete a rule
  addresses                       List destination addresses (account-level)
  help                            Show this help

Create/Update Options:
  --name <name>             Rule name
  --matcher <address>       Email address to match (e.g., contact@example.com)
  --action <action>         Action: forward, drop, worker
  --destination <email>     Forward destination email
  --enabled                 Enable the rule (default: true)
  --priority <num>          Rule priority

Examples:
  node scripts/email-routing.js status example.com
  node scripts/email-routing.js enable example.com
  node scripts/email-routing.js rules example.com
  node scripts/email-routing.js create example.com --name "Contact" --matcher "contact@example.com" --action forward --destination "me@gmail.com"
  node scripts/email-routing.js create example.com --name "Catch-all" --matcher "*@example.com" --action forward --destination "me@gmail.com"
  node scripts/email-routing.js delete example.com abc123

Note: Destination email addresses must be verified first in Cloudflare dashboard.
`);
}

async function getAccountId() {
  const data = await apiRequest('/zones?per_page=1');
  const zones = data.result || [];
  if (zones.length === 0) {
    throw new Error('No zones found. Cannot determine account ID.');
  }
  return zones[0].account.id;
}

async function getStatus(zoneIdentifier) {
  const zoneId = await resolveZoneId(zoneIdentifier);
  const data = await apiRequest(`/zones/${zoneId}/email/routing`);
  output(data.result);
}

async function enableRouting(zoneIdentifier) {
  const zoneId = await resolveZoneId(zoneIdentifier);
  
  const data = await apiRequest(`/zones/${zoneId}/email/routing/enable`, {
    method: 'POST'
  });

  console.log('Email routing enabled');
  output(data.result);
}

async function disableRouting(zoneIdentifier) {
  const zoneId = await resolveZoneId(zoneIdentifier);
  
  const data = await apiRequest(`/zones/${zoneId}/email/routing/disable`, {
    method: 'POST'
  });

  console.log('Email routing disabled');
  output(data.result);
}

async function listRules(zoneIdentifier) {
  const zoneId = await resolveZoneId(zoneIdentifier);
  const rules = await fetchAllPages(`/zones/${zoneId}/email/routing/rules`);
  
  const simplified = rules.map(r => ({
    id: r.tag,
    name: r.name,
    enabled: r.enabled,
    priority: r.priority,
    matchers: r.matchers?.map(m => m.value),
    actions: r.actions?.map(a => ({ type: a.type, value: a.value }))
  }));
  
  output(simplified);
}

async function getRule(zoneIdentifier, ruleId) {
  const zoneId = await resolveZoneId(zoneIdentifier);
  const data = await apiRequest(`/zones/${zoneId}/email/routing/rules/${ruleId}`);
  output(data.result);
}

async function createRule(zoneIdentifier, flags) {
  if (!flags.matcher) {
    throw new Error('--matcher required (email address to match)');
  }
  if (!flags.action) {
    throw new Error('--action required (forward, drop, or worker)');
  }

  const zoneId = await resolveZoneId(zoneIdentifier);
  
  const rule = {
    name: flags.name || 'Email rule',
    enabled: flags.enabled !== false,
    matchers: [
      {
        type: 'literal',
        field: 'to',
        value: flags.matcher
      }
    ],
    actions: []
  };

  // Handle catch-all
  if (flags.matcher.startsWith('*@')) {
    rule.matchers[0].type = 'all';
  }

  // Set action
  if (flags.action === 'forward') {
    if (!flags.destination) {
      throw new Error('--destination required for forward action');
    }
    rule.actions.push({
      type: 'forward',
      value: [flags.destination]
    });
  } else if (flags.action === 'drop') {
    rule.actions.push({ type: 'drop' });
  } else if (flags.action === 'worker') {
    if (!flags.destination) {
      throw new Error('--destination required for worker action (worker name)');
    }
    rule.actions.push({
      type: 'worker',
      value: [flags.destination]
    });
  }

  if (flags.priority !== undefined) {
    rule.priority = parseInt(flags.priority);
  }

  const data = await apiRequest(`/zones/${zoneId}/email/routing/rules`, {
    method: 'POST',
    body: rule
  });

  console.log(`Created email rule: ${rule.name}`);
  output(data.result);
}

async function updateRule(zoneIdentifier, ruleId, flags) {
  const zoneId = await resolveZoneId(zoneIdentifier);

  // Get existing rule
  const existing = await apiRequest(`/zones/${zoneId}/email/routing/rules/${ruleId}`);
  const rule = existing.result;

  // Update fields
  if (flags.name) rule.name = flags.name;
  if (flags.enabled !== undefined) rule.enabled = flags.enabled;
  if (flags.priority !== undefined) rule.priority = parseInt(flags.priority);

  if (flags.matcher) {
    rule.matchers = [{
      type: flags.matcher.startsWith('*@') ? 'all' : 'literal',
      field: 'to',
      value: flags.matcher
    }];
  }

  if (flags.action) {
    if (flags.action === 'forward' && flags.destination) {
      rule.actions = [{ type: 'forward', value: [flags.destination] }];
    } else if (flags.action === 'drop') {
      rule.actions = [{ type: 'drop' }];
    }
  }

  const data = await apiRequest(`/zones/${zoneId}/email/routing/rules/${ruleId}`, {
    method: 'PUT',
    body: rule
  });

  console.log(`Updated email rule: ${rule.name}`);
  output(data.result);
}

async function deleteRule(zoneIdentifier, ruleId) {
  const zoneId = await resolveZoneId(zoneIdentifier);

  await apiRequest(`/zones/${zoneId}/email/routing/rules/${ruleId}`, {
    method: 'DELETE'
  });

  console.log(`Deleted email rule: ${ruleId}`);
}

async function listDestinationAddresses() {
  const accountId = await getAccountId();
  const addresses = await fetchAllPages(`/accounts/${accountId}/email/routing/addresses`);
  
  const simplified = addresses.map(a => ({
    email: a.email,
    verified: a.verified,
    created: a.created
  }));
  
  output(simplified);
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
      case 'status':
        await getStatus(args._[1]);
        break;

      case 'enable':
        await enableRouting(args._[1]);
        break;

      case 'disable':
        await disableRouting(args._[1]);
        break;

      case 'rules':
        await listRules(args._[1]);
        break;

      case 'rule':
        await getRule(args._[1], args._[2]);
        break;

      case 'create':
        await createRule(args._[1], args);
        break;

      case 'update':
        await updateRule(args._[1], args._[2], args);
        break;

      case 'delete':
        await deleteRule(args._[1], args._[2]);
        break;

      case 'addresses':
        await listDestinationAddresses();
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
