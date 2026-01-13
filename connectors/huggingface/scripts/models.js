#!/usr/bin/env node

/**
 * HuggingFace Models Script
 * Browse, search, download, and upload models.
 *
 * Usage:
 *   node models.js search <query>
 *   node models.js get <owner/name>
 *   node models.js files <owner/name>
 *   node models.js download <owner/name> --output <dir>
 *   node models.js download-file <owner/name> <filename> --output <path>
 *   node models.js list --task <task>
 *   node models.js my-models
 *   node models.js help
 */

import { parseArgs, hubApiRequest, downloadFile, formatBytes, progressBar } from './utils.js';
import path from 'path';
import fs from 'fs';

/**
 * Get model details
 * @param {string} modelId - Model identifier (owner/name)
 * @param {boolean} verbose - Show full response
 */
async function getModel(modelId, verbose) {
  const model = await hubApiRequest(`/models/${modelId}`);

  console.log(`${model.modelId || model.id}`);
  console.log(`  Author: ${model.author || 'N/A'}`);
  
  if (model.pipeline_tag) {
    console.log(`  Task: ${model.pipeline_tag}`);
  }
  
  if (model.library_name) {
    console.log(`  Library: ${model.library_name}`);
  }
  
  if (model.downloads !== undefined) {
    console.log(`  Downloads: ${model.downloads.toLocaleString()}`);
  }
  
  if (model.likes !== undefined) {
    console.log(`  Likes: ${model.likes.toLocaleString()}`);
  }

  if (model.gated) {
    console.log(`  Gated: Yes (requires accepting terms)`);
  }

  if (model.private) {
    console.log(`  Private: Yes`);
  }

  if (model.tags && model.tags.length > 0) {
    const tags = model.tags.slice(0, 10).join(', ');
    console.log(`  Tags: ${tags}${model.tags.length > 10 ? '...' : ''}`);
  }

  console.log(`\nURL: https://huggingface.co/${model.modelId || model.id}`);

  if (model.card_data) {
    if (model.card_data.license) {
      console.log(`License: ${model.card_data.license}`);
    }
  }

  if (verbose) {
    console.log('\nFull model:');
    console.log(JSON.stringify(model, null, 2));
  }

  return model;
}

/**
 * List files in a model repository
 * @param {string} modelId - Model identifier
 * @param {boolean} verbose - Show full response
 */
async function listFiles(modelId, verbose) {
  const files = await hubApiRequest(`/models/${modelId}/tree/main`);

  console.log(`Files in ${modelId}:\n`);

  let totalSize = 0;
  for (const file of files) {
    const size = file.size ? formatBytes(file.size) : 'dir';
    const lfs = file.lfs ? ' (LFS)' : '';
    console.log(`  ${file.path.padEnd(50)} ${size}${lfs}`);
    if (file.size) totalSize += file.size;
  }

  console.log(`\nTotal: ${files.length} files, ${formatBytes(totalSize)}`);

  if (verbose) {
    console.log('\nFull response:');
    console.log(JSON.stringify(files, null, 2));
  }

  return files;
}

/**
 * Download a model (all files)
 * @param {string} modelId - Model identifier
 * @param {string} outputDir - Output directory
 * @param {boolean} verbose - Show verbose output
 */
async function downloadModel(modelId, outputDir, verbose) {
  console.log(`Downloading model: ${modelId}`);
  console.log(`Output directory: ${outputDir}\n`);

  // Get file list
  const files = await hubApiRequest(`/models/${modelId}/tree/main`);
  const downloadableFiles = files.filter(f => f.type === 'file');

  console.log(`Found ${downloadableFiles.length} files to download\n`);

  const modelDir = path.join(outputDir, modelId.replace('/', '--'));
  if (!fs.existsSync(modelDir)) {
    fs.mkdirSync(modelDir, { recursive: true });
  }

  let downloaded = 0;
  let failed = 0;

  for (const file of downloadableFiles) {
    const outputPath = path.join(modelDir, file.path);
    const fileDir = path.dirname(outputPath);
    
    if (!fs.existsSync(fileDir)) {
      fs.mkdirSync(fileDir, { recursive: true });
    }

    // Construct download URL
    let downloadUrl;
    if (file.lfs) {
      // LFS files use resolve endpoint
      downloadUrl = `https://huggingface.co/${modelId}/resolve/main/${file.path}`;
    } else {
      // Regular files use raw endpoint
      downloadUrl = `https://huggingface.co/${modelId}/raw/main/${file.path}`;
    }

    try {
      process.stdout.write(`Downloading: ${file.path}... `);
      
      await downloadFile(downloadUrl, outputPath, (current, total) => {
        if (total > 0) {
          process.stdout.write(`\rDownloading: ${file.path} ${progressBar(current, total)} ${formatBytes(current)}/${formatBytes(total)}    `);
        }
      });
      
      console.log(`\rDownloading: ${file.path} - Done (${formatBytes(file.size || 0)})                    `);
      downloaded++;
    } catch (error) {
      console.log(`\rDownloading: ${file.path} - Failed: ${error.message}                    `);
      failed++;
      if (verbose) {
        console.error(`  Error details: ${error.message}`);
      }
    }
  }

  console.log(`\nDownload complete: ${downloaded} succeeded, ${failed} failed`);
  console.log(`Location: ${modelDir}`);

  return { downloaded, failed, path: modelDir };
}

/**
 * Download a specific file from a model
 * @param {string} modelId - Model identifier
 * @param {string} filename - File path within repo
 * @param {string} outputPath - Output path (optional)
 */
async function downloadSingleFile(modelId, filename, outputPath) {
  // Default output path
  if (!outputPath) {
    outputPath = path.join(process.cwd(), path.basename(filename));
  }

  // Determine URL (try resolve first for LFS, fall back to raw)
  const downloadUrl = `https://huggingface.co/${modelId}/resolve/main/${filename}`;

  console.log(`Downloading: ${modelId}/${filename}`);
  console.log(`Saving to: ${outputPath}\n`);

  await downloadFile(downloadUrl, outputPath, (current, total) => {
    if (total > 0) {
      process.stdout.write(`\r${progressBar(current, total)} ${formatBytes(current)}/${formatBytes(total)}    `);
    }
  });

  const stats = fs.statSync(outputPath);
  console.log(`\rDownload complete: ${formatBytes(stats.size)}                    `);
  console.log(`Saved to: ${outputPath}`);

  return outputPath;
}

/**
 * Search for models
 * @param {string} query - Search query
 * @param {object} filters - Search filters
 * @param {number} limit - Max results
 * @param {boolean} verbose - Show full response
 */
async function searchModels(query, filters = {}, limit = 10, verbose = false) {
  const params = new URLSearchParams();
  
  if (query) {
    params.set('search', query);
  }
  if (filters.task) {
    params.set('pipeline_tag', filters.task);
  }
  if (filters.library) {
    params.set('library', filters.library);
  }
  if (filters.author) {
    params.set('author', filters.author);
  }
  params.set('limit', limit.toString());
  params.set('sort', 'downloads');
  params.set('direction', '-1');

  const models = await hubApiRequest(`/models?${params.toString()}`);

  if (query) {
    console.log(`Search results for "${query}":\n`);
  } else if (filters.task) {
    console.log(`Models for task "${filters.task}":\n`);
  } else {
    console.log(`Top ${limit} models by downloads:\n`);
  }

  for (const model of models) {
    const downloads = model.downloads ? `${(model.downloads / 1000).toFixed(0)}k` : 'N/A';
    const task = model.pipeline_tag || 'N/A';
    const gated = model.gated ? ' [GATED]' : '';
    console.log(`${model.modelId || model.id}${gated}`);
    console.log(`  Task: ${task}  Downloads: ${downloads}`);
    console.log('');
  }

  console.log(`Showing ${models.length} result(s). Use --limit to see more.`);

  if (verbose) {
    console.log('\nFull response:');
    console.log(JSON.stringify(models, null, 2));
  }

  return models;
}

/**
 * List user's own models
 * @param {boolean} verbose - Show full response
 */
async function listMyModels(verbose) {
  // First get username
  const user = await hubApiRequest('/whoami-v2');
  const username = user.name;

  console.log(`Models owned by ${username}:\n`);

  const models = await hubApiRequest(`/models?author=${username}`);

  if (models.length === 0) {
    console.log('No models found.');
    return models;
  }

  for (const model of models) {
    const visibility = model.private ? 'private' : 'public';
    const downloads = model.downloads ? model.downloads.toLocaleString() : '0';
    console.log(`${model.modelId || model.id}`);
    console.log(`  Visibility: ${visibility}  Downloads: ${downloads}`);
    console.log('');
  }

  if (verbose) {
    console.log('\nFull response:');
    console.log(JSON.stringify(models, null, 2));
  }

  return models;
}

/**
 * List available tasks
 */
function listTasks() {
  console.log(`Available tasks (pipeline_tag values):

Text:
  text-generation          Generate text from prompts
  text2text-generation     Text to text (translation, summarization)
  text-classification      Classify text (sentiment, topic)
  token-classification     NER, POS tagging
  question-answering       Answer questions from context
  fill-mask                Fill in masked words
  summarization            Summarize long text
  translation              Translate between languages

Image:
  text-to-image            Generate images from text
  image-to-image           Transform images
  image-classification     Classify images
  object-detection         Detect objects in images
  image-segmentation       Segment images

Audio:
  automatic-speech-recognition    Speech to text (Whisper)
  text-to-speech           Generate speech from text
  audio-classification     Classify audio

Multimodal:
  image-to-text            Describe images
  visual-question-answering    Answer questions about images
  document-question-answering  Answer questions from documents

Other:
  feature-extraction       Get embeddings/vectors
  sentence-similarity      Compare sentence similarity
  zero-shot-classification Classify without training

Examples:
  node models.js list --task text-generation
  node models.js list --task text-to-image
  node models.js search whisper --task automatic-speech-recognition
`);
}

// Show help
function showHelp() {
  console.log(`HuggingFace Models Script

Commands:
  get <owner/name>                   Get model details
  files <owner/name>                 List files in model repo
  download <owner/name>              Download entire model
  download-file <owner/name> <file>  Download specific file
  search <query>                     Search for models
  list                               List models (use with --task)
  my-models                          List your own models
  tasks                              List available task types
  help                               Show this help

Options:
  --task <task>       Filter by task (e.g., text-generation, text-to-image)
  --library <lib>     Filter by library (e.g., transformers, diffusers)
  --limit <n>         Max results (default: 10)
  --output <path>     Output directory/path for downloads
  --verbose           Show full API responses

Examples:
  # Get model info
  node models.js get meta-llama/Meta-Llama-3-8B-Instruct

  # List files in a model
  node models.js files black-forest-labs/FLUX.1-dev

  # Download entire model
  node models.js download sentence-transformers/all-MiniLM-L6-v2 --output ./models

  # Download specific file
  node models.js download-file meta-llama/Meta-Llama-3-8B-Instruct config.json

  # Search for models
  node models.js search "code generation"

  # List text generation models
  node models.js list --task text-generation --limit 20

  # List your models
  node models.js my-models

Popular models:
  - meta-llama/Meta-Llama-3-8B-Instruct (text generation)
  - black-forest-labs/FLUX.1-dev (image generation)
  - sentence-transformers/all-MiniLM-L6-v2 (embeddings)
  - openai/whisper-large-v3 (speech to text)
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
        const modelId = args._[1];
        if (!modelId) {
          console.error('Error: Model ID is required');
          console.error('Usage: node models.js get <owner/name>');
          process.exit(1);
        }
        await getModel(modelId, verbose);
        break;
      }

      case 'files': {
        const modelId = args._[1];
        if (!modelId) {
          console.error('Error: Model ID is required');
          console.error('Usage: node models.js files <owner/name>');
          process.exit(1);
        }
        await listFiles(modelId, verbose);
        break;
      }

      case 'download': {
        const modelId = args._[1];
        if (!modelId) {
          console.error('Error: Model ID is required');
          console.error('Usage: node models.js download <owner/name> --output <dir>');
          process.exit(1);
        }
        const outputDir = args.output || './models';
        await downloadModel(modelId, outputDir, verbose);
        break;
      }

      case 'download-file': {
        const modelId = args._[1];
        const filename = args._[2];
        if (!modelId || !filename) {
          console.error('Error: Model ID and filename are required');
          console.error('Usage: node models.js download-file <owner/name> <filename>');
          process.exit(1);
        }
        await downloadSingleFile(modelId, filename, args.output);
        break;
      }

      case 'search': {
        const query = args._.slice(1).join(' ') || args._[1];
        if (!query) {
          console.error('Error: Search query is required');
          console.error('Usage: node models.js search <query>');
          process.exit(1);
        }
        await searchModels(query, { task: args.task, library: args.library }, limit, verbose);
        break;
      }

      case 'list': {
        await searchModels(null, { task: args.task, library: args.library, author: args.author }, limit, verbose);
        break;
      }

      case 'my-models':
        await listMyModels(verbose);
        break;

      case 'tasks':
        listTasks();
        break;

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
    if (error.status === 401) {
      console.error('\nAuthentication failed. Check your API token.');
    }
    if (error.status === 403) {
      console.error('\nAccess denied. This model may be gated. Visit the model page to accept terms.');
    }
    if (error.status === 404) {
      console.error('\nModel not found. Check the model ID format: owner/name');
    }
    process.exit(1);
  }
}

main();
