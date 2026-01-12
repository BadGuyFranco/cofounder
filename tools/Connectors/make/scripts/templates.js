#!/usr/bin/env node

/**
 * Make.com Templates Script
 * Manage scenario templates.
 * 
 * Usage:
 *   node templates.js list --team-id <id>
 *   node templates.js public [--search "keyword"]
 *   node templates.js get <template-id>
 *   node templates.js create <scenario-id> --name "Template Name"
 *   node templates.js use <template-id> --team-id <id>
 */

import { get, post, parseArgs, printTable, formatOutput } from './utils.js';

// List team templates
async function listTemplates(teamId, verbose) {
  const response = await get('/templates', { teamId });
  const templates = response.templates || response;
  
  if (verbose) {
    formatOutput(templates, true);
    return;
  }
  
  if (!templates || templates.length === 0) {
    console.log('No templates found.');
    return;
  }
  
  console.log(`Found ${templates.length} template(s):\n`);
  
  printTable(templates, [
    { key: 'id', label: 'ID' },
    { key: 'name', label: 'Name' },
    { key: 'description', label: 'Description', getter: t => (t.description || '').substring(0, 40) }
  ]);
}

// List public templates
async function listPublicTemplates(search, verbose) {
  const params = {};
  if (search) {
    params.search = search;
  }
  
  const response = await get('/templates/public', params);
  const templates = response.templatesPublic || response.templates || response;
  
  if (verbose) {
    formatOutput(templates, true);
    return;
  }
  
  if (!templates || templates.length === 0) {
    console.log('No public templates found.');
    return;
  }
  
  console.log(`Found ${templates.length} public template(s):\n`);
  
  printTable(templates, [
    { key: 'id', label: 'ID' },
    { key: 'name', label: 'Name' },
    { key: 'usage', label: 'Uses' }
  ]);
}

// Get a specific template
async function getTemplate(templateId, verbose) {
  const response = await get(`/templates/${templateId}`);
  const template = response.template || response;
  
  if (verbose) {
    formatOutput(template, true);
    return;
  }
  
  console.log(`Template: ${template.name}`);
  console.log(`ID: ${template.id}`);
  if (template.description) {
    console.log(`Description: ${template.description}`);
  }
  if (template.usageCount !== undefined) {
    console.log(`Usage Count: ${template.usageCount}`);
  }
}

// Create a template from a scenario
async function createTemplate(scenarioId, name, description, verbose) {
  const payload = {
    scenarioId: parseInt(scenarioId),
    name
  };
  if (description) {
    payload.description = description;
  }
  
  const response = await post('/templates', payload);
  
  if (verbose) {
    formatOutput(response, true);
    return;
  }
  
  const template = response.template || response;
  console.log(`Template created: ${template.name}`);
  console.log(`ID: ${template.id}`);
}

// Create scenario from template
async function useTemplate(templateId, teamId, name, verbose) {
  const payload = {
    templateId: parseInt(templateId),
    teamId: parseInt(teamId)
  };
  if (name) {
    payload.name = name;
  }
  
  const response = await post('/scenarios', payload);
  
  if (verbose) {
    formatOutput(response, true);
    return;
  }
  
  const scenario = response.scenario || response;
  console.log(`Scenario created from template.`);
  console.log(`Name: ${scenario.name}`);
  console.log(`ID: ${scenario.id}`);
}

// Show help
function showHelp() {
  console.log('Make.com Templates Script');
  console.log('');
  console.log('Manage scenario templates.');
  console.log('');
  console.log('Commands:');
  console.log('  list --team-id <id>                 List team templates');
  console.log('  public [--search "keyword"]         List public templates');
  console.log('  get <template-id>                   Get template details');
  console.log('  create <scenario-id> --name "Name"  Create template from scenario');
  console.log('  use <template-id> --team-id <id>    Create scenario from template');
  console.log('');
  console.log('Options:');
  console.log('  --team-id <id>        Team ID');
  console.log('  --name <name>         Template or scenario name');
  console.log('  --description <desc>  Template description');
  console.log('  --search <keyword>    Search public templates');
  console.log('  --verbose             Show full API responses');
  console.log('');
  console.log('Examples:');
  console.log('  node templates.js list --team-id 12345');
  console.log('  node templates.js public --search "slack"');
  console.log('  node templates.js create 67890 --name "My Template"');
  console.log('  node templates.js use 11111 --team-id 12345 --name "New Scenario"');
}

// Main
async function main() {
  const args = parseArgs(process.argv.slice(2));
  const command = args._[0];
  const verbose = args.verbose || false;
  
  try {
    switch (command) {
      case 'list': {
        const teamId = args['team-id'];
        if (!teamId) {
          console.error('Error: --team-id is required');
          console.error('Usage: node templates.js list --team-id <id>');
          process.exit(1);
        }
        await listTemplates(teamId, verbose);
        break;
      }
      
      case 'public': {
        await listPublicTemplates(args.search, verbose);
        break;
      }
      
      case 'get': {
        const templateId = args._[1];
        if (!templateId) {
          console.error('Error: Template ID is required');
          console.error('Usage: node templates.js get <template-id>');
          process.exit(1);
        }
        await getTemplate(templateId, verbose);
        break;
      }
      
      case 'create': {
        const scenarioId = args._[1];
        const name = args.name;
        if (!scenarioId || !name) {
          console.error('Error: Scenario ID and --name are required');
          console.error('Usage: node templates.js create <scenario-id> --name "Name"');
          process.exit(1);
        }
        await createTemplate(scenarioId, name, args.description, verbose);
        break;
      }
      
      case 'use': {
        const templateId = args._[1];
        const teamId = args['team-id'];
        if (!templateId || !teamId) {
          console.error('Error: Template ID and --team-id are required');
          console.error('Usage: node templates.js use <template-id> --team-id <id>');
          process.exit(1);
        }
        await useTemplate(templateId, teamId, args.name, verbose);
        break;
      }
      
      case 'help':
      default:
        showHelp();
        process.exit(0);
    }
  } catch (error) {
    console.error('Error:', error.message);
    if (verbose) {
      console.error(error.stack);
    }
    process.exit(1);
  }
}

main();
