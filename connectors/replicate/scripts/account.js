#!/usr/bin/env node

/**
 * Replicate Account Script
 * Verify credentials and check account status.
 *
 * Usage:
 *   node account.js verify
 *   node account.js help
 */

import { parseArgs, apiRequest, loadConfig, loadDefaults } from './utils.js';

/**
 * Verify API token is valid
 * @param {boolean} verbose - Show full response
 */
async function verifyAccount(verbose) {
  console.log('Verifying Replicate credentials...\n');

  // Try to get account info by listing predictions
  // (Replicate doesn't have a dedicated /me endpoint)
  const predictions = await apiRequest('/predictions?limit=1');

  console.log('Authentication successful!');
  console.log('');

  // Load config to show what's configured
  const config = loadConfig();

  console.log('Configuration:');
  console.log(`  API Token: ${config.apiToken.slice(0, 8)}...`);

  if (config.defaultImageModel) {
    console.log(`  Default image model: ${config.defaultImageModel}`);
  }
  if (config.defaultVideoModel) {
    console.log(`  Default video model: ${config.defaultVideoModel}`);
  }

  console.log('\nRecent activity:');
  if (predictions.results && predictions.results.length > 0) {
    const recent = predictions.results[0];
    console.log(`  Last prediction: ${recent.id}`);
    console.log(`  Status: ${recent.status}`);
    console.log(`  Created: ${recent.created_at}`);
  } else {
    console.log('  No recent predictions');
  }

  if (verbose) {
    console.log('\nFull response:');
    console.log(JSON.stringify(predictions, null, 2));
  }

  return true;
}

/**
 * Show current configuration
 */
function showConfig() {
  const config = loadConfig();

  console.log('Current configuration:');
  console.log(`  API Token: ${config.apiToken.slice(0, 8)}...`);

  console.log('\nUser overrides (from memory/.env):');
  if (config.userImageModel) {
    console.log(`  Image model: ${config.userImageModel}`);
  }
  if (config.userVideoModel) {
    console.log(`  Video model: ${config.userVideoModel}`);
  }
  if (config.userRembgModel) {
    console.log(`  Background removal: ${config.userRembgModel}`);
  }
  if (!config.userImageModel && !config.userVideoModel && !config.userRembgModel) {
    console.log('  (none - using connector defaults)');
  }

  console.log('\nCredentials file: /memory/connectors/replicate/.env');
}

/**
 * Show default models from defaults.json
 */
function showDefaults() {
  try {
    const defaults = loadDefaults();

    console.log('Curated Default Models\n');
    console.log('These are the current best-in-class models maintained in defaults.json.\n');

    for (const [category, config] of Object.entries(defaults)) {
      if (category === '_metadata') continue;
      
      console.log(`${category}:`);
      console.log(`  Model: ${config.model}`);
      console.log(`  Updated: ${config.updated}`);
      console.log(`  Notes: ${config.notes}`);
      if (config.alternatives && config.alternatives.length > 0) {
        const altList = config.alternatives.map(a => a.model).join(', ');
        console.log(`  Alternatives: ${altList}`);
      }
      console.log('');
    }

    console.log('To override a default, add to /memory/connectors/replicate/.env:');
    console.log('  REPLICATE_IMAGE_MODEL=owner/model-name');
    console.log('  REPLICATE_VIDEO_MODEL=owner/model-name');
  } catch (e) {
    console.error('Error loading defaults:', e.message);
  }
}

// Show help
function showHelp() {
  console.log(`Replicate Account Script

Commands:
  verify              Verify API token is valid
  config              Show current configuration and user overrides
  defaults            Show curated default models
  help                Show this help

Options:
  --verbose           Show full API responses

Examples:
  # Verify credentials
  node account.js verify

  # Show current config
  node account.js config

  # Show default models
  node account.js defaults
`);
}

// Main
async function main() {
  const args = parseArgs(process.argv.slice(2));
  const command = args._[0];
  const verbose = args.verbose || false;

  try {
    switch (command) {
      case 'verify':
        await verifyAccount(verbose);
        break;

      case 'config':
        showConfig();
        break;

      case 'defaults':
        await showDefaults();
        break;

      case 'help':
      default:
        showHelp();
        break;
    }
  } catch (error) {
    console.error('Error:', error.message);
    if (error.status === 401) {
      console.error('\nAuthentication failed. Please check your API token.');
      console.error('Get a new token at: https://replicate.com/account/api-tokens');
    }
    if (verbose && error.details) {
      console.error('Details:', JSON.stringify(error.details, null, 2));
    }
    process.exit(1);
  }
}

main();
