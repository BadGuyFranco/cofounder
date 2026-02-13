#!/usr/bin/env node

/**
 * build.js - Export a reveal.js presentation to PDF or PNG
 *
 * Uses Playwright to render the presentation and export it.
 * The presentation HTML file is opened from file:// protocol.
 *
 * Usage:
 *   node scripts/build.js --path /path/to/project --pdf
 *   node scripts/build.js --path /path/to/project --png
 *
 * Options:
 *   --path         Project directory containing the HTML presentation (required)
 *   --pdf          Export as PDF (default)
 *   --png          Export as PNG images (one per slide)
 *   --output       Output filename without extension (default: presentation title)
 *   --timeout      Max wait for page load in ms (default: 30000)
 *   --help         Show this help
 */

// Dependency check
import { ensureDeps } from '../../../system/shared/ensure-deps.js';
ensureDeps(import.meta.url);

import { existsSync, mkdirSync, readdirSync, readFileSync } from 'fs';
import { dirname, join, resolve, basename } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Parse arguments
const args = process.argv.slice(2);

if (args.includes('--help') || args.length === 0) {
  console.log(`
Presentation Builder - Export
=============================

Usage:
  node scripts/build.js --path /path/to/project [format] [options]

Formats (pick one):
  --pdf           Export as PDF (default)
  --png           Export as PNG images (one per slide)

Options:
  --path <dir>    Project directory containing the .html file (required)
  --output <name> Output filename without extension
  --timeout <ms>  Page load timeout (default: 30000)
  --help          Show this help
`);
  process.exit(0);
}

function getArg(name, defaultValue = undefined) {
  const idx = args.indexOf(`--${name}`);
  if (idx === -1) return defaultValue;
  if (idx + 1 >= args.length) return defaultValue;
  if (args[idx + 1].startsWith('--')) return defaultValue;
  return args[idx + 1];
}

function hasFlag(name) {
  return args.includes(`--${name}`);
}

const projectPath = resolve(getArg('path', ''));
const timeout = parseInt(getArg('timeout', '30000'), 10);
const format = hasFlag('png') ? 'png' : 'pdf';

if (!projectPath) {
  console.error('Error: --path is required');
  process.exit(1);
}

// Find the HTML file in the project directory
const htmlFiles = readdirSync(projectPath).filter(f => f.endsWith('.html'));
if (htmlFiles.length === 0) {
  console.error(`Error: No .html file found in ${projectPath}`);
  console.error('Run create-project.js first, or verify the path.');
  process.exit(1);
}
const htmlFile = htmlFiles[0];
const htmlPath = join(projectPath, htmlFile);
const presentationTitle = htmlFile.replace('.html', '');
const outputName = getArg('output', presentationTitle);

// Read HTML to extract dimensions
const htmlContent = readFileSync(htmlPath, 'utf8');
const widthMatch = htmlContent.match(/name="presentation-width"\s+content="(\d+)"/);
const heightMatch = htmlContent.match(/name="presentation-height"\s+content="(\d+)"/);
const presWidth = widthMatch ? parseInt(widthMatch[1], 10) : 1920;
const presHeight = heightMatch ? parseInt(heightMatch[1], 10) : 1080;

// Create dist directory
const distPath = join(projectPath, 'dist');
if (!existsSync(distPath)) {
  mkdirSync(distPath, { recursive: true });
}

console.log('Presentation Builder - Export');
console.log('============================');
console.log(`Project:    ${projectPath}`);
console.log(`File:       ${htmlFile}`);
console.log(`Format:     ${format.toUpperCase()}`);
console.log(`Dimensions: ${presWidth}x${presHeight}`);
console.log('');

// Dynamic import of Playwright (only when exporting)
const { chromium } = await import('playwright-chromium');

const browser = await chromium.launch({ headless: true });

try {
  if (format === 'pdf') {
    await exportPdf(browser);
  } else {
    await exportPng(browser);
  }
} finally {
  await browser.close();
}

// ── PDF export ────────────────────────────────────────────────────

async function exportPdf(browser) {
  console.log('Rendering slides for PDF...');

  const context = await browser.newContext({
    viewport: { width: presWidth, height: presHeight }
  });
  const page = await context.newPage();

  // Open with ?print-pdf to trigger reveal.js print layout
  const fileUrl = `file://${htmlPath}?print-pdf`;
  await page.goto(fileUrl, { waitUntil: 'networkidle', timeout });

  // Wait for reveal.js to initialize and settle
  await page.waitForFunction(() => {
    return typeof Reveal !== 'undefined' && Reveal.isReady();
  }, { timeout });

  // Extra wait for fonts and CSS to fully render
  await page.waitForTimeout(2000);

  const outputPath = join(distPath, `${outputName}.pdf`);

  await page.pdf({
    path: outputPath,
    width: `${presWidth}px`,
    height: `${presHeight}px`,
    printBackground: true,
    margin: { top: '0', right: '0', bottom: '0', left: '0' }
  });

  await context.close();

  console.log(`PDF exported: ${outputPath}`);
}

// ── PNG export ────────────────────────────────────────────────────

async function exportPng(browser) {
  console.log('Rendering slides for PNG...');

  const context = await browser.newContext({
    viewport: { width: presWidth, height: presHeight },
    deviceScaleFactor: 2 // Retina quality
  });
  const page = await context.newPage();

  const fileUrl = `file://${htmlPath}`;
  await page.goto(fileUrl, { waitUntil: 'networkidle', timeout });

  // Wait for reveal.js to initialize
  await page.waitForFunction(() => {
    return typeof Reveal !== 'undefined' && Reveal.isReady();
  }, { timeout });

  await page.waitForTimeout(1000);

  // Get total number of horizontal slides
  const totalSlides = await page.evaluate(() => {
    return Reveal.getTotalSlides();
  });

  // Get the list of slide indices (handles vertical slides)
  const slideIndices = await page.evaluate(() => {
    const indices = [];
    const hSlides = document.querySelectorAll('.reveal .slides > section');
    hSlides.forEach((hSlide, h) => {
      const vSlides = hSlide.querySelectorAll('section');
      if (vSlides.length > 0) {
        vSlides.forEach((_, v) => indices.push({ h, v }));
      } else {
        indices.push({ h, v: 0 });
      }
    });
    return indices;
  });

  console.log(`Found ${slideIndices.length} slide(s)`);

  const pngDir = join(distPath, 'png');
  if (!existsSync(pngDir)) {
    mkdirSync(pngDir, { recursive: true });
  }

  for (let i = 0; i < slideIndices.length; i++) {
    const { h, v } = slideIndices[i];
    await page.evaluate(({ h, v }) => Reveal.slide(h, v), { h, v });
    await page.waitForTimeout(500); // Wait for transition

    const slideNum = String(i + 1).padStart(3, '0');
    const pngPath = join(pngDir, `${outputName} - Slide ${slideNum}.png`);
    await page.screenshot({ path: pngPath });
    console.log(`  Slide ${i + 1}/${slideIndices.length}`);
  }

  await context.close();

  console.log(`PNG slides exported to: ${pngDir}/`);
}
