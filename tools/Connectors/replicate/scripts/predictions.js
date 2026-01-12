#!/usr/bin/env node

/**
 * Replicate Predictions Script
 * Create and manage predictions (model runs).
 *
 * Usage:
 *   node predictions.js run <model> --input '{"prompt": "..."}' [--wait] [--download <dir>]
 *   node predictions.js get <prediction-id>
 *   node predictions.js list [--limit N]
 *   node predictions.js cancel <prediction-id>
 *   node predictions.js help
 */

import { parseArgs, apiRequest, pollPrediction, downloadFile, formatDuration, formatBytes, getExtension } from './utils.js';
import path from 'path';
import fs from 'fs';

/**
 * Create and run a prediction
 * @param {string} model - Model identifier (owner/name or owner/name:version)
 * @param {object} input - Input parameters for the model
 * @param {boolean} wait - Whether to wait for completion
 * @param {string} downloadDir - Directory to download outputs (null to skip)
 * @param {boolean} verbose - Show full response
 */
async function runPrediction(model, input, wait, downloadDir, verbose) {
  // Parse model identifier
  let version = null;
  let modelRef = model;

  if (model.includes(':')) {
    [modelRef, version] = model.split(':');
  }

  // If no version provided, get latest
  if (!version) {
    console.log(`Fetching latest version of ${modelRef}...`);
    const modelData = await apiRequest(`/models/${modelRef}`);
    version = modelData.latest_version?.id;

    if (!version) {
      throw new Error(`No versions found for model ${modelRef}`);
    }
    console.log(`Using version: ${version.slice(0, 12)}...`);
  }

  console.log(`Creating prediction for ${modelRef}...`);
  console.log(`Input: ${JSON.stringify(input, null, 2)}`);

  const startTime = Date.now();

  // Create prediction
  const prediction = await apiRequest('/predictions', {
    method: 'POST',
    body: {
      version,
      input
    }
  });

  console.log(`\nPrediction created: ${prediction.id}`);
  console.log(`Status: ${prediction.status}`);

  // If already completed (fast models) or not waiting
  if (prediction.status === 'succeeded') {
    await handleOutput(prediction, downloadDir, verbose);
    return prediction;
  }

  if (!wait) {
    console.log('\nPrediction is processing. Use `get` command to check status:');
    console.log(`  node predictions.js get ${prediction.id}`);
    return prediction;
  }

  // Poll for completion
  console.log('\nWaiting for completion...');

  const completed = await pollPrediction(prediction.id);
  const duration = (Date.now() - startTime) / 1000;

  console.log(`\nCompleted in ${formatDuration(duration)}`);

  await handleOutput(completed, downloadDir, verbose);
  return completed;
}

/**
 * Handle prediction output
 * @param {object} prediction - Completed prediction
 * @param {string} downloadDir - Directory to download outputs
 * @param {boolean} verbose - Show full response
 */
async function handleOutput(prediction, downloadDir, verbose) {
  console.log(`Status: ${prediction.status}`);

  if (prediction.metrics) {
    console.log(`Predict time: ${formatDuration(prediction.metrics.predict_time || 0)}`);
  }

  if (prediction.error) {
    console.log(`Error: ${prediction.error}`);
    return;
  }

  const output = prediction.output;
  if (!output) {
    console.log('No output');
    return;
  }

  // Handle different output types
  if (Array.isArray(output)) {
    console.log(`\nOutput (${output.length} items):`);
    for (let i = 0; i < output.length; i++) {
      const item = output[i];
      if (typeof item === 'string' && item.startsWith('http')) {
        console.log(`  [${i}] ${item}`);
        if (downloadDir) {
          const ext = getExtension(item) || '.bin';
          const filename = `output_${i}${ext}`;
          const outputPath = path.join(downloadDir, filename);
          await downloadFile(item, outputPath);
          console.log(`      Downloaded: ${outputPath}`);
        }
      } else {
        console.log(`  [${i}] ${JSON.stringify(item)}`);
      }
    }
  } else if (typeof output === 'string') {
    if (output.startsWith('http')) {
      console.log(`\nOutput: ${output}`);
      if (downloadDir) {
        const ext = getExtension(output) || '.bin';
        const outputPath = path.join(downloadDir, `output${ext}`);
        await downloadFile(output, outputPath);
        console.log(`Downloaded: ${outputPath}`);
      }
    } else if (output.length > 500) {
      console.log(`\nOutput (${output.length} chars):\n${output.slice(0, 500)}...`);
    } else {
      console.log(`\nOutput: ${output}`);
    }
  } else {
    console.log(`\nOutput: ${JSON.stringify(output, null, 2)}`);
  }

  if (verbose) {
    console.log('\nFull prediction:');
    console.log(JSON.stringify(prediction, null, 2));
  }
}

/**
 * Get prediction by ID
 * @param {string} predictionId - Prediction ID
 * @param {boolean} verbose - Show full response
 */
async function getPrediction(predictionId, verbose) {
  const prediction = await apiRequest(`/predictions/${predictionId}`);

  console.log(`Prediction: ${prediction.id}`);
  console.log(`Model: ${prediction.model || 'N/A'}`);
  console.log(`Status: ${prediction.status}`);
  console.log(`Created: ${prediction.created_at}`);

  if (prediction.started_at) {
    console.log(`Started: ${prediction.started_at}`);
  }
  if (prediction.completed_at) {
    console.log(`Completed: ${prediction.completed_at}`);
  }
  if (prediction.metrics?.predict_time) {
    console.log(`Predict time: ${formatDuration(prediction.metrics.predict_time)}`);
  }

  if (prediction.error) {
    console.log(`Error: ${prediction.error}`);
  }

  if (prediction.output) {
    await handleOutput(prediction, null, verbose);
  }

  return prediction;
}

/**
 * List recent predictions
 * @param {number} limit - Max number to return
 * @param {boolean} verbose - Show full response
 */
async function listPredictions(limit, verbose) {
  let allPredictions = [];
  let nextUrl = '/predictions';

  while (allPredictions.length < limit && nextUrl) {
    const response = await apiRequest(nextUrl);
    allPredictions = allPredictions.concat(response.results || []);
    nextUrl = response.next;
  }

  allPredictions = allPredictions.slice(0, limit);

  console.log(`Found ${allPredictions.length} prediction(s):\n`);

  for (const pred of allPredictions) {
    const status = pred.status.padEnd(10);
    const model = pred.model || 'unknown';
    const created = new Date(pred.created_at).toLocaleString();
    console.log(`${pred.id}  ${status}  ${model}  ${created}`);
  }

  if (verbose) {
    console.log('\nFull response:');
    console.log(JSON.stringify(allPredictions, null, 2));
  }

  return allPredictions;
}

/**
 * Cancel a prediction
 * @param {string} predictionId - Prediction ID
 */
async function cancelPrediction(predictionId) {
  const prediction = await apiRequest(`/predictions/${predictionId}/cancel`, {
    method: 'POST'
  });

  console.log(`Prediction ${predictionId} canceled.`);
  console.log(`Status: ${prediction.status}`);

  return prediction;
}

// Show help
function showHelp() {
  console.log(`Replicate Predictions Script

Commands:
  run <model> --input '{...}'   Run a model with JSON input
  get <prediction-id>           Get prediction status and output
  list                          List recent predictions
  cancel <prediction-id>        Cancel a running prediction
  help                          Show this help

Options:
  --input <json>      Input parameters as JSON string (required for run)
  --wait              Wait for prediction to complete (default: true)
  --no-wait           Don't wait for completion
  --download <dir>    Download output files to directory
  --limit <n>         Max predictions to list (default: 10)
  --verbose           Show full API responses

Model format:
  owner/name          Uses latest version
  owner/name:version  Uses specific version

Examples:
  # Generate an image with FLUX
  node predictions.js run black-forest-labs/flux-1.1-pro \\
    --input '{"prompt": "a futuristic cityscape at sunset", "aspect_ratio": "16:9"}'

  # Run with specific version
  node predictions.js run stability-ai/sdxl:version123abc \\
    --input '{"prompt": "beautiful landscape"}'

  # Generate and download output
  node predictions.js run black-forest-labs/flux-1.1-pro \\
    --input '{"prompt": "mountain lake"}' --download ./images

  # Check prediction status
  node predictions.js get p1a2b3c4d5e6f

  # List recent predictions
  node predictions.js list --limit 20

  # Cancel a running prediction
  node predictions.js cancel p1a2b3c4d5e6f
`);
}

// Main
async function main() {
  const args = parseArgs(process.argv.slice(2));
  const command = args._[0];
  const verbose = args.verbose || false;

  try {
    switch (command) {
      case 'run': {
        const model = args._[1];
        if (!model) {
          console.error('Error: Model is required');
          console.error('Usage: node predictions.js run <model> --input \'{"prompt": "..."}\'');
          process.exit(1);
        }

        if (!args.input) {
          console.error('Error: --input is required');
          console.error('Usage: node predictions.js run <model> --input \'{"prompt": "..."}\'');
          process.exit(1);
        }

        let input;
        try {
          input = JSON.parse(args.input);
        } catch (e) {
          console.error('Error: Invalid JSON in --input');
          console.error(`Received: ${args.input}`);
          process.exit(1);
        }

        const wait = args['no-wait'] ? false : true;
        const downloadDir = args.download || null;

        await runPrediction(model, input, wait, downloadDir, verbose);
        break;
      }

      case 'get': {
        const predictionId = args._[1];
        if (!predictionId) {
          console.error('Error: Prediction ID is required');
          console.error('Usage: node predictions.js get <prediction-id>');
          process.exit(1);
        }
        await getPrediction(predictionId, verbose);
        break;
      }

      case 'list': {
        const limit = parseInt(args.limit) || 10;
        await listPredictions(limit, verbose);
        break;
      }

      case 'cancel': {
        const predictionId = args._[1];
        if (!predictionId) {
          console.error('Error: Prediction ID is required');
          console.error('Usage: node predictions.js cancel <prediction-id>');
          process.exit(1);
        }
        await cancelPrediction(predictionId);
        break;
      }

      case 'help':
      default:
        showHelp();
        break;
    }
  } catch (error) {
    console.error('Error:', error.message);
    if (error.status) {
      console.error('Status:', error.status);
    }
    if (verbose && error.details) {
      console.error('Details:', JSON.stringify(error.details, null, 2));
    }
    process.exit(1);
  }
}

main();
