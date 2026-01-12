#!/usr/bin/env node

/**
 * Replicate Models Script
 * Browse and discover available models.
 *
 * Usage:
 *   node models.js get <owner/name>
 *   node models.js versions <owner/name>
 *   node models.js search <query>
 *   node models.js help
 */

import { parseArgs, apiRequest } from './utils.js';

/**
 * Get model details
 * @param {string} modelRef - Model identifier (owner/name)
 * @param {boolean} verbose - Show full response
 */
async function getModel(modelRef, verbose) {
  const model = await apiRequest(`/models/${modelRef}`);

  console.log(`${model.owner}/${model.name}`);
  console.log(`  Description: ${model.description || 'N/A'}`);
  console.log(`  Visibility: ${model.visibility}`);
  console.log(`  URL: ${model.url}`);

  if (model.latest_version) {
    console.log(`\nLatest version:`);
    console.log(`  ID: ${model.latest_version.id}`);
    console.log(`  Created: ${model.latest_version.created_at}`);

    if (model.latest_version.openapi_schema?.components?.schemas?.Input?.properties) {
      const props = model.latest_version.openapi_schema.components.schemas.Input.properties;
      console.log(`\nInput parameters:`);
      for (const [name, schema] of Object.entries(props)) {
        const type = schema.type || schema['x-order'] ? 'any' : 'unknown';
        const desc = schema.description || '';
        const defaultVal = schema.default !== undefined ? ` (default: ${JSON.stringify(schema.default)})` : '';
        console.log(`  - ${name}: ${type}${defaultVal}`);
        if (desc && desc.length < 100) {
          console.log(`      ${desc}`);
        }
      }
    }
  }

  if (model.run_count) {
    console.log(`\nRun count: ${model.run_count.toLocaleString()}`);
  }

  if (verbose) {
    console.log('\nFull model:');
    console.log(JSON.stringify(model, null, 2));
  }

  return model;
}

/**
 * List model versions
 * @param {string} modelRef - Model identifier (owner/name)
 * @param {number} limit - Max versions to show
 * @param {boolean} verbose - Show full response
 */
async function listVersions(modelRef, limit, verbose) {
  const response = await apiRequest(`/models/${modelRef}/versions`);
  const versions = (response.results || []).slice(0, limit);

  console.log(`${modelRef} - ${versions.length} version(s):\n`);

  for (const version of versions) {
    const created = new Date(version.created_at).toLocaleDateString();
    console.log(`${version.id}`);
    console.log(`  Created: ${created}`);

    if (version.openapi_schema?.info?.version) {
      console.log(`  Schema version: ${version.openapi_schema.info.version}`);
    }
    console.log('');
  }

  if (verbose) {
    console.log('\nFull response:');
    console.log(JSON.stringify(versions, null, 2));
  }

  return versions;
}

/**
 * Search for models
 * @param {string} query - Search query
 * @param {number} limit - Max results
 * @param {boolean} verbose - Show full response
 */
async function searchModels(query, limit, verbose) {
  // Replicate's API doesn't have a direct search endpoint,
  // so we use the collections endpoint and filter client-side
  // or just point users to the web search
  
  console.log(`Search for: "${query}"\n`);
  console.log('Replicate does not have a public search API.');
  console.log('Please use the web interface to search:');
  console.log(`  https://replicate.com/explore?query=${encodeURIComponent(query)}`);
  console.log('\nPopular model categories:');
  console.log('  - Image generation: black-forest-labs/flux-1.1-pro');
  console.log('  - Video generation: google-deepmind/veo-2');
  console.log('  - Background removal: cjwbw/rembg');
  console.log('  - Upscaling: nightmareai/real-esrgan');
  console.log('  - Image to text: salesforce/blip');
  console.log('  - Speech to text: openai/whisper');
  
  return null;
}

/**
 * List collections/featured models
 * @param {number} limit - Max to show
 * @param {boolean} verbose - Show full response
 */
async function listCollections(limit, verbose) {
  const response = await apiRequest('/collections');
  const collections = (response.results || []).slice(0, limit);

  console.log(`Featured collections:\n`);

  for (const collection of collections) {
    console.log(`${collection.name}`);
    console.log(`  Slug: ${collection.slug}`);
    console.log(`  Description: ${collection.description || 'N/A'}`);
    console.log('');
  }

  if (verbose) {
    console.log('\nFull response:');
    console.log(JSON.stringify(collections, null, 2));
  }

  return collections;
}

/**
 * Get collection details
 * @param {string} slug - Collection slug
 * @param {boolean} verbose - Show full response
 */
async function getCollection(slug, verbose) {
  const collection = await apiRequest(`/collections/${slug}`);

  console.log(`Collection: ${collection.name}`);
  console.log(`Description: ${collection.description || 'N/A'}`);
  console.log(`\nModels in collection:\n`);

  for (const model of collection.models || []) {
    console.log(`${model.owner}/${model.name}`);
    if (model.description) {
      const desc = model.description.length > 80 
        ? model.description.slice(0, 80) + '...' 
        : model.description;
      console.log(`  ${desc}`);
    }
    console.log('');
  }

  if (verbose) {
    console.log('\nFull collection:');
    console.log(JSON.stringify(collection, null, 2));
  }

  return collection;
}

// Show help
function showHelp() {
  console.log(`Replicate Models Script

Commands:
  get <owner/name>          Get model details and input parameters
  versions <owner/name>     List model versions
  collections               List featured model collections
  collection <slug>         Get models in a collection
  search <query>            Search for models (opens web)
  help                      Show this help

Options:
  --limit <n>       Max items to return (default: 10)
  --verbose         Show full API responses

Examples:
  # Get model info and input parameters
  node models.js get black-forest-labs/flux-1.1-pro

  # List model versions
  node models.js versions stability-ai/sdxl

  # Browse featured collections
  node models.js collections

  # Get models in a collection
  node models.js collection text-to-image

  # Search for models
  node models.js search "video generation"

Popular models:
  - black-forest-labs/flux-1.1-pro (image generation)
  - google-deepmind/veo-2 (video generation)
  - cjwbw/rembg (background removal)
  - nightmareai/real-esrgan (image upscaling)
  - salesforce/blip (image captioning)
  - openai/whisper (speech to text)
`);
}

// Main
async function main() {
  const args = parseArgs(process.argv.slice(2));
  const command = args._[0];
  const verbose = args.verbose || false;
  const limit = parseInt(args.limit) || 10;

  try {
    switch (command) {
      case 'get': {
        const modelRef = args._[1];
        if (!modelRef) {
          console.error('Error: Model reference is required');
          console.error('Usage: node models.js get <owner/name>');
          process.exit(1);
        }
        await getModel(modelRef, verbose);
        break;
      }

      case 'versions': {
        const modelRef = args._[1];
        if (!modelRef) {
          console.error('Error: Model reference is required');
          console.error('Usage: node models.js versions <owner/name>');
          process.exit(1);
        }
        await listVersions(modelRef, limit, verbose);
        break;
      }

      case 'collections':
        await listCollections(limit, verbose);
        break;

      case 'collection': {
        const slug = args._[1];
        if (!slug) {
          console.error('Error: Collection slug is required');
          console.error('Usage: node models.js collection <slug>');
          process.exit(1);
        }
        await getCollection(slug, verbose);
        break;
      }

      case 'search': {
        const query = args._.slice(1).join(' ') || args._[1];
        if (!query) {
          console.error('Error: Search query is required');
          console.error('Usage: node models.js search <query>');
          process.exit(1);
        }
        await searchModels(query, limit, verbose);
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
