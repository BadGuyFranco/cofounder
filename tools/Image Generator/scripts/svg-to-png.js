#!/usr/bin/env node
/**
 * svg-to-png.js - Convert SVG to PNG using Playwright
 * 
 * Usage:
 *   node scripts/svg-to-png.js input.svg output.png [--scale 2] [--width 1000]
 * 
 * Options:
 *   --scale N    Scale factor for output (default: 2 for retina quality)
 *   --width N    Target width in pixels (overrides scale)
 */

// Dependency check (must be first, before any npm imports)
import { ensureDeps } from '../../../connectors/shared/ensure-deps.js';
ensureDeps(import.meta.url);

// npm packages (dynamic import after dependency check)
const { chromium } = await import('playwright');

// Built-in Node.js modules
import fs from 'fs';
import path from 'path';

function parseArgs(args) {
  const result = { scale: 2, width: null };
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--scale' && args[i + 1]) {
      result.scale = parseFloat(args[i + 1]);
      i++;
    } else if (args[i] === '--width' && args[i + 1]) {
      result.width = parseInt(args[i + 1]);
      i++;
    }
  }
  return result;
}

async function svgToPng(inputPath, outputPath, options) {
  // Validate input file exists
  if (!fs.existsSync(inputPath)) {
    console.error(`Error: File not found: ${inputPath}`);
    process.exit(1);
  }

  // Read SVG content
  const svgContent = fs.readFileSync(inputPath, 'utf8');
  
  // Extract dimensions from SVG
  const widthMatch = svgContent.match(/width="(\d+)"/);
  const heightMatch = svgContent.match(/height="(\d+)"/);
  const viewBoxMatch = svgContent.match(/viewBox="[^"]*\s+(\d+)\s+(\d+)"/);
  
  let svgWidth = widthMatch ? parseInt(widthMatch[1]) : (viewBoxMatch ? parseInt(viewBoxMatch[1]) : 800);
  let svgHeight = heightMatch ? parseInt(heightMatch[1]) : (viewBoxMatch ? parseInt(viewBoxMatch[2]) : 600);

  // Calculate output dimensions
  let scale = options.scale;
  if (options.width) {
    scale = options.width / svgWidth;
  }
  
  const outputWidth = Math.round(svgWidth * scale);
  const outputHeight = Math.round(svgHeight * scale);

  let browser;
  try {
    browser = await chromium.launch();
    const page = await browser.newPage();
    
    // Set viewport to match scaled dimensions
    await page.setViewportSize({ width: outputWidth, height: outputHeight });

    // Create HTML that renders the SVG with proper scaling
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          * { margin: 0; padding: 0; }
          body { 
            width: ${outputWidth}px; 
            height: ${outputHeight}px;
            overflow: hidden;
          }
          svg {
            width: ${outputWidth}px;
            height: ${outputHeight}px;
          }
        </style>
      </head>
      <body>${svgContent}</body>
      </html>
    `;

    await page.setContent(html, { waitUntil: 'networkidle' });
    
    // Wait for fonts to load (important for Google Fonts)
    await page.waitForTimeout(500);

    // Ensure output directory exists
    const outputDir = path.dirname(outputPath);
    if (outputDir && !fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    // Screenshot the page
    await page.screenshot({
      path: outputPath,
      type: 'png',
      clip: { x: 0, y: 0, width: outputWidth, height: outputHeight }
    });

    console.log(`Created: ${outputPath} (${outputWidth}x${outputHeight})`);
  } catch (error) {
    if (error.message.includes('Executable doesn\'t exist')) {
      console.error('Playwright not found. Run: cd "/cofounder/tools/Image Generator" && npm install');
      process.exit(1);
    }
    console.error(`Error: Could not render SVG: ${error.message}`);
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
  console.log('Usage: node scripts/svg-to-png.js input.svg output.png [--scale 2] [--width 1000]');
  process.exit(1);
}

const inputPath = args[0];
const outputPath = args[1];
const options = parseArgs(args.slice(2));

svgToPng(inputPath, outputPath, options);
