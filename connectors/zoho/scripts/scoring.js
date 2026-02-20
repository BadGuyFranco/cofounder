#!/usr/bin/env node

/**
 * Zoho CRM Scoring Rules Management
 * Create, read, update, delete scoring rules for lead/contact ranking.
 */

import { fileURLToPath } from 'url';
import path from 'path';
import {
  initScript, parseArgs, apiRequest, confirmDestructiveAction, handleError, showHelp
} from './utils.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Help documentation
function printHelp() {
  showHelp('Zoho CRM Scoring Rules', {
    'Commands': [
      'list                        List all scoring rules',
      'get <id>                    Get scoring rule details',
      'create                      Create a new scoring rule',
      'update <id>                 Update a scoring rule',
      'delete <id>                 Delete a scoring rule',
      'enable <id>                 Activate a scoring rule',
      'disable <id>                Deactivate a scoring rule',
      'clone <id>                  Clone a scoring rule',
      'execute <id>                Execute scoring rule on existing records',
      'score <module> <id>         Get entity score for a record',
      'help                        Show this help'
    ],
    'Options': [
      '--org <name>                Organization to use',
      '--module <name>             Module (Leads, Contacts, Deals, Accounts)',
      '--name <name>               Scoring rule name',
      '--description <text>        Rule description',
      '--rules <json>              Scoring rules JSON',
      '--verbose                   Show full API response',
      '--force                     Skip confirmation for destructive actions'
    ],
    'Examples': [
      'node scoring.js list',
      'node scoring.js list --module Leads',
      'node scoring.js get 1234567890',
      'node scoring.js score Leads 9876543210',
      'node scoring.js enable 1234567890',
      'node scoring.js disable 1234567890',
      'node scoring.js clone 1234567890 --name "Cloned Rule"'
    ],
    'Scoring Rule JSON': [
      'Rules use field_rules and/or signal_rules.',
      'Score values: -100 to 100',
      '',
      'Operators: equals, not_equal, contains, starts_with,',
      '           in, not_in, greater_than, less_than, between'
    ]
  });
}

// List scoring rules
async function listScoringRules(args) {
  const { config, token } = await initScript(args);
  
  console.log('Fetching scoring rules...\n');
  
  let endpoint = '/settings/automation/scoring_rules';
  
  if (args.module) {
    endpoint += `?module=${args.module}`;
  }
  
  const data = await apiRequest('GET', endpoint, token, null, { region: config.region });
  
  if (args.verbose) {
    console.log(JSON.stringify(data, null, 2));
    return;
  }
  
  const rules = data.scoring_rules || [];
  
  console.log(`Found ${rules.length} scoring rules:\n`);
  
  for (const rule of rules) {
    const status = rule.active ? '[ACTIVE]' : '[INACTIVE]';
    console.log(`- ${rule.name} ${status}`);
    console.log(`  ID: ${rule.id}`);
    console.log(`  Module: ${rule.module?.api_name || 'N/A'}`);
    if (rule.description) {
      console.log(`  Description: ${rule.description}`);
    }
    console.log('');
  }
}

// Get scoring rule details
async function getScoringRule(id, args) {
  const { config, token } = await initScript(args);
  
  const data = await apiRequest('GET', `/settings/automation/scoring_rules/${id}`, token, null, { region: config.region });
  
  if (args.verbose) {
    console.log(JSON.stringify(data, null, 2));
    return;
  }
  
  const rules = data.scoring_rules || [];
  
  if (rules.length === 0) {
    console.error(`Error: Scoring rule not found: ${id}`);
    process.exit(1);
  }
  
  const rule = rules[0];
  
  console.log(`Scoring Rule: ${rule.name}\n`);
  console.log(`ID: ${rule.id}`);
  console.log(`Module: ${rule.module?.api_name || 'N/A'}`);
  console.log(`Active: ${rule.active ? 'Yes' : 'No'}`);
  
  if (rule.description) {
    console.log(`Description: ${rule.description}`);
  }
  
  // Field rules
  if (rule.field_rules && rule.field_rules.length > 0) {
    console.log('\nField Rules:');
    for (const fieldRule of rule.field_rules) {
      console.log(`  - Score: ${fieldRule.score}`);
      if (fieldRule.criteria) {
        console.log(`    Criteria: ${JSON.stringify(fieldRule.criteria)}`);
      }
    }
  }
  
  // Signal rules
  if (rule.signal_rules && rule.signal_rules.length > 0) {
    console.log('\nSignal Rules:');
    for (const signalRule of rule.signal_rules) {
      console.log(`  - Score: ${signalRule.score}`);
      console.log(`    Signal: ${signalRule.signal?.name || 'N/A'}`);
    }
  }
}

// Create scoring rule
async function createScoringRule(args) {
  const { config, token } = await initScript(args);
  
  if (!args.module) {
    console.error('Error: --module is required');
    process.exit(1);
  }
  
  if (!args.name) {
    console.error('Error: --name is required');
    process.exit(1);
  }
  
  const rule = {
    name: args.name,
    module: { api_name: args.module }
  };
  
  if (args.description) {
    rule.description = args.description;
  }
  
  if (args.rules) {
    try {
      const rules = JSON.parse(args.rules);
      if (rules.field_rules) rule.field_rules = rules.field_rules;
      if (rules.signal_rules) rule.signal_rules = rules.signal_rules;
    } catch (e) {
      console.error('Error: Invalid JSON in --rules');
      process.exit(1);
    }
  }
  
  const body = { scoring_rules: [rule] };
  
  const data = await apiRequest('POST', '/settings/automation/scoring_rules', token, body, { region: config.region });
  
  if (args.verbose) {
    console.log(JSON.stringify(data, null, 2));
    return;
  }
  
  if (data.scoring_rules && data.scoring_rules[0]) {
    const result = data.scoring_rules[0];
    if (result.status === 'success') {
      console.log('Scoring rule created successfully!\n');
      console.log(`ID: ${result.details.id}`);
    } else {
      console.error(`Error: ${result.message}`);
      process.exit(1);
    }
  }
}

// Update scoring rule
async function updateScoringRule(id, args) {
  const { config, token } = await initScript(args);
  
  const rule = { id };
  
  if (args.name) rule.name = args.name;
  if (args.description) rule.description = args.description;
  
  if (args.rules) {
    try {
      const rules = JSON.parse(args.rules);
      if (rules.field_rules) rule.field_rules = rules.field_rules;
      if (rules.signal_rules) rule.signal_rules = rules.signal_rules;
    } catch (e) {
      console.error('Error: Invalid JSON in --rules');
      process.exit(1);
    }
  }
  
  const body = { scoring_rules: [rule] };
  
  const data = await apiRequest('PUT', `/settings/automation/scoring_rules/${id}`, token, body, { region: config.region });
  
  if (args.verbose) {
    console.log(JSON.stringify(data, null, 2));
    return;
  }
  
  if (data.scoring_rules && data.scoring_rules[0]) {
    const result = data.scoring_rules[0];
    if (result.status === 'success') {
      console.log('Scoring rule updated successfully!');
    } else {
      console.error(`Error: ${result.message}`);
      process.exit(1);
    }
  }
}

// Delete scoring rule
async function deleteScoringRule(id, args) {
  const { config, token } = await initScript(args);
  
  // Get rule info first
  let ruleName = id;
  try {
    const existing = await apiRequest('GET', `/settings/automation/scoring_rules/${id}`, token, null, { region: config.region });
    if (existing.scoring_rules && existing.scoring_rules[0]) {
      ruleName = existing.scoring_rules[0].name;
    }
  } catch (e) {
    // Proceed with ID
  }
  
  const confirmed = await confirmDestructiveAction(
    `Delete scoring rule: ${ruleName}`,
    [`ID: ${id}`, 'Entity scores will no longer be updated by this rule.'],
    args.force
  );
  
  if (!confirmed) return;
  
  const data = await apiRequest('DELETE', `/settings/automation/scoring_rules/${id}`, token, null, { region: config.region });
  
  if (args.verbose) {
    console.log(JSON.stringify(data, null, 2));
    return;
  }
  
  console.log('Scoring rule deleted successfully.');
}

// Enable scoring rule
async function enableScoringRule(id, args) {
  const { config, token } = await initScript(args);
  
  const body = { scoring_rules: [{ id, active: true }] };
  
  const data = await apiRequest('PUT', `/settings/automation/scoring_rules/${id}/actions/activate`, token, body, { region: config.region });
  
  if (args.verbose) {
    console.log(JSON.stringify(data, null, 2));
    return;
  }
  
  console.log('Scoring rule activated successfully.');
}

// Disable scoring rule
async function disableScoringRule(id, args) {
  const { config, token } = await initScript(args);
  
  const body = { scoring_rules: [{ id, active: false }] };
  
  const data = await apiRequest('PUT', `/settings/automation/scoring_rules/${id}/actions/activate`, token, body, { region: config.region });
  
  if (args.verbose) {
    console.log(JSON.stringify(data, null, 2));
    return;
  }
  
  console.log('Scoring rule deactivated successfully.');
}

// Clone scoring rule
async function cloneScoringRule(id, args) {
  const { config, token } = await initScript(args);
  
  const body = {};
  
  if (args.name) {
    body.name = args.name;
  }
  
  const data = await apiRequest('POST', `/settings/automation/scoring_rules/${id}/actions/clone`, token, body, { region: config.region });
  
  if (args.verbose) {
    console.log(JSON.stringify(data, null, 2));
    return;
  }
  
  if (data.scoring_rules && data.scoring_rules[0]) {
    const result = data.scoring_rules[0];
    if (result.status === 'success') {
      console.log('Scoring rule cloned successfully!\n');
      console.log(`New ID: ${result.details.id}`);
    } else {
      console.error(`Error: ${result.message}`);
      process.exit(1);
    }
  }
}

// Execute scoring rule
async function executeScoringRule(id, args) {
  const { config, token } = await initScript(args);
  
  console.log('Executing scoring rule on existing records...\n');
  
  const data = await apiRequest('POST', `/settings/automation/scoring_rules/${id}/actions/execute`, token, {}, { region: config.region });
  
  if (args.verbose) {
    console.log(JSON.stringify(data, null, 2));
    return;
  }
  
  console.log('Scoring rule execution started.');
  console.log('This may take a while depending on the number of records.');
}

// Get entity score
async function getEntityScore(moduleName, recordId, args) {
  const { config, token } = await initScript(args);
  
  const data = await apiRequest('GET', `/settings/automation/scoring_rules/entity_scores?module=${moduleName}&ids=${recordId}`, token, null, { region: config.region });
  
  if (args.verbose) {
    console.log(JSON.stringify(data, null, 2));
    return;
  }
  
  const scores = data.data || [];
  
  if (scores.length === 0) {
    console.log(`No score found for ${moduleName} record ${recordId}`);
    return;
  }
  
  const score = scores[0];
  
  console.log(`Entity Score for ${moduleName} ${recordId}\n`);
  console.log(`Score: ${score.Score || 0}`);
  console.log(`Positive Score: ${score.Positive_Score || 0}`);
  console.log(`Negative Score: ${score.Negative_Score || 0}`);
  console.log(`Touch Point Score: ${score.Touch_Point_Score || 0}`);
  
  if (score.Scoring_Rule) {
    console.log(`\nScoring Rule: ${score.Scoring_Rule.name}`);
  }
}

// Main
async function main() {
  const args = parseArgs(process.argv.slice(2));
  const command = args._[0];
  
  try {
    switch (command) {
      case 'list':
        await listScoringRules(args);
        break;
      case 'get':
        if (!args._[1]) {
          console.error('Error: Scoring rule ID required');
          process.exit(1);
        }
        await getScoringRule(args._[1], args);
        break;
      case 'create':
        await createScoringRule(args);
        break;
      case 'update':
        if (!args._[1]) {
          console.error('Error: Scoring rule ID required');
          process.exit(1);
        }
        await updateScoringRule(args._[1], args);
        break;
      case 'delete':
        if (!args._[1]) {
          console.error('Error: Scoring rule ID required');
          process.exit(1);
        }
        await deleteScoringRule(args._[1], args);
        break;
      case 'enable':
        if (!args._[1]) {
          console.error('Error: Scoring rule ID required');
          process.exit(1);
        }
        await enableScoringRule(args._[1], args);
        break;
      case 'disable':
        if (!args._[1]) {
          console.error('Error: Scoring rule ID required');
          process.exit(1);
        }
        await disableScoringRule(args._[1], args);
        break;
      case 'clone':
        if (!args._[1]) {
          console.error('Error: Scoring rule ID required');
          process.exit(1);
        }
        await cloneScoringRule(args._[1], args);
        break;
      case 'execute':
        if (!args._[1]) {
          console.error('Error: Scoring rule ID required');
          process.exit(1);
        }
        await executeScoringRule(args._[1], args);
        break;
      case 'score':
        if (!args._[1] || !args._[2]) {
          console.error('Error: Module and record ID required');
          console.error('Usage: node scoring.js score <module> <record_id>');
          process.exit(1);
        }
        await getEntityScore(args._[1], args._[2], args);
        break;
      case 'help':
      default:
        printHelp();
    }
  } catch (error) {
    handleError(error, args.verbose);
  }
}

main();
