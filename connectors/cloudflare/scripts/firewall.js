#!/usr/bin/env node
/**
 * Cloudflare Firewall Script
 * Manage firewall rules for your zones.
 */

import { parseArgs, apiRequest, fetchAllPages, resolveZoneId, output, outputError } from './utils.js';

function showHelp() {
  console.log(`
Firewall Script - Manage Cloudflare firewall rules

Usage: node scripts/firewall.js <command> [options]

Commands:
  list <zone>                     List all firewall rules
  get <zone> <rule-id>            Get a specific firewall rule
  create <zone>                   Create a firewall rule
  update <zone> <rule-id>         Update a firewall rule
  delete <zone> <rule-id>         Delete a firewall rule
  help                            Show this help

Create/Update Options:
  --action <action>       Rule action (block, challenge, js_challenge, managed_challenge, allow, log, bypass)
  --expression <expr>     Filter expression (e.g., 'ip.src == 192.0.2.1')
  --description <text>    Rule description
  --priority <num>        Rule priority (optional)
  --paused                Create rule as paused

Expression Examples:
  'ip.src == 192.0.2.1'                         Block specific IP
  'ip.src in {192.0.2.0/24}'                    Block IP range
  'http.request.uri.path contains "/admin"'    Protect admin paths
  'cf.threat_score > 30'                        Block high threat scores
  '(ip.geoip.country == "XX")'                  Block by country

Examples:
  node scripts/firewall.js list example.com
  node scripts/firewall.js create example.com --action block --expression 'ip.src == 192.0.2.1' --description "Block bad actor"
  node scripts/firewall.js create example.com --action challenge --expression 'cf.threat_score > 30' --description "Challenge suspicious traffic"
  node scripts/firewall.js delete example.com abc123
`);
}

async function listRules(zoneIdentifier) {
  const zoneId = await resolveZoneId(zoneIdentifier);
  const rules = await fetchAllPages(`/zones/${zoneId}/firewall/rules`);

  // Simplified output
  const simplified = rules.map(r => ({
    id: r.id,
    description: r.description,
    action: r.action,
    expression: r.filter?.expression,
    priority: r.priority,
    paused: r.paused
  }));

  output(simplified);
}

async function getRule(zoneIdentifier, ruleId) {
  const zoneId = await resolveZoneId(zoneIdentifier);
  const data = await apiRequest(`/zones/${zoneId}/firewall/rules/${ruleId}`);
  output(data.result);
}

async function createRule(zoneIdentifier, flags) {
  if (!flags.action) {
    throw new Error('--action is required (block, challenge, js_challenge, managed_challenge, allow, log, bypass)');
  }
  if (!flags.expression) {
    throw new Error('--expression is required (filter expression)');
  }

  const zoneId = await resolveZoneId(zoneIdentifier);

  // First create the filter
  const filterData = await apiRequest(`/zones/${zoneId}/filters`, {
    method: 'POST',
    body: [{
      expression: flags.expression,
      description: flags.description || ''
    }]
  });

  const filterId = filterData.result[0].id;

  // Then create the firewall rule
  const rule = {
    filter: { id: filterId },
    action: flags.action,
    description: flags.description || '',
    paused: flags.paused === true || flags.paused === 'true'
  };

  if (flags.priority !== undefined) {
    rule.priority = parseInt(flags.priority);
  }

  const data = await apiRequest(`/zones/${zoneId}/firewall/rules`, {
    method: 'POST',
    body: [rule]
  });

  console.log(`Created firewall rule: ${flags.action} - ${flags.expression}`);
  output(data.result[0]);
}

async function updateRule(zoneIdentifier, ruleId, flags) {
  const zoneId = await resolveZoneId(zoneIdentifier);

  // Get existing rule
  const existing = await apiRequest(`/zones/${zoneId}/firewall/rules/${ruleId}`);
  const rule = existing.result;

  // Update fields if provided
  if (flags.action) rule.action = flags.action;
  if (flags.description !== undefined) rule.description = flags.description;
  if (flags.paused !== undefined) {
    rule.paused = flags.paused === true || flags.paused === 'true';
  }
  if (flags.priority !== undefined) {
    rule.priority = parseInt(flags.priority);
  }

  // If expression changed, update the filter
  if (flags.expression) {
    await apiRequest(`/zones/${zoneId}/filters/${rule.filter.id}`, {
      method: 'PUT',
      body: {
        id: rule.filter.id,
        expression: flags.expression,
        description: rule.description || ''
      }
    });
    rule.filter.expression = flags.expression;
  }

  const data = await apiRequest(`/zones/${zoneId}/firewall/rules/${ruleId}`, {
    method: 'PUT',
    body: rule
  });

  console.log(`Updated firewall rule: ${rule.action}`);
  output(data.result);
}

async function deleteRule(zoneIdentifier, ruleId) {
  const zoneId = await resolveZoneId(zoneIdentifier);

  // Get rule info first
  const existing = await apiRequest(`/zones/${zoneId}/firewall/rules/${ruleId}`);
  const rule = existing.result;
  const filterId = rule.filter?.id;

  // Delete the firewall rule
  await apiRequest(`/zones/${zoneId}/firewall/rules/${ruleId}`, {
    method: 'DELETE'
  });

  // Also delete the associated filter
  if (filterId) {
    try {
      await apiRequest(`/zones/${zoneId}/filters/${filterId}`, {
        method: 'DELETE'
      });
    } catch (e) {
      // Filter might already be deleted
    }
  }

  console.log(`Deleted firewall rule: ${rule.description || rule.action}`);
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
        await listRules(args._[1]);
        break;

      case 'get':
        if (!args._[1] || !args._[2]) {
          throw new Error('Zone and rule ID required. Usage: get <zone> <rule-id>');
        }
        await getRule(args._[1], args._[2]);
        break;

      case 'create':
        if (!args._[1]) {
          throw new Error('Zone ID or domain name required. Usage: create <zone> [options]');
        }
        await createRule(args._[1], args);
        break;

      case 'update':
        if (!args._[1] || !args._[2]) {
          throw new Error('Zone and rule ID required. Usage: update <zone> <rule-id> [options]');
        }
        await updateRule(args._[1], args._[2], args);
        break;

      case 'delete':
        if (!args._[1] || !args._[2]) {
          throw new Error('Zone and rule ID required. Usage: delete <zone> <rule-id>');
        }
        await deleteRule(args._[1], args._[2]);
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
