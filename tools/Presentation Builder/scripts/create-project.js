#!/usr/bin/env node

/**
 * create-project.js - Create a new reveal.js presentation
 *
 * NEW ARCHITECTURE (v2):
 * Brand templates are complete, working presentations (HTML + Assets folder).
 * This script copies the template and replaces placeholders, preserving the
 * exact structure. What you see in the template is what you get.
 *
 * Output is a self-contained folder: one HTML file + one assets subfolder.
 * Double-click the HTML file to present. No server, no build step, no npm install.
 *
 * Usage:
 *   node scripts/create-project.js --path /path/to/project --title "My Deck"
 *   node scripts/create-project.js --path /path/to/project --template /path/to/brand/Template.html
 *
 * Options:
 *   --path       Project directory (required)
 *   --title      Presentation title (default: derived from path)
 *   --template   Path to a brand template HTML file (complete working presentation)
 *   --theme      reveal.js theme (only used without --template): white, black, etc.
 *   --ratio      Aspect ratio: 16/9, 4/3, 1/1 (default: 16/9)
 *   --dark       Shorthand for --theme black
 *   --transition Slide transition: slide, fade, convex, concave, zoom, none
 *   --help       Show this help
 */

// Dependency check (MUST be first, before any npm imports)
import { ensureDeps } from '../../../system/shared/ensure-deps.js';
ensureDeps(import.meta.url);

import { existsSync, mkdirSync, writeFileSync, readFileSync, copyFileSync, readdirSync, statSync } from 'fs';
import { dirname, join, resolve, basename, extname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const toolDir = join(__dirname, '..');

// ── Argument parsing ──────────────────────────────────────────────

const args = process.argv.slice(2);

if (args.includes('--help') || args.length === 0) {
  console.log(`
Presentation Builder - Create Project
=====================================

Usage:
  node scripts/create-project.js --path /path/to/project [options]

Options:
  --path <dir>         Project directory (required)
  --title <text>       Presentation title (default: derived from path basename)
  --template <file>    Path to brand template HTML file (a complete working presentation)
  --theme <name>       reveal.js theme, only without --template (default: white)
  --ratio <ratio>      Aspect ratio: 16/9, 4/3, 1/1 (default: 16/9)
  --dark               Shorthand for --theme black
  --transition <type>  slide, fade, convex, concave, zoom, none (default: slide)
  --help               Show this help

With --template (recommended):
  Copies an existing brand template presentation (HTML + Assets folder).
  Replaces {{TITLE}} placeholder with your title.
  What you see in the template is exactly what you get.

Without --template:
  Creates a minimal starter presentation using reveal.js defaults.

Output:
  {project}/
    {Title}.html              Double-click to present
    {Title} Assets/           Everything the HTML needs
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

function sanitizeFilename(str) {
  return str.replace(/[<>:"/\\|?*]/g, '').replace(/\s+/g, ' ').trim();
}

function escapeHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function copyDirRecursive(src, dest) {
  if (!existsSync(dest)) {
    mkdirSync(dest, { recursive: true });
  }
  const entries = readdirSync(src);
  for (const entry of entries) {
    const srcPath = join(src, entry);
    const destPath = join(dest, entry);
    const stat = statSync(srcPath);
    if (stat.isDirectory()) {
      copyDirRecursive(srcPath, destPath);
    } else {
      copyFileSync(srcPath, destPath);
    }
  }
}

// ── Resolve options ───────────────────────────────────────────────

const projectPath = resolve(getArg('path', ''));
const title = getArg('title', basename(projectPath) || 'Untitled Presentation');
const safeTitle = sanitizeFilename(title);
const templateFile = getArg('template');
const ratio = getArg('ratio', '16/9');
const transition = getArg('transition', 'slide');

let theme = getArg('theme', 'white');
if (hasFlag('dark') && !getArg('theme')) theme = 'black';

const dimensions = {
  '16/9': { width: 1920, height: 1080 },
  '4/3':  { width: 1024, height: 768 },
  '1/1':  { width: 1024, height: 1024 }
};
const { width, height } = dimensions[ratio] || dimensions['16/9'];

if (!projectPath) {
  console.error('Error: --path is required');
  process.exit(1);
}

// ── Main logic ────────────────────────────────────────────────────

console.log('Presentation Builder - Create Project');
console.log('=====================================');
console.log(`Path:  ${projectPath}`);
console.log(`Title: ${title}`);

if (templateFile) {
  // ════════════════════════════════════════════════════════════════
  // MODE 1: Copy from brand template (complete working presentation)
  // ════════════════════════════════════════════════════════════════
  
  const templatePath = resolve(templateFile);
  
  if (!existsSync(templatePath)) {
    console.error(`Error: Template not found: ${templatePath}`);
    process.exit(1);
  }
  
  // Find the template's assets folder (same directory, matching name pattern)
  const templateDir = dirname(templatePath);
  const templateBasename = basename(templatePath, extname(templatePath));
  const templateAssetsName = `${templateBasename} Assets`;
  const templateAssetsPath = join(templateDir, templateAssetsName);
  
  if (!existsSync(templateAssetsPath)) {
    console.error(`Error: Template assets folder not found: ${templateAssetsPath}`);
    console.error('Brand templates must have an HTML file and matching Assets folder.');
    process.exit(1);
  }
  
  console.log(`Template: ${templatePath}`);
  console.log('');
  
  // Create project directory
  if (!existsSync(projectPath)) {
    mkdirSync(projectPath, { recursive: true });
    console.log('Created project directory');
  }
  
  // Define new names
  const newAssetsName = `${safeTitle} Assets`;
  const newHtmlFilename = `${safeTitle}.html`;
  const newAssetsPath = join(projectPath, newAssetsName);
  
  // Copy assets folder
  copyDirRecursive(templateAssetsPath, newAssetsPath);
  console.log('Copied assets folder');
  
  // Read template HTML, replace placeholders and asset references
  let html = readFileSync(templatePath, 'utf8');
  
  // Replace title placeholder
  html = html.replace(/\{\{TITLE\}\}/g, escapeHtml(title));
  
  // Replace asset folder references (the template uses its own folder name)
  html = html.replace(new RegExp(escapeRegExp(templateAssetsName), 'g'), newAssetsName);
  
  // Update the <title> tag
  html = html.replace(/<title>[^<]*<\/title>/, `<title>${escapeHtml(title)}</title>`);
  
  writeFileSync(join(projectPath, newHtmlFilename), html);
  console.log(`Created ${newHtmlFilename}`);
  
  // Create project AGENTS.md
  const projectAgents = `# ${title}

reveal.js presentation. Open \`${newHtmlFilename}\` in any browser to present.

## Quick Reference

**Present:** Double-click \`${newHtmlFilename}\` (or open in any browser)

**Keyboard:** Arrow keys to navigate, S for speaker notes, F for fullscreen, Esc for overview

**Export PDF:** \`node scripts/build.js --path "${projectPath}" --pdf\`

**Export PNG:** \`node scripts/build.js --path "${projectPath}" --png\`

## Template

Created from: \`${templatePath}\`

To update the template's styling or layouts, edit the template and use it for future presentations.

## Editing

Open \`${newHtmlFilename}\` in a text editor. Slides are \`<section>\` elements between the \`<!-- SLIDES START -->\` and \`<!-- SLIDES END -->\` markers.

The CSS in \`${newAssetsName}/\` defines available layout classes and utilities. The AI reads this CSS to understand what styling options are available when generating new slides.

See \`/cofounder/tools/Presentation Builder/AGENTS.md\` for content methodology and export options.

## Project Files

- \`${newHtmlFilename}\` - The presentation (edit this)
- \`${newAssetsName}/\` - All assets (CSS, JS, images, logos)
- \`AGENTS.md\` - This file
`;

  writeFileSync(join(projectPath, 'AGENTS.md'), projectAgents);
  console.log('Created AGENTS.md');
  
} else {
  // ════════════════════════════════════════════════════════════════
  // MODE 2: Create minimal starter (no brand template)
  // ════════════════════════════════════════════════════════════════
  
  console.log(`Theme: ${theme}`);
  console.log(`Ratio: ${ratio} (${width}x${height})`);
  console.log('');
  
  const revealBase = join(toolDir, 'node_modules', 'reveal.js');
  
  if (!existsSync(join(revealBase, 'dist', 'reveal.js'))) {
    console.error('Error: reveal.js not found in node_modules.');
    console.error('Run: node scripts/check-setup.js --install');
    process.exit(1);
  }
  
  const assetsName = `${safeTitle} Assets`;
  const htmlFilename = `${safeTitle}.html`;
  const assetsPath = join(projectPath, assetsName);
  
  // Create directories
  if (!existsSync(projectPath)) {
    mkdirSync(projectPath, { recursive: true });
    console.log('Created project directory');
  }
  
  if (!existsSync(assetsPath)) {
    mkdirSync(assetsPath, { recursive: true });
    console.log('Created assets directory');
  }
  
  // Copy reveal.js vendor files
  const vendorFiles = [
    { src: 'dist/reveal.js',                dest: 'reveal.js' },
    { src: 'dist/reset.css',                dest: 'reset.css' },
    { src: 'dist/reveal.css',               dest: 'reveal.css' },
    { src: `dist/theme/${theme}.css`,        dest: 'theme.css' },
    { src: 'plugin/highlight/highlight.js',  dest: 'highlight.js' },
    { src: 'plugin/highlight/monokai.css',   dest: 'monokai.css' },
    { src: 'plugin/notes/notes.js',          dest: 'notes.js' }
  ];
  
  for (const { src, dest } of vendorFiles) {
    const srcPath = join(revealBase, src);
    if (existsSync(srcPath)) {
      copyFileSync(srcPath, join(assetsPath, dest));
    } else {
      console.warn(`Warning: ${src} not found in reveal.js distribution`);
    }
  }
  console.log('Copied reveal.js vendor files');
  
  // Generate minimal HTML
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <meta name="presentation-width" content="${width}">
  <meta name="presentation-height" content="${height}">
  <title>${escapeHtml(title)}</title>
  <link rel="stylesheet" href="${assetsName}/reset.css">
  <link rel="stylesheet" href="${assetsName}/reveal.css">
  <link rel="stylesheet" href="${assetsName}/theme.css">
  <link rel="stylesheet" href="${assetsName}/monokai.css">
  <style>
    /* Presentation utilities */
    .reveal section img { border: none; box-shadow: none; }
    .reveal .slide-number { font-size: 12px; }

    /* Section divider text color */
    .section-slide h1, .section-slide h2, .section-slide h3,
    .section-slide p, .section-slide li { color: #fff; }

    /* Two-column layout */
    .columns { display: flex; gap: 2em; text-align: left; width: 100%; }
    .columns .col { flex: 1; }

    /* Metrics display */
    .metrics { display: flex; justify-content: center; gap: 4em; margin-top: 1em; }
    .metric { text-align: center; }
    .metric .number { font-size: 2.5em; font-weight: bold; line-height: 1.2; }
    .metric .label { font-size: 0.5em; opacity: 0.6; margin-top: 0.3em; }

    /* Attribution / footer text */
    .attribution { font-size: 0.45em; opacity: 0.5; margin-top: 2em; }

    /* Code block sizing */
    .reveal pre { width: 100%; font-size: 0.55em; }
    .reveal pre code { max-height: 500px; }

    /* Quote styling */
    .reveal blockquote {
      border-left: 4px solid var(--r-link-color, #42affa);
      padding: 0.5em 1em; font-style: italic;
      width: auto; text-align: left; background: none;
      box-shadow: none;
    }
  </style>
</head>
<body>
  <div class="reveal">
    <div class="slides">
<!-- SLIDES START -->
      <section>
        <h1>${escapeHtml(title)}</h1>
        <p class="attribution">Prepared by [Author] | [Date]</p>
      </section>

      <section>
        <h2>Slide Title</h2>
        <p>Content goes here</p>
      </section>

      <section>
        <h2>Thank You</h2>
      </section>
<!-- SLIDES END -->
    </div>
  </div>
  <script src="${assetsName}/reveal.js"></script>
  <script src="${assetsName}/highlight.js"></script>
  <script src="${assetsName}/notes.js"></script>
  <script>
    Reveal.initialize({
      hash: true,
      slideNumber: true,
      transition: '${transition}',
      width: ${width},
      height: ${height},
      margin: 0.04,
      center: true,
      plugins: [RevealHighlight, RevealNotes]
    });
  </script>
</body>
</html>`;

  writeFileSync(join(projectPath, htmlFilename), html);
  console.log(`Created ${htmlFilename}`);
  
  // Create project AGENTS.md
  const projectAgents = `# ${title}

reveal.js presentation. Open \`${htmlFilename}\` in any browser to present.

## Quick Reference

**Present:** Double-click \`${htmlFilename}\` (or open in any browser)

**Keyboard:** Arrow keys to navigate, S for speaker notes, F for fullscreen, Esc for overview

**Export PDF:** \`node scripts/build.js --path "${projectPath}" --pdf\`

**Export PNG:** \`node scripts/build.js --path "${projectPath}" --png\`

## Editing

Open \`${htmlFilename}\` in a text editor. Slides are \`<section>\` elements between the \`<!-- SLIDES START -->\` and \`<!-- SLIDES END -->\` markers.

See \`/cofounder/tools/Presentation Builder/AGENTS.md\` for:
- Slide patterns and HTML reference
- Content methodology
- Export options

## Project Files

- \`${htmlFilename}\` - The presentation (edit this)
- \`${assetsName}/\` - reveal.js runtime and theme files
- \`AGENTS.md\` - This file
`;

  writeFileSync(join(projectPath, 'AGENTS.md'), projectAgents);
  console.log('Created AGENTS.md');
}

console.log('');
console.log('Project created successfully.');
console.log('');
console.log(`Open in browser: ${join(projectPath, `${safeTitle}.html`)}`);
console.log('Or double-click the HTML file in Finder/Explorer.');

// ── Helper: escape string for use in RegExp ───────────────────────

function escapeRegExp(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
