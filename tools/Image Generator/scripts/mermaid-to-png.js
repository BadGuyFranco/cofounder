#!/usr/bin/env node
/**
 * mermaid-to-png.js - Render Mermaid diagram to PNG using Playwright
 * 
 * Usage:
 *   node scripts/mermaid-to-png.js input.mmd output.png [options]
 * 
 * Options:
 *   --width N       Max width in pixels (default: 800)
 *   --scale N       Device scale factor for higher resolution (default: 2)
 *   --theme NAME    Mermaid theme: default, neutral, dark, forest (default: neutral)
 *   --background    Background color (default: white)
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

async function mermaidToPng(inputPath, outputPath, options) {
  // Validate input file exists
  if (!fs.existsSync(inputPath)) {
    throw new Error(`File not found: ${inputPath}`);
  }

  // Read Mermaid source
  const mermaidCode = fs.readFileSync(inputPath, 'utf8').trim();
  
  if (!mermaidCode) {
    throw new Error('Mermaid file is empty');
  }

  // Create HTML template with Mermaid
  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <script src="https://cdn.jsdelivr.net/npm/mermaid@10/dist/mermaid.min.js"></script>
  <style>
    body {
      margin: 0;
      padding: 20px;
      background: ${options.background};
      display: flex;
      justify-content: center;
    }
    #container {
      max-width: ${options.width}px;
    }
    .mermaid {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    }
  </style>
</head>
<body>
  <div id="container">
    <pre class="mermaid">
${mermaidCode}
    </pre>
  </div>
  <script>
    mermaid.initialize({ 
      startOnLoad: true,
      theme: '${options.theme}',
      flowchart: {
        useMaxWidth: true,
        htmlLabels: true
      }
    });
  </script>
</body>
</html>`;

  let browser;
  try {
    browser = await chromium.launch();
    const page = await browser.newPage();
    
    // Set viewport with scale for high-res output
    await page.setViewportSize({ 
      width: options.width + 40, // Add padding
      height: 800 
    });

    // Load the HTML content
    await page.setContent(html, { waitUntil: 'networkidle' });
    
    // Wait for Mermaid to render
    await page.waitForSelector('.mermaid svg', { timeout: 10000 });
    
    // Additional wait for fonts and final render
    await page.waitForTimeout(500);

    // Get the rendered diagram element
    const element = await page.$('#container');
    if (!element) {
      throw new Error('Could not find rendered diagram');
    }

    // Ensure output directory exists
    const outputDir = path.dirname(outputPath);
    if (outputDir && !fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    // Screenshot just the diagram element with scale
    await element.screenshot({
      path: outputPath,
      type: 'png',
      scale: 'device',
      omitBackground: options.background === 'transparent'
    });

    // Get dimensions for output message
    const box = await element.boundingBox();
    const actualWidth = Math.round(box.width * options.scale);
    const actualHeight = Math.round(box.height * options.scale);

    console.log(`Created: ${outputPath} (${actualWidth}x${actualHeight}px at ${options.scale}x scale)`);
  } catch (error) {
    if (error.message.includes('Executable doesn\'t exist')) {
      throw new Error('Playwright not installed. Run: cd "/cofounder/tools/Image Generator" && npm install');
    }
    if (error.message.includes('Timeout')) {
      throw new Error('Mermaid failed to render. Check syntax in input file.');
    }
    throw error;
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

function showHelp() {
  console.log(`Usage: node scripts/mermaid-to-png.js input.mmd output.png [options]

Options:
  --width N       Max width in pixels (default: 800)
  --scale N       Device scale factor for higher resolution (default: 2)
  --theme NAME    Mermaid theme: default, neutral, dark, forest (default: neutral)
  --background    Background color, use 'transparent' for none (default: white)

Examples:
  node scripts/mermaid-to-png.js diagram.mmd output.png
  node scripts/mermaid-to-png.js diagram.mmd output.png --width 600 --scale 3
  node scripts/mermaid-to-png.js diagram.mmd output.png --theme dark`);
}

const { positional, flags } = parseCliArgs(process.argv.slice(2));
if (positional.length < 2 || hasHelpFlag(flags)) {
  showHelp();
  process.exit(hasHelpFlag(flags) ? 0 : 1);
}

const inputPath = positional[0];
const outputPath = positional[1];
const options = {
  width: flags.width ? parseInt(flags.width, 10) : 800,
  scale: flags.scale ? parseFloat(flags.scale) : 2,
  theme: flags.theme || 'neutral',
  background: flags.background || 'white'
};

mermaidToPng(inputPath, outputPath, options).catch(outputError);
