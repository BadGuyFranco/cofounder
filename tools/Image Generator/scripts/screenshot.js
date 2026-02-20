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

async function screenshot(url, outputPath, options) {
  // Validate URL
  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    throw new Error('URL must start with http:// or https://');
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
      throw new Error('Playwright not found. Run: cd "/cofounder/tools/Image Generator" && npm install');
    }
    if (error.message.includes('net::ERR')) {
      throw new Error(`Could not reach URL: ${url}`);
    }
    throw new Error(`Could not screenshot: ${error.message}`);
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

function showHelp() {
  console.log('Usage: node scripts/screenshot.js "https://example.com" output.png [--width 1280] [--full-page]');
}

const { positional, flags } = parseCliArgs(process.argv.slice(2));
if (positional.length < 2 || hasHelpFlag(flags)) {
  showHelp();
  process.exit(hasHelpFlag(flags) ? 0 : 1);
}

const url = positional[0];
const outputPath = positional[1];
const options = {
  width: flags.width ? parseInt(flags.width, 10) : 1280,
  fullPage: Boolean(flags['full-page'])
};

screenshot(url, outputPath, options).catch(outputError);
