#!/usr/bin/env node
/**
 * Apply a transparent overlay image on top of a base image.
 */

// Dependency check (must be first, before any npm imports)
import { ensureDeps } from '../../../system/shared/ensure-deps.js';
ensureDeps(import.meta.url, { layer: 'tools' });

// npm packages (dynamic import after dependency check)
const sharp = (await import('sharp')).default;

// Built-in Node.js modules
import { existsSync, statSync } from 'fs';
import { extname } from 'path';
import {
  parseCliArgs,
  hasHelpFlag,
  outputError
} from '../../../system/shared/cli-utils.js';

/**
 * Apply a transparent overlay on top of a base image
 * @param {string} basePath - Path to the base image
 * @param {string} overlayPath - Path to the transparent overlay image (PNG with alpha)
 * @param {string} outputPath - Path to save the result (optional, defaults to overwrite base)
 */
async function applyOverlay(basePath, overlayPath, outputPath = null) {
  // Load base image metadata
  const baseImage = sharp(basePath);
  const baseMeta = await baseImage.metadata();

  // Load and resize overlay to match base if needed
  let overlayBuffer = await sharp(overlayPath)
    .resize(baseMeta.width, baseMeta.height, { fit: 'fill' })
    .toBuffer();

  const overlayMeta = await sharp(overlayPath).metadata();
  if (baseMeta.width !== overlayMeta.width || baseMeta.height !== overlayMeta.height) {
    console.log(`Warning: Resizing overlay from ${overlayMeta.width}x${overlayMeta.height} to ${baseMeta.width}x${baseMeta.height}`);
  }

  // Determine output format
  const finalPath = outputPath || basePath;
  const ext = extname(finalPath).toLowerCase();
  const isJpeg = ext === '.jpg' || ext === '.jpeg';

  // Composite overlay on top of base
  let result = baseImage.composite([{ input: overlayBuffer, blend: 'over' }]);

  // Convert to appropriate format
  if (isJpeg) {
    result = result.jpeg({ quality: 90 });
  } else {
    result = result.png({ compressionLevel: 9 });
  }

  // Save
  await result.toFile(finalPath);

  const fileSize = statSync(finalPath).size / 1024;
  console.log(`Overlay applied and saved to: ${finalPath}`);
  console.log(`File size: ${fileSize.toFixed(2)} KB`);
}

// CLI
function showHelp() {
  console.log(`
Apply Overlay - Composite a transparent overlay onto a base image

Usage:
  node apply-overlay.js <base_image> <overlay_image> [output_path]

Arguments:
  base_image      Path to the base image
  overlay_image   Path to the transparent overlay image (PNG with alpha)
  output_path     Path to save the result (optional, defaults to overwrite base)

Example:
  node apply-overlay.js image.png overlay.png result.png
`);
}

const { positional, flags } = parseCliArgs(process.argv.slice(2));
if (positional.length < 2 || hasHelpFlag(flags)) {
  showHelp();
  process.exit(hasHelpFlag(flags) ? 0 : 1);
}

const basePath = positional[0];
const overlayPath = positional[1];
const outputPath = positional[2] || null;

// Validate inputs
if (!existsSync(basePath)) {
  outputError(`Base image not found: ${basePath}`);
}

if (!existsSync(overlayPath)) {
  outputError(`Overlay image not found: ${overlayPath}`);
}

try {
  await applyOverlay(basePath, overlayPath, outputPath);
} catch (e) {
  outputError(e);
}

