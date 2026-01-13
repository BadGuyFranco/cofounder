#!/usr/bin/env node

/**
 * Make.com Scenario Blueprints Script
 * Export and import scenario definitions as JSON.
 * 
 * Usage:
 *   node blueprints.js export <scenario-id> [--output file.json]
 *   node blueprints.js import --team-id <id> --file blueprint.json [--name "New Name"]
 */

import { get, post, parseArgs, formatOutput } from './utils.js';
import fs from 'fs';

// Export a scenario blueprint
async function exportBlueprint(scenarioId, outputFile, verbose) {
  const response = await get(`/scenarios/${scenarioId}/blueprint`);
  const blueprint = response.response?.blueprint || response.blueprint || response;
  
  if (verbose) {
    formatOutput(response, true);
  }
  
  if (outputFile) {
    fs.writeFileSync(outputFile, JSON.stringify(blueprint, null, 2));
    console.log(`Blueprint exported to: ${outputFile}`);
  } else {
    console.log(JSON.stringify(blueprint, null, 2));
  }
}

// Get scenario blueprint (alias for export without file)
async function getBlueprint(scenarioId, verbose) {
  const response = await get(`/scenarios/${scenarioId}/blueprint`);
  
  if (verbose) {
    formatOutput(response, true);
    return;
  }
  
  const blueprint = response.response?.blueprint || response.blueprint || response;
  console.log(JSON.stringify(blueprint, null, 2));
}

// Import a scenario from blueprint
async function importBlueprint(teamId, filePath, name, verbose) {
  const fileContent = fs.readFileSync(filePath, 'utf8');
  const blueprint = JSON.parse(fileContent);
  
  const payload = {
    teamId: parseInt(teamId),
    blueprint
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
  console.log(`Scenario created from blueprint.`);
  console.log(`Name: ${scenario.name}`);
  console.log(`ID: ${scenario.id}`);
}

// Clone a scenario (export + import in one step)
async function cloneScenario(scenarioId, teamId, name, verbose) {
  // Get the blueprint
  const blueprintResponse = await get(`/scenarios/${scenarioId}/blueprint`);
  const blueprint = blueprintResponse.response?.blueprint || blueprintResponse.blueprint || blueprintResponse;
  
  // Create new scenario from blueprint
  const payload = {
    teamId: parseInt(teamId),
    blueprint
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
  console.log(`Scenario cloned successfully.`);
  console.log(`Name: ${scenario.name}`);
  console.log(`ID: ${scenario.id}`);
}

// Show help
function showHelp() {
  console.log('Make.com Scenario Blueprints Script');
  console.log('');
  console.log('Export and import scenario definitions as JSON.');
  console.log('Useful for backups, version control, and cloning scenarios.');
  console.log('');
  console.log('Commands:');
  console.log('  export <scenario-id> [--output file.json]  Export blueprint to file/stdout');
  console.log('  get <scenario-id>                          Get blueprint JSON');
  console.log('  import --team-id <id> --file bp.json       Create scenario from blueprint');
  console.log('  clone <scenario-id> --team-id <id>         Clone scenario');
  console.log('');
  console.log('Options:');
  console.log('  --output <file>   Output file for export');
  console.log('  --file <file>     Input blueprint file for import');
  console.log('  --team-id <id>    Team ID for import/clone');
  console.log('  --name <name>     Name for imported/cloned scenario');
  console.log('  --verbose         Show full API responses');
  console.log('');
  console.log('Examples:');
  console.log('  node blueprints.js export 12345 --output my-scenario.json');
  console.log('  node blueprints.js import --team-id 67890 --file my-scenario.json');
  console.log('  node blueprints.js clone 12345 --team-id 67890 --name "Copy of Scenario"');
}

// Main
async function main() {
  const args = parseArgs(process.argv.slice(2));
  const command = args._[0];
  const verbose = args.verbose || false;
  
  try {
    switch (command) {
      case 'export': {
        const scenarioId = args._[1];
        if (!scenarioId) {
          console.error('Error: Scenario ID is required');
          console.error('Usage: node blueprints.js export <scenario-id> [--output file.json]');
          process.exit(1);
        }
        await exportBlueprint(scenarioId, args.output, verbose);
        break;
      }
      
      case 'get': {
        const scenarioId = args._[1];
        if (!scenarioId) {
          console.error('Error: Scenario ID is required');
          console.error('Usage: node blueprints.js get <scenario-id>');
          process.exit(1);
        }
        await getBlueprint(scenarioId, verbose);
        break;
      }
      
      case 'import': {
        const teamId = args['team-id'];
        const filePath = args.file;
        if (!teamId || !filePath) {
          console.error('Error: --team-id and --file are required');
          console.error('Usage: node blueprints.js import --team-id <id> --file blueprint.json');
          process.exit(1);
        }
        await importBlueprint(teamId, filePath, args.name, verbose);
        break;
      }
      
      case 'clone': {
        const scenarioId = args._[1];
        const teamId = args['team-id'];
        if (!scenarioId || !teamId) {
          console.error('Error: Scenario ID and --team-id are required');
          console.error('Usage: node blueprints.js clone <scenario-id> --team-id <id> [--name "Name"]');
          process.exit(1);
        }
        await cloneScenario(scenarioId, teamId, args.name, verbose);
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
