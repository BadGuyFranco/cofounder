#!/usr/bin/env node
/**
 * Create Word (.docx) or PDF documents from markdown content.
 * 
 * Usage:
 *   node create.js output.docx --content content.md
 *   node create.js output.pdf --content content.md
 *   node create.js output.docx --text "# Hello World"
 *   node create.js output.pdf --title "My Document" --content content.md
 */

import { ensureDeps } from '../../../../system/shared/ensure-deps.js';
ensureDeps(import.meta.url);

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { dirname, extname } from 'path';

const { marked } = await import('marked');
const puppeteer = (await import('puppeteer')).default;

// html-docx-js is CommonJS, need dynamic import
const htmlDocx = await import('html-docx-js').then(m => m.default || m);

/**
 * Convert markdown to HTML
 */
function markdownToHtml(markdown, title = null) {
  const content = marked.parse(markdown);
  
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  ${title ? `<title>${escapeHtml(title)}</title>` : ''}
  <style>
    body {
      font-family: 'Calibri', 'Arial', sans-serif;
      font-size: 11pt;
      line-height: 1.5;
      max-width: 8.5in;
      margin: 1in auto;
      padding: 0 0.5in;
    }
    h1 { font-size: 24pt; margin-top: 24pt; margin-bottom: 12pt; }
    h2 { font-size: 18pt; margin-top: 18pt; margin-bottom: 9pt; }
    h3 { font-size: 14pt; margin-top: 14pt; margin-bottom: 7pt; }
    p { margin: 0 0 12pt 0; }
    ul, ol { margin: 0 0 12pt 0; padding-left: 24pt; }
    li { margin-bottom: 6pt; }
    code { font-family: 'Consolas', 'Courier New', monospace; background: #f4f4f4; padding: 2px 4px; }
    pre { background: #f4f4f4; padding: 12pt; overflow-x: auto; }
    pre code { background: none; padding: 0; }
    blockquote { border-left: 3pt solid #ccc; margin: 0 0 12pt 0; padding-left: 12pt; color: #666; }
    table { border-collapse: collapse; margin: 12pt 0; }
    th, td { border: 1pt solid #ccc; padding: 6pt 12pt; }
    th { background: #f4f4f4; }
  </style>
</head>
<body>
${content}
</body>
</html>`;
}

/**
 * Escape HTML special characters
 */
function escapeHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * Create Word document from HTML
 */
async function createWord(html, outputPath) {
  const docxBuffer = htmlDocx.asBlob(html);
  const arrayBuffer = await docxBuffer.arrayBuffer();
  writeFileSync(outputPath, Buffer.from(arrayBuffer));
}

/**
 * Create PDF from HTML using Puppeteer
 */
async function createPdf(html, outputPath) {
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();
  
  await page.setContent(html, { waitUntil: 'networkidle0' });
  
  await page.pdf({
    path: outputPath,
    format: 'Letter',
    margin: {
      top: '1in',
      right: '1in',
      bottom: '1in',
      left: '1in'
    },
    printBackground: true
  });
  
  await browser.close();
}

/**
 * Main creation function
 */
async function createDocument(outputPath, options = {}) {
  const { content, text, title } = options;
  
  // Get markdown content
  let markdown;
  if (text) {
    markdown = text;
  } else if (content) {
    if (!existsSync(content)) {
      throw new Error(`Content file not found: ${content}`);
    }
    markdown = readFileSync(content, 'utf-8');
  } else {
    throw new Error('Either --content or --text is required');
  }
  
  // Convert to HTML
  const html = markdownToHtml(markdown, title);
  
  // Ensure output directory exists
  const outputDir = dirname(outputPath);
  if (outputDir && !existsSync(outputDir)) {
    mkdirSync(outputDir, { recursive: true });
  }
  
  // Create document based on extension
  const ext = extname(outputPath).toLowerCase();
  
  if (ext === '.docx') {
    await createWord(html, outputPath);
  } else if (ext === '.pdf') {
    await createPdf(html, outputPath);
  } else {
    throw new Error(`Unsupported output format: ${ext}. Use .docx or .pdf`);
  }
  
  return outputPath;
}

// CLI
function showHelp() {
  console.log(`
Create Word or PDF documents from markdown content.

Usage:
  node create.js <output> [options]

Arguments:
  output              Output file path (.docx or .pdf)

Options:
  --content FILE      Path to markdown file
  --text TEXT         Markdown text directly (alternative to --content)
  --title TITLE       Document title
  --help, -h          Show this help message

Examples:
  node create.js report.docx --content README.md
  node create.js summary.pdf --content notes.md --title "Meeting Notes"
  node create.js quick.docx --text "# Hello\\n\\nThis is a test."
`);
  process.exit(0);
}

// Parse CLI arguments
const args = process.argv.slice(2);

if (args.length === 0 || args.includes('--help') || args.includes('-h')) {
  showHelp();
}

const outputPath = args[0];
let content = null;
let text = null;
let title = null;

for (let i = 1; i < args.length; i++) {
  if (args[i] === '--content' && args[i + 1]) {
    content = args[++i];
  } else if (args[i] === '--text' && args[i + 1]) {
    text = args[++i];
  } else if (args[i] === '--title' && args[i + 1]) {
    title = args[++i];
  }
}

// Validate output extension
const ext = extname(outputPath).toLowerCase();
if (ext !== '.docx' && ext !== '.pdf') {
  console.error('Error: Output file must be .docx or .pdf');
  process.exit(1);
}

try {
  await createDocument(outputPath, { content, text, title });
  console.log(`\nSuccess! Document created: ${outputPath}`);
} catch (e) {
  console.error(`Error: ${e.message}`);
  process.exit(1);
}

