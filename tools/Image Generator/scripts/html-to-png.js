#!/usr/bin/env node
/**
 * html-to-png.js - Render HTML file to PNG using Playwright
 * 
 * Usage:
 *   node scripts/html-to-png.js input.html output.png [--width 1200] [--height 630] [--full-page]
 * 
 * Options:
 *   --width N      Viewport width in pixels (default: 1200)
 *   --height N     Viewport height in pixels (default: auto-fit to content)
 *   --full-page    Capture full scrollable page (default: true, captures content height)
 */

// Dependency check (must be first, before any npm imports)
import { ensureDeps } from '../../../system/shared/ensure-deps.js';
ensureDeps(import.meta.url);

// npm packages (dynamic import after dependency check)
const { chromium } = await import('playwright');

// Built-in Node.js modules
import fs from 'fs';
import path from 'path';

function parseArgs(args) {
  const result = { width: 1200, height: null, fullPage: true };
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--width' && args[i + 1]) {
      result.width = parseInt(args[i + 1]);
      i++;
    } else if (args[i] === '--height' && args[i + 1]) {
      result.height = parseInt(args[i + 1]);
      result.fullPage = false; // Explicit height disables auto-fit
      i++;
    } else if (args[i] === '--full-page') {
      result.fullPage = true;
    }
  }
  return result;
}

async function htmlToPng(inputPath, outputPath, options) {
  // Validate input file exists
  if (!fs.existsSync(inputPath)) {
    console.error(`Error: File not found: ${inputPath}`);
    process.exit(1);
  }

  let browser;
  try {
    browser = await chromium.launch();
    const page = await browser.newPage();
    
    // Set initial viewport width (height will be adjusted)
    const initialHeight = options.height || 800;
    await page.setViewportSize({ width: options.width, height: initialHeight });

    // Load the HTML file
    const absolutePath = path.resolve(inputPath);
    await page.goto(`file://${absolutePath}`, { waitUntil: 'networkidle' });
    
    // Wait for fonts and resources to load
    await page.waitForTimeout(500);

    // Ensure output directory exists
    const outputDir = path.dirname(outputPath);
    if (outputDir && !fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    // If explicit height given, use fixed viewport screenshot
    if (options.height) {
      await page.screenshot({
        path: outputPath,
        type: 'png'
      });
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
      
      await body.screenshot({
        path: outputPath,
        type: 'png'
      });
      
      console.log(`Created: ${outputPath} (${Math.ceil(finalBox.width)}x${Math.ceil(finalBox.height)})`);
    }
  } catch (error) {
    if (error.message.includes('Executable doesn\'t exist')) {
      console.error('Playwright not found. Run: cd "/cofounder/tools/Image Generator" && npm install');
      process.exit(1);
    }
    console.error(`Error: Could not render HTML: ${error.message}`);
    process.exit(1);
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

// Main
const args = process.argv.slice(2);
if (args.length < 2) {
  console.log('Usage: node scripts/html-to-png.js input.html output.png [--width 1200] [--height 630]');
  process.exit(1);
}

const inputPath = args[0];
const outputPath = args[1];
const options = parseArgs(args.slice(2));

htmlToPng(inputPath, outputPath, options);
