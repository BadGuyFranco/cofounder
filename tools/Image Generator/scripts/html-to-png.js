#!/usr/bin/env node
/**
 * html-to-png.js - Render HTML file to image (PNG or JPG) using Playwright
 * 
 * Usage:
 *   node scripts/html-to-png.js input.html output.png [--width 1200] [--height 630]
 *   node scripts/html-to-png.js input.html output.jpg [--width 1920] [--height 1080] [--quality 90]
 * 
 * Options:
 *   --width N      Viewport width in pixels (default: 1200)
 *   --height N     Viewport height in pixels (default: auto-fit to content)
 *   --quality N    JPEG quality 1-100 (default: 90, only applies to .jpg/.jpeg output)
 * 
 * Output format is determined by the output file extension (.png, .jpg, .jpeg).
 * Local images referenced in the HTML resolve relative to the HTML file's location.
 */

// Dependency check (must be first, before any npm imports)
import { ensureDeps } from '../../../system/shared/ensure-deps.js';
ensureDeps(import.meta.url, { layer: 'tools' });

// npm packages (dynamic import after dependency check)
const { chromium } = await import('playwright');

// Built-in Node.js modules
import fs from 'fs';
import path from 'path';
import {
  parseCliArgs,
  hasHelpFlag,
  outputError
} from '../../../system/shared/cli-utils.js';

/**
 * Determine output format from file extension.
 * @param {string} outputPath 
 * @returns {{ type: 'png' | 'jpeg', quality?: number }}
 */
function getOutputFormat(outputPath, quality) {
  const ext = path.extname(outputPath).toLowerCase();
  if (ext === '.jpg' || ext === '.jpeg') {
    return { type: 'jpeg', quality: quality };
  }
  if (ext === '.png') {
    return { type: 'png' };
  }
  throw new Error(`Unsupported output format: ${ext}. Use .png, .jpg, or .jpeg`);
}

async function htmlToImage(inputPath, outputPath, options) {
  // Validate input file exists
  if (!fs.existsSync(inputPath)) {
    throw new Error(`File not found: ${inputPath}`);
  }

  // Determine output format from extension
  const format = getOutputFormat(outputPath, options.quality);

  let browser;
  try {
    browser = await chromium.launch();
    const page = await browser.newPage();
    
    // Set initial viewport width (height will be adjusted)
    const initialHeight = options.height || 800;
    await page.setViewportSize({ width: options.width, height: initialHeight });

    // Load the HTML file with timeout cap
    // Using file:// protocol ensures relative image paths resolve from HTML file's directory
    const absolutePath = path.resolve(inputPath);
    await page.goto(`file://${absolutePath}`, { 
      waitUntil: 'networkidle',
      timeout: 5000
    });
    
    // Brief pause for fonts to settle
    await page.waitForTimeout(200);

    // Ensure output directory exists
    const outputDir = path.dirname(outputPath);
    if (outputDir && !fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    // Build screenshot options
    const screenshotOptions = {
      path: outputPath,
      type: format.type
    };
    if (format.type === 'jpeg') {
      screenshotOptions.quality = format.quality;
    }

    // If explicit height given, use fixed viewport screenshot
    if (options.height) {
      await page.screenshot(screenshotOptions);
      console.log(`Created: ${outputPath} (${options.width}x${options.height})`);
    } else {
      // Auto-fit: screenshot the body element to get exact content bounds
      const body = await page.$('body');
      const box = await body.boundingBox();
      
      // Expand viewport to ensure full content is visible
      await page.setViewportSize({ 
        width: Math.max(options.width, Math.ceil(box.width)), 
        height: Math.ceil(box.height) + 10 
      });
      
      // Re-get bounding box after resize
      const finalBox = await body.boundingBox();
      
      await body.screenshot(screenshotOptions);
      
      console.log(`Created: ${outputPath} (${Math.ceil(finalBox.width)}x${Math.ceil(finalBox.height)})`);
    }
  } catch (error) {
    if (error.message.includes('Executable doesn\'t exist')) {
      throw new Error('Playwright not found. Run: cd "/cofounder/tools/Image Generator" && npm install');
    }
    if (error.name === 'TimeoutError' || error.message.includes('Timeout')) {
      throw new Error(`Page load timed out after 5 seconds. Check that all referenced images exist.`);
    }
    throw new Error(`Could not render HTML: ${error.message}`);
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

function showHelp() {
  console.log(`Usage: node scripts/html-to-png.js input.html output.[png|jpg] [options]

Options:
  --width N      Viewport width in pixels (default: 1200)
  --height N     Viewport height in pixels (default: auto-fit to content)
  --quality N    JPEG quality 1-100 (default: 90, only for .jpg/.jpeg)

Examples:
  node scripts/html-to-png.js template.html output.png --width 1920 --height 1080
  node scripts/html-to-png.js template.html output.jpg --width 1920 --height 1080 --quality 95`);
}

const { positional, flags } = parseCliArgs(process.argv.slice(2));
if (positional.length < 2 || hasHelpFlag(flags)) {
  showHelp();
  process.exit(hasHelpFlag(flags) ? 0 : 1);
}

const inputPath = positional[0];
const outputPath = positional[1];
const options = {
  width: flags.width ? parseInt(flags.width, 10) : 1200,
  height: flags.height ? parseInt(flags.height, 10) : null,
  quality: flags.quality ? parseInt(flags.quality, 10) : 90
};

htmlToImage(inputPath, outputPath, options).catch(outputError);
