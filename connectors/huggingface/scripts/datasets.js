#!/usr/bin/env node

/**
 * HuggingFace Datasets Script
 * Browse, search, and download datasets.
 *
 * Usage:
 *   node datasets.js search <query>
 *   node datasets.js get <owner/name>
 *   node datasets.js files <owner/name>
 *   node datasets.js download <owner/name> --output <dir>
 *   node datasets.js download-file <owner/name> <filename>
 *   node datasets.js my-datasets
 *   node datasets.js help
 */

import { parseArgs, hubApiRequest, downloadFile, formatBytes, progressBar } from './utils.js';
import path from 'path';
import fs from 'fs';

/**
 * Get dataset details
 * @param {string} datasetId - Dataset identifier (owner/name or just name)
 * @param {boolean} verbose - Show full response
 */
async function getDataset(datasetId, verbose) {
  const dataset = await hubApiRequest(`/datasets/${datasetId}`);

  console.log(`${dataset.id}`);
  console.log(`  Author: ${dataset.author || 'N/A'}`);
  
  if (dataset.downloads !== undefined) {
    console.log(`  Downloads: ${dataset.downloads.toLocaleString()}`);
  }
  
  if (dataset.likes !== undefined) {
    console.log(`  Likes: ${dataset.likes.toLocaleString()}`);
  }

  if (dataset.gated) {
    console.log(`  Gated: Yes (requires accepting terms)`);
  }

  if (dataset.private) {
    console.log(`  Private: Yes`);
  }

  if (dataset.tags && dataset.tags.length > 0) {
    const tags = dataset.tags.slice(0, 10).join(', ');
    console.log(`  Tags: ${tags}${dataset.tags.length > 10 ? '...' : ''}`);
  }

  console.log(`\nURL: https://huggingface.co/datasets/${dataset.id}`);

  if (dataset.card_data) {
    if (dataset.card_data.license) {
      console.log(`License: ${dataset.card_data.license}`);
    }
    if (dataset.card_data.task_categories) {
      console.log(`Tasks: ${dataset.card_data.task_categories.join(', ')}`);
    }
    if (dataset.card_data.size_categories) {
      console.log(`Size: ${dataset.card_data.size_categories.join(', ')}`);
    }
  }

  if (verbose) {
    console.log('\nFull dataset:');
    console.log(JSON.stringify(dataset, null, 2));
  }

  return dataset;
}

/**
 * List files in a dataset repository
 * @param {string} datasetId - Dataset identifier
 * @param {boolean} verbose - Show full response
 */
async function listFiles(datasetId, verbose) {
  const files = await hubApiRequest(`/datasets/${datasetId}/tree/main`);

  console.log(`Files in ${datasetId}:\n`);

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
 * Download a dataset (all files)
 * @param {string} datasetId - Dataset identifier
 * @param {string} outputDir - Output directory
 * @param {boolean} verbose - Show verbose output
 */
async function downloadDataset(datasetId, outputDir, verbose) {
  console.log(`Downloading dataset: ${datasetId}`);
  console.log(`Output directory: ${outputDir}\n`);

  // Get file list
  const files = await hubApiRequest(`/datasets/${datasetId}/tree/main`);
  const downloadableFiles = files.filter(f => f.type === 'file');

  console.log(`Found ${downloadableFiles.length} files to download\n`);

  const datasetDir = path.join(outputDir, datasetId.replace('/', '--'));
  if (!fs.existsSync(datasetDir)) {
    fs.mkdirSync(datasetDir, { recursive: true });
  }

  let downloaded = 0;
  let failed = 0;

  for (const file of downloadableFiles) {
    const outputPath = path.join(datasetDir, file.path);
    const fileDir = path.dirname(outputPath);
    
    if (!fs.existsSync(fileDir)) {
      fs.mkdirSync(fileDir, { recursive: true });
    }

    // Construct download URL
    let downloadUrl;
    if (file.lfs) {
      downloadUrl = `https://huggingface.co/datasets/${datasetId}/resolve/main/${file.path}`;
    } else {
      downloadUrl = `https://huggingface.co/datasets/${datasetId}/raw/main/${file.path}`;
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
  console.log(`Location: ${datasetDir}`);

  return { downloaded, failed, path: datasetDir };
}

/**
 * Download a specific file from a dataset
 * @param {string} datasetId - Dataset identifier
 * @param {string} filename - File path within repo
 * @param {string} outputPath - Output path (optional)
 */
async function downloadSingleFile(datasetId, filename, outputPath) {
  if (!outputPath) {
    outputPath = path.join(process.cwd(), path.basename(filename));
  }

  const downloadUrl = `https://huggingface.co/datasets/${datasetId}/resolve/main/${filename}`;

  console.log(`Downloading: ${datasetId}/${filename}`);
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
 * Search for datasets
 * @param {string} query - Search query
 * @param {object} filters - Search filters
 * @param {number} limit - Max results
 * @param {boolean} verbose - Show full response
 */
async function searchDatasets(query, filters = {}, limit = 10, verbose = false) {
  const params = new URLSearchParams();
  
  if (query) {
    params.set('search', query);
  }
  if (filters.author) {
    params.set('author', filters.author);
  }
  if (filters.task) {
    params.set('task_categories', filters.task);
  }
  params.set('limit', limit.toString());
  params.set('sort', 'downloads');
  params.set('direction', '-1');

  const datasets = await hubApiRequest(`/datasets?${params.toString()}`);

  if (query) {
    console.log(`Search results for "${query}":\n`);
  } else {
    console.log(`Top ${limit} datasets by downloads:\n`);
  }

  for (const dataset of datasets) {
    const downloads = dataset.downloads ? `${(dataset.downloads / 1000).toFixed(0)}k` : 'N/A';
    const gated = dataset.gated ? ' [GATED]' : '';
    console.log(`${dataset.id}${gated}`);
    console.log(`  Downloads: ${downloads}`);
    console.log('');
  }

  console.log(`Showing ${datasets.length} result(s). Use --limit to see more.`);

  if (verbose) {
    console.log('\nFull response:');
    console.log(JSON.stringify(datasets, null, 2));
  }

  return datasets;
}

/**
 * List user's own datasets
 * @param {boolean} verbose - Show full response
 */
async function listMyDatasets(verbose) {
  const user = await hubApiRequest('/whoami-v2');
  const username = user.name;

  console.log(`Datasets owned by ${username}:\n`);

  const datasets = await hubApiRequest(`/datasets?author=${username}`);

  if (datasets.length === 0) {
    console.log('No datasets found.');
    return datasets;
  }

  for (const dataset of datasets) {
    const visibility = dataset.private ? 'private' : 'public';
    const downloads = dataset.downloads ? dataset.downloads.toLocaleString() : '0';
    console.log(`${dataset.id}`);
    console.log(`  Visibility: ${visibility}  Downloads: ${downloads}`);
    console.log('');
  }

  if (verbose) {
    console.log('\nFull response:');
    console.log(JSON.stringify(datasets, null, 2));
  }

  return datasets;
}

// Show help
function showHelp() {
  console.log(`HuggingFace Datasets Script

Commands:
  get <name>                         Get dataset details
  files <name>                       List files in dataset repo
  download <name>                    Download entire dataset
  download-file <name> <file>        Download specific file
  search <query>                     Search for datasets
  list                               List top datasets
  my-datasets                        List your own datasets
  help                               Show this help

Options:
  --task <task>       Filter by task category
  --limit <n>         Max results (default: 10)
  --output <path>     Output directory/path for downloads
  --verbose           Show full API responses

Examples:
  # Get dataset info
  node datasets.js get squad

  # List files in a dataset
  node datasets.js files imdb

  # Download entire dataset
  node datasets.js download squad --output ./datasets

  # Download specific file
  node datasets.js download-file squad train.json

  # Search for datasets
  node datasets.js search "sentiment analysis"

  # List top datasets
  node datasets.js list --limit 20

  # List your datasets
  node datasets.js my-datasets

Popular datasets:
  - squad (question answering)
  - imdb (sentiment analysis)
  - common_voice (speech recognition)
  - coco (image captioning)
  - wikipedia (text corpus)
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
        const datasetId = args._[1];
        if (!datasetId) {
          console.error('Error: Dataset ID is required');
          console.error('Usage: node datasets.js get <name>');
          process.exit(1);
        }
        await getDataset(datasetId, verbose);
        break;
      }

      case 'files': {
        const datasetId = args._[1];
        if (!datasetId) {
          console.error('Error: Dataset ID is required');
          console.error('Usage: node datasets.js files <name>');
          process.exit(1);
        }
        await listFiles(datasetId, verbose);
        break;
      }

      case 'download': {
        const datasetId = args._[1];
        if (!datasetId) {
          console.error('Error: Dataset ID is required');
          console.error('Usage: node datasets.js download <name> --output <dir>');
          process.exit(1);
        }
        const outputDir = args.output || './datasets';
        await downloadDataset(datasetId, outputDir, verbose);
        break;
      }

      case 'download-file': {
        const datasetId = args._[1];
        const filename = args._[2];
        if (!datasetId || !filename) {
          console.error('Error: Dataset ID and filename are required');
          console.error('Usage: node datasets.js download-file <name> <filename>');
          process.exit(1);
        }
        await downloadSingleFile(datasetId, filename, args.output);
        break;
      }

      case 'search': {
        const query = args._.slice(1).join(' ') || args._[1];
        if (!query) {
          console.error('Error: Search query is required');
          console.error('Usage: node datasets.js search <query>');
          process.exit(1);
        }
        await searchDatasets(query, { task: args.task }, limit, verbose);
        break;
      }

      case 'list': {
        await searchDatasets(null, { task: args.task }, limit, verbose);
        break;
      }

      case 'my-datasets':
        await listMyDatasets(verbose);
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
      console.error('\nAccess denied. This dataset may be gated. Visit the dataset page to accept terms.');
    }
    if (error.status === 404) {
      console.error('\nDataset not found. Check the dataset ID.');
    }
    process.exit(1);
  }
}

main();
