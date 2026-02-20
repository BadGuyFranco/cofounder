#!/usr/bin/env node
/**
 * Background Removal Tool
 * Thin wrapper around Replicate Connector for background removal
 * 
 * Uses credentials and model from Replicate Connector:
 *   - Credentials: /memory/connectors/replicate/.env
 *   - Default model: /connectors/replicate/defaults.json
 */

// Dependency check (must be first, before any npm imports)
import { ensureDeps } from '../../../system/shared/ensure-deps.js';
ensureDeps(import.meta.url, { layer: 'tools' });

// npm packages (dynamic import after dependency check)
const { config } = await import('dotenv');
const Replicate = (await import('replicate')).default;
const sharp = (await import('sharp')).default;

// Built-in Node.js modules
import { existsSync, readFileSync, writeFileSync, statSync, mkdirSync, renameSync } from 'fs';
import { dirname, basename, extname, resolve, join } from 'path';
import { fileURLToPath } from 'url';
import {
  parseCliArgs,
  hasHelpFlag
} from '../../../system/shared/cli-utils.js';

// Environment setup - use Connector credential location
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Detect paths dynamically from script location
// Script is at: .../GPT/cofounder/tools/Image Generator/scripts/remove-background.js
// Memory is at: .../GPT/memory/connectors/replicate/
// Cofounder connector is at: .../GPT/cofounder/connectors/replicate/
const memoryConnectorPath = resolve(__dirname, '../../../../memory/connectors/replicate/.env');
const connectorEnvPath = resolve(__dirname, '../../../connectors/replicate/.env');
// Fallback: Legacy Image Generator location (for migration)
const legacyEnvPath = resolve(__dirname, '../../../../memory/tools/Image Generator/.env');
const legacyMigratedEnvPath = resolve(__dirname, '../../../../memory/tools/Image Generator/.env.migrated');

function extractEnvVar(content, key) {
  const regex = new RegExp(`^${key}=(.*)$`, 'm');
  const match = content.match(regex);
  return match ? match[1].trim() : null;
}

function ensureReplicateTokenInConnectorEnv(token) {
  const connectorDir = dirname(memoryConnectorPath);
  if (!existsSync(connectorDir)) {
    mkdirSync(connectorDir, { recursive: true });
  }

  let existing = '';
  if (existsSync(memoryConnectorPath)) {
    existing = readFileSync(memoryConnectorPath, 'utf8');
    const currentToken = extractEnvVar(existing, 'REPLICATE_API_TOKEN');
    if (currentToken) {
      return;
    }
  }

  const normalizedExisting = existing && !existing.endsWith('\n') ? `${existing}\n` : existing;
  const updated = `${normalizedExisting}REPLICATE_API_TOKEN=${token}\n`;
  writeFileSync(memoryConnectorPath, updated);
}

function migrateLegacyCredentialsIfNeeded() {
  if (!existsSync(legacyEnvPath)) {
    return;
  }

  const connectorHasToken = existsSync(memoryConnectorPath) &&
    Boolean(extractEnvVar(readFileSync(memoryConnectorPath, 'utf8'), 'REPLICATE_API_TOKEN'));

  if (connectorHasToken) {
    return;
  }

  try {
    const legacyContent = readFileSync(legacyEnvPath, 'utf8');
    const token = extractEnvVar(legacyContent, 'REPLICATE_API_TOKEN');
    if (!token) {
      return;
    }

    ensureReplicateTokenInConnectorEnv(token);
    if (!existsSync(legacyMigratedEnvPath)) {
      renameSync(legacyEnvPath, legacyMigratedEnvPath);
    }
    console.log('Note: Migrated legacy Image Generator credentials to Connector location.');
  } catch (error) {
    console.log(`Note: Legacy credential migration failed: ${error.message}`);
  }
}

migrateLegacyCredentialsIfNeeded();

// Load credentials in order of preference
if (existsSync(memoryConnectorPath)) {
  config({ path: memoryConnectorPath });
} else if (existsSync(connectorEnvPath)) {
  config({ path: connectorEnvPath });
} else if (existsSync(legacyEnvPath)) {
  config({ path: legacyEnvPath });
  console.log('Note: Using legacy credential location. Credentials will be migrated to Connector location.');
} else {
  console.log('Error: Replicate credentials not found.');
  console.log('Please set up the Replicate Connector:');
  console.log('  1. Get API token from https://replicate.com/account/api-tokens');
  console.log('  2. Create /memory/connectors/replicate/.env with:');
  console.log('     REPLICATE_API_TOKEN=r8_xxxxxxxxxx');
  process.exit(1);
}

// Load default model from Connector's defaults.json
const defaultsPath = resolve(__dirname, '../../../connectors/replicate/defaults.json');
let DEFAULT_MODEL = 'cjwbw/rembg:fb8af171cfa1616ddcf1242c093f9c46bcada5ad4cf6f2fbe8b81b330ec5c003';

if (existsSync(defaultsPath)) {
  try {
    const defaults = JSON.parse(readFileSync(defaultsPath, 'utf8'));
    if (defaults.backgroundRemoval?.model) {
      DEFAULT_MODEL = defaults.backgroundRemoval.model;
    }
  } catch (e) {
    console.log(`Warning: Could not read defaults.json: ${e.message}`);
  }
}

// Configuration
const REPLICATE_API_TOKEN = process.env.REPLICATE_API_TOKEN;

/**
 * Remove background from an image using Replicate's rembg model
 * @param {string} inputPath - Path to local input image
 * @param {string} outputPath - Path to save the result (optional)
 * @returns {Promise<string|null>} Path to saved image or null if failed
 */
async function removeBackground(inputPath, outputPath = null) {
  if (!REPLICATE_API_TOKEN) {
    console.log('Error: REPLICATE_API_TOKEN not configured');
    console.log('Set up credentials at /memory/connectors/replicate/.env');
    return null;
  }

  if (!existsSync(inputPath)) {
    console.log(`Error: Input file not found: ${inputPath}`);
    return null;
  }

  try {
    console.log(`Removing background from: ${inputPath}`);
    console.log(`Using model: ${DEFAULT_MODEL.split(':')[0]}`);

    const replicate = new Replicate({ auth: REPLICATE_API_TOKEN });

    // Read the image file and convert to base64 data URI
    const imageBuffer = readFileSync(inputPath);
    const base64 = imageBuffer.toString('base64');
    const mimeType = inputPath.toLowerCase().endsWith('.png') ? 'image/png' : 'image/jpeg';
    const dataUri = `data:${mimeType};base64,${base64}`;

    console.log('Sending image to Replicate API...');

    const output = await replicate.run(DEFAULT_MODEL, {
      input: {
        image: dataUri,
        model: 'u2net_human_seg',
        return_mask: false,
        alpha_matting: true,
        alpha_matting_foreground_threshold: 250,
        alpha_matting_background_threshold: 20,
        alpha_matting_erode_size: 20
      }
    });

    if (!output) {
      console.log('Error: No output from model');
      return null;
    }

    // The output is a URL string
    const imageUrl = output;

    console.log('Downloading result...');
    const response = await fetch(imageUrl);
    if (!response.ok) {
      console.log(`Error downloading result: HTTP ${response.status}`);
      return null;
    }

    const resultBuffer = Buffer.from(await response.arrayBuffer());

    // Generate output path if not provided
    let finalPath = outputPath;
    if (!finalPath) {
      const dir = dirname(inputPath);
      const name = basename(inputPath, extname(inputPath));
      finalPath = join(dir, `${name}_nobg.png`);
    }

    // Save the result
    writeFileSync(finalPath, resultBuffer);

    const fileSize = statSync(finalPath).size / 1024;
    console.log(`Background removed! Saved to: ${finalPath}`);
    console.log(`File size: ${fileSize.toFixed(2)} KB`);

    return finalPath;
  } catch (e) {
    console.log(`Error: ${e.message}`);
    return null;
  }
}

/**
 * Full pipeline: Remove background -> Resize to 1000px wide (maintain aspect)
 * @param {string} inputPath - Path to input image
 * @param {string} outputPath - Path to save result (optional)
 * @returns {Promise<boolean>} Success status
 */
async function processHeadshot(inputPath, outputPath = null) {
  // 1. Remove background
  const tempOutput = await removeBackground(inputPath, outputPath);

  if (!tempOutput) {
    return false;
  }

  // 2. Resize to 1000px wide
  try {
    console.log('Resizing to 1000px width...');

    const image = sharp(tempOutput);
    const metadata = await image.metadata();

    const targetWidth = 1000;
    const aspectRatio = metadata.height / metadata.width;
    const targetHeight = Math.round(targetWidth * aspectRatio);

    await image
      .resize(targetWidth, targetHeight, { fit: 'fill' })
      .png({ compressionLevel: 9 })
      .toFile(tempOutput + '.tmp');

    // Rename temp file to final
    const { renameSync } = await import('fs');
    renameSync(tempOutput + '.tmp', tempOutput);

    console.log(`Resized to ${targetWidth}x${targetHeight}`);
    console.log(`Final processed headshot ready: ${tempOutput}`);
    return true;
  } catch (e) {
    console.log(`Error resizing image: ${e.message}`);
    return false;
  }
}

// CLI
function showHelp() {
  console.log(`
Background Removal Tool (using Replicate Connector)

Usage:
  node remove-background.js input_image.jpg [output_path.png]

Arguments:
  input_image     Path to the input image
  output_path     Path to save the result (optional, defaults to input_nobg.png)

The tool removes the background and resizes to 1000px width (maintaining aspect ratio).
Output is always PNG format to preserve transparency.

Credentials: /memory/connectors/replicate/.env
Default model: ${DEFAULT_MODEL.split(':')[0]}
`);
}

const { positional, flags } = parseCliArgs(process.argv.slice(2));
if (positional.length === 0 || hasHelpFlag(flags)) {
  showHelp();
  process.exit(hasHelpFlag(flags) ? 0 : 1);
}

const inputFile = positional[0];
const outputFile = positional[1] || null;

const success = await processHeadshot(inputFile, outputFile);
process.exit(success ? 0 : 1);
