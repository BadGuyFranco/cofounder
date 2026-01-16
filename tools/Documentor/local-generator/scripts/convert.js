/**
 * Format conversion utilities using pandoc.
 * Converts HTML exports to Markdown, ePub, and other formats.
 * 
 * Requires pandoc to be installed: conda install -y pandoc (requires Miniforge)
 */

import { execSync, spawnSync } from 'child_process';
import { existsSync, unlinkSync } from 'fs';

/**
 * Check if pandoc is installed
 * @returns {boolean}
 */
export function isPandocInstalled() {
  try {
    execSync('pandoc --version', { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

/**
 * Get pandoc version
 * @returns {string|null}
 */
export function getPandocVersion() {
  try {
    const output = execSync('pandoc --version', { encoding: 'utf-8' });
    const match = output.match(/pandoc\s+([\d.]+)/);
    return match ? match[1] : null;
  } catch {
    return null;
  }
}

/**
 * Convert file using pandoc
 * @param {string} inputPath - Source file path
 * @param {string} outputPath - Destination file path
 * @param {object} options - Conversion options
 * @param {string} options.from - Source format (default: auto-detect)
 * @param {string} options.to - Target format (default: auto-detect from extension)
 * @param {string} options.title - Document title (for epub)
 * @param {string} options.author - Document author (for epub)
 * @param {boolean} options.standalone - Generate standalone document
 */
export function convertFile(inputPath, outputPath, options = {}) {
  if (!isPandocInstalled()) {
    throw new Error(
      'pandoc is not installed. Install it with: conda install -y pandoc (requires Miniforge)'
    );
  }
  
  if (!existsSync(inputPath)) {
    throw new Error(`Input file not found: ${inputPath}`);
  }
  
  const args = [inputPath, '-o', outputPath];
  
  // Source format
  if (options.from) {
    args.push('-f', options.from);
  }
  
  // Target format
  if (options.to) {
    args.push('-t', options.to);
  }
  
  // Standalone document (includes headers, etc.)
  if (options.standalone) {
    args.push('-s');
  }
  
  // ePub metadata
  if (options.title) {
    args.push('--metadata', `title=${options.title}`);
  }
  if (options.author) {
    args.push('--metadata', `author=${options.author}`);
  }
  
  // For markdown output, use commonmark or gfm for cleaner output
  if (outputPath.endsWith('.md')) {
    args.push('--wrap=none'); // Don't wrap lines
  }
  
  const result = spawnSync('pandoc', args, { 
    encoding: 'utf-8',
    stdio: ['pipe', 'pipe', 'pipe']
  });
  
  if (result.status !== 0) {
    throw new Error(`pandoc conversion failed: ${result.stderr || result.error?.message}`);
  }
  
  return outputPath;
}

/**
 * Convert HTML string to markdown string (in-memory)
 * @param {string} html - HTML content
 * @returns {string} Markdown content
 */
export function htmlToMarkdown(html) {
  if (!isPandocInstalled()) {
    throw new Error('pandoc is not installed');
  }
  
  const result = spawnSync('pandoc', ['-f', 'html', '-t', 'gfm', '--wrap=none'], {
    input: html,
    encoding: 'utf-8',
    stdio: ['pipe', 'pipe', 'pipe']
  });
  
  if (result.status !== 0) {
    throw new Error(`pandoc conversion failed: ${result.stderr}`);
  }
  
  return result.stdout.trim();
}

/**
 * Supported conversion formats via pandoc
 * Using html-native_divs-native_spans to strip Google's inline styling
 */
export const PANDOC_FORMATS = {
  // From HTML (Google Docs export) - strip native divs/spans to remove inline styles
  md: { from: 'html-native_divs-native_spans', to: 'gfm' },           // GitHub-flavored markdown
  markdown: { from: 'html-native_divs-native_spans', to: 'gfm' },
  epub: { from: 'html', to: 'epub' },  // Keep styles for epub
  latex: { from: 'html-native_divs-native_spans', to: 'latex' },
  rst: { from: 'html-native_divs-native_spans', to: 'rst' },          // reStructuredText
  asciidoc: { from: 'html-native_divs-native_spans', to: 'asciidoc' },
  org: { from: 'html-native_divs-native_spans', to: 'org' },          // Emacs Org mode
  textile: { from: 'html-native_divs-native_spans', to: 'textile' },
  mediawiki: { from: 'html-native_divs-native_spans', to: 'mediawiki' }
};
