#!/usr/bin/env node

/**
 * create-brand.js - Scaffold a new brand template directory
 *
 * Creates a brand template with visual identity (colors, fonts, logos)
 * and starter deck templates that Presentation Builder uses when
 * scaffolding new projects with --brand.
 *
 * Usage:
 *   node scripts/create-brand.js --path /path/to/brand --name "Brand Name"
 *   node scripts/create-brand.js --path /path/to/brand --name "Acme" --primary "#e11d48" --dark
 *
 * Options:
 *   --path       Brand directory (required)
 *   --name       Brand name (required)
 *   --tagline    Brand tagline
 *   --primary    Primary color hex (default: #2563eb)
 *   --secondary  Secondary color hex (default: #7c3aed)
 *   --accent     Accent color hex (default: #06b6d4)
 *   --ratio      Default aspect ratio (default: 16/9)
 *   --theme      Default reveal.js theme (default: white)
 *   --dark       Default to dark theme (shorthand for --theme black)
 *   --help       Show this help
 */

// Dependency check (MUST be first, before any npm imports)
import { ensureDeps } from '../../../system/shared/ensure-deps.js';
ensureDeps(import.meta.url);

import { existsSync, mkdirSync, writeFileSync } from 'fs';
import { dirname, join, resolve } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const toolDir = join(__dirname, '..');

// Parse arguments
const args = process.argv.slice(2);

if (args.includes('--help') || args.length === 0) {
  console.log(`
Presentation Builder - Create Brand Template
=============================================

Usage:
  node scripts/create-brand.js --path /path/to/brand --name "Brand Name" [options]

Options:
  --path <dir>        Brand directory (required)
  --name <text>       Brand name (required)
  --tagline <text>    Brand tagline
  --primary <hex>     Primary brand color (default: #2563eb)
  --secondary <hex>   Secondary brand color (default: #7c3aed)
  --accent <hex>      Accent color (default: #06b6d4)
  --ratio <ratio>     Default aspect ratio (default: 16/9)
  --theme <name>      Default reveal.js theme (default: white)
  --dark              Default to dark theme
  --help              Show this help

Creates:
  brand.yaml           Brand configuration
  theme.css            reveal.js CSS theme overrides
  assets/              Logo and image directory
  templates/           Brand-specific starter decks
    general.html       General-purpose starter
    pitch.html         Pitch deck starter
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

const brandPath = resolve(getArg('path', ''));
const brandName = getArg('name', '');
const tagline = getArg('tagline', '');
const primary = getArg('primary', '#2563eb');
const secondary = getArg('secondary', '#7c3aed');
const accent = getArg('accent', '#06b6d4');
const ratio = getArg('ratio', '16/9');
let theme = getArg('theme', 'white');
if (hasFlag('dark') && !getArg('theme')) theme = 'black';
const darkThemes = ['black', 'night', 'moon', 'dracula', 'blood', 'league'];
const isDark = darkThemes.includes(theme);
const colorSchema = isDark ? 'dark' : 'light';

if (!brandPath) {
  console.error('Error: --path is required');
  process.exit(1);
}
if (!brandName) {
  console.error('Error: --name is required');
  process.exit(1);
}

console.log('Presentation Builder - Create Brand Template');
console.log('=============================================');
console.log(`Path:   ${brandPath}`);
console.log(`Name:   ${brandName}`);
console.log(`Theme:  ${theme}`);
console.log(`Colors: ${primary} / ${secondary} / ${accent}`);
console.log('');

// Create directories
const dirs = ['assets', 'templates'];
for (const dir of dirs) {
  const dirPath = join(brandPath, dir);
  if (!existsSync(dirPath)) {
    mkdirSync(dirPath, { recursive: true });
  }
}
console.log('Created directory structure');

// ── brand.yaml ────────────────────────────────────────────────────

const brandYaml = `# ${brandName} Brand Template
# Created by Presentation Builder

name: "${brandName}"
${tagline ? `tagline: "${tagline}"` : '# tagline: ""'}

colors:
  primary: "${primary}"
  secondary: "${secondary}"
  accent: "${accent}"

fonts:
  heading: "Inter"
  body: "Inter"
  mono: "JetBrains Mono"

logo:
  default: "assets/logo.svg"
  white: "assets/logo-white.svg"
  icon: "assets/icon.svg"

defaults:
  theme: "${theme}"
  ratio: "${ratio}"
  transition: "slide"
  colorSchema: "${colorSchema}"

footer:
  enabled: false
  text: "${brandName} | Confidential"
  showLogo: true

cover:
  showLogo: true
  attribution: "${brandName}"

templates:
  general: "templates/general.html"
  pitch: "templates/pitch.html"
`;

writeFileSync(join(brandPath, 'brand.yaml'), brandYaml);
console.log('Created brand.yaml');

// ── theme.css ─────────────────────────────────────────────────────

const themeCss = `/* ${brandName} - reveal.js theme overrides */
/* This file is loaded after the base theme and overrides its CSS variables. */

@import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap');

:root {
  --r-heading-font: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
  --r-heading-color: ${primary};
  --r-heading-font-weight: 600;
  --r-heading-text-transform: none;
  --r-heading-letter-spacing: -0.02em;

  --r-main-font: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
  --r-main-font-size: 36px;
  --r-main-color: ${isDark ? '#e2e8f0' : '#1e293b'};

  --r-code-font: 'JetBrains Mono', monospace;

  --r-link-color: ${primary};
  --r-link-color-hover: ${secondary};
  --r-selection-background-color: ${primary}33;
}

/* Brand color utilities */
.brand-primary { color: ${primary}; }
.brand-secondary { color: ${secondary}; }
.brand-accent { color: ${accent}; }
.bg-brand-primary { background-color: ${primary}; color: #fff; }
.bg-brand-secondary { background-color: ${secondary}; color: #fff; }
.bg-brand-accent { background-color: ${accent}; color: #fff; }

/* Section divider gradient */
.reveal section.section-slide {
  color: #fff;
}
`;

writeFileSync(join(brandPath, 'theme.css'), themeCss);
console.log('Created theme.css');

// ── General starter template ──────────────────────────────────────

const gradient = `linear-gradient(135deg, ${primary} 0%, ${secondary} 100%)`;

const generalTemplate = `      <section>
        <h1>{{TITLE}}</h1>
        <p class="attribution">${brandName} | Prepared by [Author] | [Date]</p>
      </section>

      <section class="section-slide" data-background-gradient="${gradient}">
        <h2>Section One</h2>
      </section>

      <section>
        <h2>Key Points</h2>
        <ul>
          <li class="fragment">First major point</li>
          <li class="fragment">Second major point</li>
          <li class="fragment">Third major point</li>
        </ul>
      </section>

      <section>
        <h2>Key Takeaway</h2>
        <p style="opacity: 0.7; margin-top: 0.5em;">The single most important message</p>
      </section>

      <section class="section-slide" data-background-gradient="${gradient}">
        <h2>Section Two</h2>
      </section>

      <section>
        <h2>Supporting Evidence</h2>
        <table>
          <thead><tr><th>Metric</th><th>Value</th><th>Impact</th></tr></thead>
          <tbody>
            <tr><td>Example</td><td>100</td><td>High</td></tr>
            <tr><td>Example</td><td>200</td><td>Medium</td></tr>
          </tbody>
        </table>
      </section>

      <section>
        <h2>Next Steps</h2>
        <ol>
          <li class="fragment"><strong>Immediate</strong> . This week</li>
          <li class="fragment"><strong>Short-term</strong> . This month</li>
          <li class="fragment"><strong>Long-term</strong> . This quarter</li>
        </ol>
      </section>

      <section>
        <h2>Thank You</h2>
        <p style="opacity: 0.6; font-size: 0.6em; margin-top: 1em;">${brandName}</p>
      </section>`;

writeFileSync(join(brandPath, 'templates', 'general.html'), generalTemplate);
console.log('Created templates/general.html');

// ── Pitch deck starter template ───────────────────────────────────

const pitchTemplate = `      <section>
        <h1>{{TITLE}}</h1>
        <p style="opacity: 0.7; margin-top: 0.5em;">[One-line value proposition]</p>
        <p class="attribution">${brandName} | [Date]</p>
      </section>

      <section>
        <h2>The Problem</h2>
        <ul>
          <li class="fragment">Who experiences this problem</li>
          <li class="fragment">How it affects them (quantify if possible)</li>
          <li class="fragment">Why existing solutions fall short</li>
        </ul>
        <aside class="notes">Make the audience feel the pain before offering the solution</aside>
      </section>

      <section>
        <h2>The Stakes</h2>
        <p style="opacity: 0.7; margin-top: 0.5em;">What happens if this problem persists?</p>
      </section>

      <section class="section-slide" data-background-gradient="${gradient}">
        <h2>The Solution</h2>
      </section>

      <section>
        <h2>How It Works</h2>
        <ol>
          <li class="fragment"><strong>Step one</strong> . What happens first</li>
          <li class="fragment"><strong>Step two</strong> . What happens next</li>
          <li class="fragment"><strong>Step three</strong> . The outcome</li>
        </ol>
      </section>

      <section>
        <h2>Results</h2>
        <div class="metrics">
          <div class="metric">
            <div class="number brand-primary">X%</div>
            <div class="label">Metric One</div>
          </div>
          <div class="metric">
            <div class="number brand-primary">Nx</div>
            <div class="label">Metric Two</div>
          </div>
          <div class="metric">
            <div class="number brand-primary">Y%</div>
            <div class="label">Metric Three</div>
          </div>
        </div>
      </section>

      <section>
        <blockquote>"Testimonial or key proof point goes here."</blockquote>
        <p><strong>Name</strong> . Title, Company</p>
      </section>

      <section>
        <h2>The Ask</h2>
        <ul>
          <li class="fragment">What we need (investment, partnership, approval)</li>
          <li class="fragment">What we deliver in return</li>
          <li class="fragment">Timeline and next steps</li>
        </ul>
      </section>

      <section>
        <h2>Let's Talk</h2>
        <p style="opacity: 0.6; font-size: 0.6em; margin-top: 1em;">${brandName} | contact@example.com</p>
      </section>`;

writeFileSync(join(brandPath, 'templates', 'pitch.html'), pitchTemplate);
console.log('Created templates/pitch.html');

// ── Assets README ─────────────────────────────────────────────────

writeFileSync(join(brandPath, 'assets', 'README.md'), `# Brand Assets

Place your logo files here:

- \`logo.svg\` . Standard logo (cover slides, light backgrounds)
- \`logo-white.svg\` . White version (dark/gradient backgrounds)
- \`icon.svg\` . Icon-only version (footers, small spaces)

These are referenced by \`brand.yaml\` and copied into presentation projects by Presentation Builder.
`);
console.log('Created assets/README.md');

console.log('');
console.log('Brand template created successfully.');
console.log('');
console.log('Next steps:');
console.log(`  1. Add logo files to ${join(brandPath, 'assets')}/`);
console.log(`  2. Edit ${join(brandPath, 'brand.yaml')} to customize fonts and settings`);
console.log(`  3. Customize ${join(brandPath, 'theme.css')} for advanced styling`);
console.log(`  4. Create a presentation: node scripts/create-project.js --path /my/deck --brand "${brandPath}"`);
