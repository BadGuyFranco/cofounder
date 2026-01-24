#!/usr/bin/env node
/**
 * screenshot.js - Screenshot a webpage using Playwright
 * 
 * Usage:
 *   node scripts/screenshot.js "https://example.com" output.png [--width 1280] [--full-page]
 * 
 * Options:
 *   --width N      Viewport width in pixels (default: 1280)
 *   --full-page    Capture the entire scrollable page
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
  const result = { width: 1280, fullPage: false };
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--width' && args[i + 1]) {
      result.width = parseInt(args[i + 1]);
      i++;
    } else if (args[i] === '--full-page') {
      result.fullPage = true;
    }
  }
  return result;
}

async function screenshot(url, outputPath, options) {
  // Validate URL
  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    console.error('Error: URL must start with http:// or https://');
    process.exit(1);
  }

  let browser;
  try {
    browser = await chromium.launch();
    const page = await browser.newPage();
    
    // Set viewport
    await page.setViewportSize({ width: options.width, height: 720 });

    // Navigate to URL
    await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
    
    // Wait for dynamic content
    await page.waitForTimeout(1000);

    // Ensure output directory exists
    const outputDir = path.dirname(outputPath);
    if (outputDir && !fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    // Screenshot the page
    await page.screenshot({
      path: outputPath,
      type: 'png',
      fullPage: options.fullPage
    });

    console.log(`Created: ${outputPath}`);
  } catch (error) {
    if (error.message.includes('Executable doesn\'t exist')) {
      console.error('Playwright not found. Run: cd "/cofounder/tools/Image Generator" && npm install');
      process.exit(1);
    }
    if (error.message.includes('net::ERR')) {
      console.error(`Error: Could not reach URL: ${url}`);
      process.exit(1);
    }
    console.error(`Error: Could not screenshot: ${error.message}`);
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
  console.log('Usage: node scripts/screenshot.js "https://example.com" output.png [--width 1280] [--full-page]');
  process.exit(1);
}

const url = args[0];
const outputPath = args[1];
const options = parseArgs(args.slice(2));

screenshot(url, outputPath, options);
