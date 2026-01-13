/**
 * HuggingFace Connector Utilities
 * Shared functions for API calls, config, and argument parsing.
 */

import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Memory directory for credentials
const memoryEnvPath = path.join(
  process.env.HOME || '',
  'Library/CloudStorage/GoogleDrive-anthony@francoinc.com/Shared drives/GPT/memory/Connectors/huggingface/.env'
);
const localEnvPath = path.join(__dirname, '..', '.env');

// API base URLs
export const HUB_API_URL = 'https://huggingface.co/api';
export const INFERENCE_API_URL = 'https://api-inference.huggingface.co/models';

/**
 * Load configuration from .env file
 * @returns {object} Configuration object
 */
export function loadConfig() {
  if (fs.existsSync(memoryEnvPath)) {
    dotenv.config({ path: memoryEnvPath });
  } else if (fs.existsSync(localEnvPath)) {
    dotenv.config({ path: localEnvPath });
  } else {
    console.error('Error: No .env file found.');
    console.error('Create /memory/Connectors/huggingface/.env with your HUGGINGFACE_API_TOKEN');
    console.error('See SETUP.md for instructions.');
    process.exit(1);
  }

  if (!process.env.HUGGINGFACE_API_TOKEN) {
    console.error('Error: HUGGINGFACE_API_TOKEN not found in environment.');
    console.error('Add HUGGINGFACE_API_TOKEN=hf_xxx to your .env file.');
    process.exit(1);
  }

  return {
    apiToken: process.env.HUGGINGFACE_API_TOKEN
  };
}

/**
 * Parse command line arguments
 * @param {string[]} args - Command line arguments
 * @returns {object} Parsed arguments { _: positional, ...flags }
 */
export function parseArgs(args) {
  const result = { _: [] };
  let i = 0;

  while (i < args.length) {
    const arg = args[i];

    if (arg.startsWith('--')) {
      const key = arg.slice(2);
      const nextArg = args[i + 1];

      if (nextArg && !nextArg.startsWith('--')) {
        result[key] = nextArg;
        i += 2;
      } else {
        result[key] = true;
        i += 1;
      }
    } else {
      result._.push(arg);
      i += 1;
    }
  }

  return result;
}

/**
 * Make API request to HuggingFace Hub API
 * @param {string} endpoint - API endpoint (without base URL)
 * @param {object} options - Fetch options
 * @returns {Promise<object>} Response data
 */
export async function hubApiRequest(endpoint, options = {}) {
  const config = loadConfig();
  const url = endpoint.startsWith('http') ? endpoint : `${HUB_API_URL}${endpoint}`;

  const fetchOptions = {
    method: options.method || 'GET',
    headers: {
      'Authorization': `Bearer ${config.apiToken}`,
      ...options.headers
    }
  };

  if (options.body) {
    fetchOptions.headers['Content-Type'] = 'application/json';
    fetchOptions.body = JSON.stringify(options.body);
  }

  const response = await fetch(url, fetchOptions);
  
  if (!response.ok) {
    const errorText = await response.text();
    let errorMessage;
    try {
      const errorJson = JSON.parse(errorText);
      errorMessage = errorJson.error || errorJson.message || errorText;
    } catch {
      errorMessage = errorText;
    }
    const error = new Error(errorMessage);
    error.status = response.status;
    throw error;
  }

  const text = await response.text();
  return text ? JSON.parse(text) : {};
}

/**
 * Make inference request to HuggingFace Inference API
 * @param {string} model - Model ID (owner/name)
 * @param {object} payload - Request payload
 * @param {object} options - Additional options
 * @returns {Promise<object|Buffer>} Response data
 */
export async function inferenceRequest(model, payload, options = {}) {
  const config = loadConfig();
  const baseUrl = options.endpoint || `${INFERENCE_API_URL}/${model}`;
  
  const fetchOptions = {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${config.apiToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  };

  // Add wait for model option
  if (options.waitForModel) {
    fetchOptions.headers['x-wait-for-model'] = 'true';
  }

  const response = await fetch(baseUrl, fetchOptions);

  // Check for model loading status
  if (response.status === 503) {
    const data = await response.json();
    if (data.error && data.error.includes('loading')) {
      const error = new Error('Model is loading. Retry in 20-60 seconds or use --wait flag.');
      error.status = 503;
      error.estimatedTime = data.estimated_time;
      throw error;
    }
  }

  if (!response.ok) {
    const errorText = await response.text();
    let errorMessage;
    try {
      const errorJson = JSON.parse(errorText);
      errorMessage = errorJson.error || errorJson.message || errorText;
    } catch {
      errorMessage = errorText;
    }
    const error = new Error(errorMessage);
    error.status = response.status;
    throw error;
  }

  // Check content type for binary responses (images, audio)
  const contentType = response.headers.get('content-type');
  if (contentType && (contentType.includes('image') || contentType.includes('audio'))) {
    return {
      type: 'binary',
      contentType,
      buffer: Buffer.from(await response.arrayBuffer())
    };
  }

  const text = await response.text();
  return text ? JSON.parse(text) : {};
}

/**
 * Wait for model to load and retry inference
 * @param {string} model - Model ID
 * @param {object} payload - Request payload
 * @param {object} options - Options
 * @param {number} maxRetries - Max retry attempts
 * @param {number} intervalMs - Retry interval
 * @returns {Promise<object>} Response data
 */
export async function inferenceWithRetry(model, payload, options = {}, maxRetries = 10, intervalMs = 5000) {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await inferenceRequest(model, payload, { ...options, waitForModel: true });
    } catch (error) {
      if (error.status === 503 && attempt < maxRetries - 1) {
        const waitTime = error.estimatedTime ? Math.min(error.estimatedTime * 1000, intervalMs) : intervalMs;
        console.log(`Model loading... Retry ${attempt + 1}/${maxRetries} in ${Math.round(waitTime / 1000)}s`);
        await sleep(waitTime);
        continue;
      }
      throw error;
    }
  }
  throw new Error(`Model failed to load after ${maxRetries} attempts`);
}

/**
 * Download a file from URL
 * @param {string} url - URL to download
 * @param {string} outputPath - Path to save file
 * @param {function} onProgress - Progress callback (bytes, total)
 * @returns {Promise<string>} Path to saved file
 */
export async function downloadFile(url, outputPath, onProgress = null) {
  const config = loadConfig();
  
  const response = await fetch(url, {
    headers: {
      'Authorization': `Bearer ${config.apiToken}`
    }
  });

  if (!response.ok) {
    throw new Error(`Download failed: HTTP ${response.status}`);
  }

  const totalSize = parseInt(response.headers.get('content-length') || '0');
  const dir = path.dirname(outputPath);
  
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  const fileStream = fs.createWriteStream(outputPath);
  const reader = response.body.getReader();
  let downloadedSize = 0;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    
    fileStream.write(Buffer.from(value));
    downloadedSize += value.length;
    
    if (onProgress) {
      onProgress(downloadedSize, totalSize);
    }
  }

  fileStream.close();
  return outputPath;
}

/**
 * Sleep for specified milliseconds
 * @param {number} ms - Milliseconds to sleep
 * @returns {Promise<void>}
 */
export function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Save binary output to file
 * @param {Buffer} buffer - Binary data
 * @param {string} outputPath - Path to save file
 * @returns {string} Path to saved file
 */
export function saveBinaryOutput(buffer, outputPath) {
  const dir = path.dirname(outputPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(outputPath, buffer);
  return outputPath;
}

/**
 * Get file extension from content type
 * @param {string} contentType - MIME type
 * @returns {string} File extension
 */
export function getExtensionFromContentType(contentType) {
  const typeMap = {
    'image/png': '.png',
    'image/jpeg': '.jpg',
    'image/webp': '.webp',
    'image/gif': '.gif',
    'audio/mpeg': '.mp3',
    'audio/wav': '.wav',
    'audio/flac': '.flac'
  };
  return typeMap[contentType] || '.bin';
}

/**
 * Format bytes to human readable
 * @param {number} bytes - Bytes to format
 * @returns {string} Formatted string
 */
export function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

/**
 * Format a progress bar
 * @param {number} current - Current value
 * @param {number} total - Total value
 * @param {number} width - Bar width
 * @returns {string} Progress bar string
 */
export function progressBar(current, total, width = 30) {
  if (total === 0) return '[' + '?'.repeat(width) + ']';
  const percent = Math.min(current / total, 1);
  const filled = Math.round(width * percent);
  const empty = width - filled;
  return '[' + '='.repeat(filled) + ' '.repeat(empty) + '] ' + Math.round(percent * 100) + '%';
}
