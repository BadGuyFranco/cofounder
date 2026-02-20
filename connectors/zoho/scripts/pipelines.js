#!/usr/bin/env node

/**
 * Zoho CRM Pipeline Management
 * Create, read, update, delete deal pipelines and stages.
 */

import { fileURLToPath } from 'url';
import path from 'path';
import {
  initScript, parseArgs, apiRequest, confirmDestructiveAction, handleError, showHelp
} from './utils.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Help documentation
function printHelp() {
  showHelp('Zoho CRM Pipelines', {
    'Commands': [
      'list                        List all pipelines',
      'get <id>                    Get pipeline details',
      'create                      Create a new pipeline',
      'update <id>                 Update a pipeline',
      'delete <id>                 Delete a pipeline (destructive)',
      'stages <pipeline_id>        List stages in a pipeline',
      'help                        Show this help'
    ],
    'Options': [
      '--org <name>                Organization to use',
      '--layout <id>               Layout ID (required for create)',
      '--name <name>               Pipeline name',
      '--stages <json>             JSON array of stage configurations',
      '--verbose                   Show full API response',
      '--force                     Skip confirmation for destructive actions'
    ],
    'Examples': [
      'node pipelines.js list',
      'node pipelines.js get 1234567890',
      'node pipelines.js stages 1234567890',
      'node pipelines.js create --layout 111 --name "Enterprise Sales" --stages \'[{"display_value":"Prospecting","sequence_number":1}]\'',
      'node pipelines.js update 1234567890 --name "Updated Pipeline"',
      'node pipelines.js delete 1234567890'
    ],
    'Stage Configuration': [
      'Stages require: display_value, sequence_number',
      'Optional: forecast_category, probability',
      '',
      'Example stage JSON:',
      '[',
      '  {"display_value": "Qualification", "sequence_number": 1, "probability": 10},',
      '  {"display_value": "Proposal", "sequence_number": 2, "probability": 50},',
      '  {"display_value": "Closed Won", "sequence_number": 3, "probability": 100}',
      ']'
    ]
  });
}

// Get layout ID for Deals module
async function getDealsLayoutId(token, region) {
  const data = await apiRequest('GET', '/settings/layouts?module=Deals', token, null, { region });
  
  if (data.layouts && data.layouts.length > 0) {
    // Return the first (usually default) layout
    return data.layouts[0].id;
  }
  
  return null;
}

// List pipelines
async function listPipelines(args) {
  const { config, token } = await initScript(args);
  
  console.log('Fetching pipelines...\n');
  
  // Get layout ID if not provided
  let layoutId = args.layout;
  if (!layoutId) {
    layoutId = await getDealsLayoutId(token, config.region);
    if (!layoutId) {
      console.error('Error: Could not determine Deals layout ID. Use --layout to specify.');
      process.exit(1);
    }
  }
  
  const endpoint = `/settings/pipeline?layout_id=${layoutId}`;
  const data = await apiRequest('GET', endpoint, token, null, { region: config.region });
  
  if (args.verbose) {
    console.log(JSON.stringify(data, null, 2));
    return;
  }
  
  const pipelines = data.pipeline || data.pipelines || [];
  
  console.log(`Found ${pipelines.length} pipelines:\n`);
  
  for (const pipeline of pipelines) {
    const isDefault = pipeline.default ? ' [DEFAULT]' : '';
    console.log(`- ${pipeline.display_value}${isDefault}`);
    console.log(`  ID: ${pipeline.id}`);
    
    // Show stages
    const stages = pipeline.maps || [];
    if (stages.length > 0) {
      console.log(`  Stages (${stages.length}):`);
      for (const stage of stages.sort((a, b) => a.sequence_number - b.sequence_number)) {
        const prob = stage.probability !== undefined ? ` (${stage.probability}%)` : '';
        console.log(`    ${stage.sequence_number}. ${stage.display_value}${prob}`);
      }
    }
    
    console.log('');
  }
}

// Get pipeline details
async function getPipeline(id, args) {
  const { config, token } = await initScript(args);
  
  // Get layout ID if not provided
  let layoutId = args.layout;
  if (!layoutId) {
    layoutId = await getDealsLayoutId(token, config.region);
  }
  
  const endpoint = `/settings/pipeline/${id}?layout_id=${layoutId}`;
  const data = await apiRequest('GET', endpoint, token, null, { region: config.region });
  
  if (args.verbose) {
    console.log(JSON.stringify(data, null, 2));
    return;
  }
  
  const pipelines = data.pipeline || data.pipelines || [];
  
  if (pipelines.length === 0) {
    console.error(`Error: Pipeline not found: ${id}`);
    process.exit(1);
  }
  
  const pipeline = pipelines[0];
  
  console.log(`Pipeline: ${pipeline.display_value}\n`);
  console.log(`ID: ${pipeline.id}`);
  console.log(`Default: ${pipeline.default ? 'Yes' : 'No'}`);
  
  const stages = pipeline.maps || [];
  
  if (stages.length > 0) {
    console.log(`\nStages (${stages.length}):\n`);
    
    console.log('Seq'.padEnd(5) + 'Name'.padEnd(30) + 'Probability'.padEnd(12) + 'Category');
    console.log('-'.repeat(60));
    
    for (const stage of stages.sort((a, b) => a.sequence_number - b.sequence_number)) {
      console.log(
        String(stage.sequence_number).padEnd(5) +
        (stage.display_value || 'N/A').substring(0, 28).padEnd(30) +
        (stage.probability !== undefined ? `${stage.probability}%` : 'N/A').padEnd(12) +
        (stage.forecast_category || 'N/A')
      );
    }
  }
}

// Create pipeline
async function createPipeline(args) {
  const { config, token } = await initScript(args);
  
  if (!args.name) {
    console.error('Error: --name is required');
    process.exit(1);
  }
  
  // Get layout ID if not provided
  let layoutId = args.layout;
  if (!layoutId) {
    layoutId = await getDealsLayoutId(token, config.region);
    if (!layoutId) {
      console.error('Error: --layout is required');
      process.exit(1);
    }
  }
  
  const pipeline = {
    display_value: args.name
  };
  
  // Parse stages if provided
  if (args.stages) {
    try {
      pipeline.maps = JSON.parse(args.stages);
    } catch (e) {
      console.error('Error: Invalid JSON in --stages');
      process.exit(1);
    }
  }
  
  // Zoho API uses singular "pipeline" key
  const body = { pipeline: [pipeline] };
  
  const endpoint = `/settings/pipeline?layout_id=${layoutId}`;
  const data = await apiRequest('POST', endpoint, token, body, { region: config.region });
  
  if (args.verbose) {
    console.log(JSON.stringify(data, null, 2));
    return;
  }
  
  // Response uses "pipeline" key
  if (data.pipeline && data.pipeline[0]) {
    const result = data.pipeline[0];
    if (result.status === 'success') {
      console.log('Pipeline created successfully!\n');
      console.log(`ID: ${result.details.id}`);
    } else {
      console.error(`Error: ${result.message}`);
      process.exit(1);
    }
  }
}

// Update pipeline
async function updatePipeline(id, args) {
  const { config, token } = await initScript(args);
  
  // Get layout ID if not provided
  let layoutId = args.layout;
  if (!layoutId) {
    layoutId = await getDealsLayoutId(token, config.region);
  }
  
  const pipeline = {};
  
  if (args.name) {
    pipeline.display_value = args.name;
  }
  
  if (args.stages) {
    try {
      pipeline.maps = JSON.parse(args.stages);
    } catch (e) {
      console.error('Error: Invalid JSON in --stages');
      process.exit(1);
    }
  }
  
  if (Object.keys(pipeline).length === 0) {
    console.error('Error: No updates specified. Use --name or --stages.');
    process.exit(1);
  }
  
  const body = { pipelines: [pipeline] };
  
  const endpoint = `/settings/pipeline/${id}?layout_id=${layoutId}`;
  const data = await apiRequest('PUT', endpoint, token, body, { region: config.region });
  
  if (args.verbose) {
    console.log(JSON.stringify(data, null, 2));
    return;
  }
  
  if (data.pipelines && data.pipelines[0]) {
    const result = data.pipelines[0];
    if (result.status === 'success') {
      console.log('Pipeline updated successfully!');
    } else {
      console.error(`Error: ${result.message}`);
      process.exit(1);
    }
  }
}

// Delete pipeline
async function deletePipeline(id, args) {
  const { config, token } = await initScript(args);
  
  // Get layout ID if not provided
  let layoutId = args.layout;
  if (!layoutId) {
    layoutId = await getDealsLayoutId(token, config.region);
  }
  
  // Get pipeline info first
  let pipelineName = id;
  try {
    const existing = await apiRequest('GET', `/settings/pipeline/${id}?layout_id=${layoutId}`, token, null, { region: config.region });
    if (existing.pipelines && existing.pipelines[0]) {
      pipelineName = existing.pipelines[0].display_value;
    }
  } catch (e) {
    // Proceed with ID
  }
  
  const confirmed = await confirmDestructiveAction(
    `Delete pipeline: ${pipelineName}`,
    [
      `ID: ${id}`,
      'Deals using this pipeline will need to be reassigned.'
    ],
    args.force
  );
  
  if (!confirmed) return;
  
  // For delete, you typically need to transfer deals to another pipeline
  if (!args['transfer-to']) {
    console.error('Error: --transfer-to <pipeline_id> is required when deleting a pipeline.');
    console.error('Use "pipelines.js list" to see available pipelines.');
    process.exit(1);
  }
  
  const endpoint = `/settings/pipeline/${id}?layout_id=${layoutId}&transfer_pipeline_id=${args['transfer-to']}`;
  const data = await apiRequest('DELETE', endpoint, token, null, { region: config.region });
  
  if (args.verbose) {
    console.log(JSON.stringify(data, null, 2));
    return;
  }
  
  console.log('Pipeline deleted successfully.');
}

// List stages in a pipeline
async function listStages(pipelineId, args) {
  const { config, token } = await initScript(args);
  
  // Get layout ID if not provided
  let layoutId = args.layout;
  if (!layoutId) {
    layoutId = await getDealsLayoutId(token, config.region);
  }
  
  const endpoint = `/settings/pipeline/${pipelineId}?layout_id=${layoutId}`;
  const data = await apiRequest('GET', endpoint, token, null, { region: config.region });
  
  if (args.verbose) {
    console.log(JSON.stringify(data, null, 2));
    return;
  }
  
  const pipelines = data.pipeline || data.pipelines || [];
  
  if (pipelines.length === 0) {
    console.error(`Error: Pipeline not found: ${pipelineId}`);
    process.exit(1);
  }
  
  const pipeline = pipelines[0];
  const stages = pipeline.maps || [];
  
  console.log(`Stages in "${pipeline.display_value}":\n`);
  
  if (stages.length === 0) {
    console.log('No stages configured.');
    return;
  }
  
  console.log('Seq'.padEnd(5) + 'ID'.padEnd(20) + 'Name'.padEnd(25) + 'Probability');
  console.log('-'.repeat(60));
  
  for (const stage of stages.sort((a, b) => a.sequence_number - b.sequence_number)) {
    console.log(
      String(stage.sequence_number).padEnd(5) +
      String(stage.id || 'N/A').padEnd(20) +
      (stage.display_value || 'N/A').substring(0, 23).padEnd(25) +
      (stage.probability !== undefined ? `${stage.probability}%` : 'N/A')
    );
  }
}

// Main
async function main() {
  const args = parseArgs(process.argv.slice(2));
  const command = args._[0];
  
  try {
    switch (command) {
      case 'list':
        await listPipelines(args);
        break;
      case 'get':
        if (!args._[1]) {
          console.error('Error: Pipeline ID required');
          process.exit(1);
        }
        await getPipeline(args._[1], args);
        break;
      case 'create':
        await createPipeline(args);
        break;
      case 'update':
        if (!args._[1]) {
          console.error('Error: Pipeline ID required');
          process.exit(1);
        }
        await updatePipeline(args._[1], args);
        break;
      case 'delete':
        if (!args._[1]) {
          console.error('Error: Pipeline ID required');
          process.exit(1);
        }
        await deletePipeline(args._[1], args);
        break;
      case 'stages':
        if (!args._[1]) {
          console.error('Error: Pipeline ID required');
          process.exit(1);
        }
        await listStages(args._[1], args);
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
