/**
 * Replicate Connector Utilities
 * Shared functions for API calls, config, and argument parsing.
 */

// Dependency check (must be first, before any npm imports)
import { ensureDeps } from '../../shared/ensure-deps.js';
ensureDeps(import.meta.url);

// Built-in Node.js modules
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

// npm packages (dynamic import after dependency check)
const dotenv = (await import('dotenv')).default;

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Detect memory directory dynamically from script location
// Script is at: .../GPT/cofounder/connectors/replicate/scripts/utils.js
// Memory is at: .../GPT/memory/connectors/replicate/
const memoryEnvPath = path.join(__dirname, '..', '..', '..', '..', 'memory', 'connectors', 'replicate', '.env');
const localEnvPath = path.join(__dirname, '..', '.env');

/**
 * Load configuration from .env file and defaults
 * Priority: memory .env overrides > connector defaults
 * @returns {object} Configuration object
 */
export function loadConfig() {
  if (fs.existsSync(memoryEnvPath)) {
    dotenv.config({ path: memoryEnvPath });
  } else if (fs.existsSync(localEnvPath)) {
    dotenv.config({ path: localEnvPath });
  } else {
    console.error('Error: No .env file found.');
    console.error('Create /memory/connectors/replicate/.env with your REPLICATE_API_TOKEN');
    console.error('See SETUP.md for instructions.');
    process.exit(1);
  }

  if (!process.env.REPLICATE_API_TOKEN) {
    console.error('Error: REPLICATE_API_TOKEN not found in environment.');
    console.error('Add REPLICATE_API_TOKEN=r8_xxx to your .env file.');
    process.exit(1);
  }

  return {
    apiToken: process.env.REPLICATE_API_TOKEN,
    // User overrides from memory (optional)
    userImageModel: process.env.REPLICATE_IMAGE_MODEL || null,
    userVideoModel: process.env.REPLICATE_VIDEO_MODEL || null,
    userRembgModel: process.env.REPLICATE_REMBG_MODEL || null
  };
}

/**
 * Load defaults from JSON file
 * @returns {object} Defaults object
 */
export function loadDefaults() {
  const defaultsPath = path.join(__dirname, '..', 'defaults.json');
  try {
    const content = fs.readFileSync(defaultsPath, 'utf-8');
    return JSON.parse(content);
  } catch (e) {
    console.error('Warning: Could not load defaults.json');
    return {};
  }
}

/**
 * Get default model for a category
 * @param {string} category - Category name (image, video, backgroundRemoval, etc.)
 * @returns {string|null} Default model or null
 */
export function getDefaultModel(category) {
  const defaults = loadDefaults();
  return defaults[category]?.model || null;
}

/**
 * Get model for a category, respecting user overrides
 * @param {string} category - Category name (image, video, backgroundRemoval, etc.)
 * @param {object} config - Config from loadConfig()
 * @returns {string|null} Model to use
 */
export function getModel(category, config = null) {
  if (!config) {
    config = loadConfig();
  }

  // Check for user override first
  const overrideMap = {
    image: config.userImageModel,
    video: config.userVideoModel,
    backgroundRemoval: config.userRembgModel
  };

  if (overrideMap[category]) {
    return overrideMap[category];
  }

  // Fall back to curated defaults
  return getDefaultModel(category);
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
 * Make API request to Replicate
 * @param {string} endpoint - API endpoint (without base URL)
 * @param {object} options - Fetch options
 * @returns {Promise<object>} Response data
 */
export async function apiRequest(endpoint, options = {}) {
  const config = loadConfig();
  const baseUrl = 'https://api.replicate.com/v1';
  const url = endpoint.startsWith('http') ? endpoint : `${baseUrl}${endpoint}`;

  const fetchOptions = {
    method: options.method || 'GET',
    headers: {
      'Authorization': `Bearer ${config.apiToken}`,
      'Content-Type': 'application/json',
      'Prefer': 'wait', // Wait for prediction to complete (up to 60s)
      ...options.headers
    }
  };

  if (options.body) {
    fetchOptions.body = JSON.stringify(options.body);
  }

  const response = await fetch(url, fetchOptions);
  const data = await response.json();

  if (!response.ok) {
    const error = new Error(data.detail || data.error || 'API request failed');
    error.status = response.status;
    error.details = data;
    throw error;
  }

  return data;
}

/**
 * Poll for prediction completion
 * @param {string} predictionId - Prediction ID to poll
 * @param {number} maxAttempts - Maximum poll attempts
 * @param {number} intervalMs - Interval between polls in ms
 * @returns {Promise<object>} Completed prediction
 */
export async function pollPrediction(predictionId, maxAttempts = 120, intervalMs = 2000) {
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const prediction = await apiRequest(`/predictions/${predictionId}`);

    if (prediction.status === 'succeeded') {
      return prediction;
    }

    if (prediction.status === 'failed' || prediction.status === 'canceled') {
      const error = new Error(`Prediction ${prediction.status}: ${prediction.error || 'Unknown error'}`);
      error.prediction = prediction;
      throw error;
    }

    // Still processing, wait and try again
    await sleep(intervalMs);
  }

  throw new Error(`Prediction timed out after ${maxAttempts * intervalMs / 1000} seconds`);
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
 * Format bytes to human readable
 * @param {number} bytes - Bytes to format
 * @returns {string} Formatted string
 */
export function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * Format duration in seconds to human readable
 * @param {number} seconds - Duration in seconds
 * @returns {string} Formatted string
 */
export function formatDuration(seconds) {
  if (seconds < 60) return `${seconds.toFixed(1)}s`;
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}m ${secs.toFixed(0)}s`;
}

/**
 * Download file from URL
 * @param {string} url - URL to download
 * @param {string} outputPath - Path to save file
 * @returns {Promise<string>} Path to saved file
 */
export async function downloadFile(url, outputPath) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to download: HTTP ${response.status}`);
  }

  const buffer = Buffer.from(await response.arrayBuffer());

  // Ensure directory exists
  const dir = path.dirname(outputPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  fs.writeFileSync(outputPath, buffer);
  return outputPath;
}

/**
 * Get file extension from URL or content type
 * @param {string} url - URL to check
 * @param {string} contentType - Content type header
 * @returns {string} File extension
 */
export function getExtension(url, contentType = null) {
  // Try to get from URL
  const urlPath = new URL(url).pathname;
  const urlExt = path.extname(urlPath);
  if (urlExt) return urlExt;

  // Fall back to content type
  if (contentType) {
    const typeMap = {
      'image/png': '.png',
      'image/jpeg': '.jpg',
      'image/webp': '.webp',
      'video/mp4': '.mp4',
      'audio/mpeg': '.mp3',
      'audio/wav': '.wav'
    };
    return typeMap[contentType] || '';
  }

  return '';
}
