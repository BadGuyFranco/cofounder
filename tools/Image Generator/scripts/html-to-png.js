#!/usr/bin/env node
/**
 * html-to-png.js - Render HTML file to PNG using Playwright
 * 
 * Usage:
 *   node scripts/html-to-png.js input.html output.png [--width 1200] [--height 630]
 * 
 * Options:
 *   --width N     Viewport width in pixels (default: 1200)
 *   --height N    Viewport height in pixels (default: 630)
 */

import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

function parseArgs(args) {
  const result = { width: 1200, height: 630 };
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--width' && args[i + 1]) {
      result.width = parseInt(args[i + 1]);
      i++;
    } else if (args[i] === '--height' && args[i + 1]) {
      result.height = parseInt(args[i + 1]);
      i++;
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
    
    // Set viewport
    await page.setViewportSize({ width: options.width, height: options.height });

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

    // Screenshot the page
    await page.screenshot({
      path: outputPath,
      type: 'png'
    });

    console.log(`Created: ${outputPath} (${options.width}x${options.height})`);
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
