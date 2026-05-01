#!/usr/bin/env node
/**
 * Create Word (.docx) or PDF documents from markdown content.
 *
 * Usage:
 *   node create.js output.docx --content content.md
 *   node create.js output.pdf --content content.md
 *   node create.js output.docx --text "# Hello World"
 *   node create.js output.pdf --title "My Document" --content content.md
 *   node create.js resume.docx --content resume.md --style resume
 */

import { ensureDeps } from '../../../../system/shared/ensure-deps.js';
ensureDeps(import.meta.url);

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { dirname, extname, resolve as pathResolve } from 'path';
import { fileURLToPath } from 'url';
import { spawnSync } from 'child_process';

const { marked } = await import('marked');
const { chromium } = await import('playwright');

// html-docx-js is CommonJS, need dynamic import
const htmlDocx = await import('html-docx-js').then(m => m.default || m);

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Reference docx templates for Pandoc-driven DOCX generation.
 * Keyed by style name. If the file is missing or Pandoc is unavailable,
 * the generator falls back to the html-docx-js path.
 */
const REFERENCE_DOCX = {
  resume: pathResolve(__dirname, '../templates/resume-reference.docx'),
};

function isPandocAvailable() {
  const probe = spawnSync('pandoc', ['--version'], { stdio: 'ignore' });
  return probe.status === 0;
}

/**
 * Style profiles. Each profile defines the CSS and the page margins
 * (in inches) used for PDF output and (in EMU twentieths-of-a-point)
 * for DOCX output.
 *
 * - default: general-purpose document style (Calibri 11pt, 1" margins)
 * - resume:  ATS + recruiter-friendly resume style (Calibri 10.5pt,
 *            0.75" margins, tight spacing, plain section headings)
 */
const STYLES = {
  default: {
    marginIn: 1,
    css: `
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
    `,
  },
  resume: {
    // Visual style profile mirrors templates/resume-reference.docx.
    // Edit BOTH together to keep PDF and DOCX visually in sync.
    // Design tokens (must match build-resume-reference.py):
    //   BODY        Georgia 10.5pt #1F2937 (charcoal)
    //   HEADING     Calibri (16/11 pt)
    //   ACCENT      #0F4C5C deep teal (name + section rules + links)
    //   SECONDARY   #595959 medium gray
    //   MARGINS     0.75 in
    marginIn: 0.75,
    css: `
      body {
        font-family: 'Georgia', 'Times New Roman', serif;
        font-size: 10.5pt;
        line-height: 1.2;
        color: #1F2937;
        margin: 0;
        padding: 0;
      }
      h1 {
        font-family: 'Calibri', 'Arial', sans-serif;
        font-size: 22pt;
        font-weight: bold;
        color: #0F4C5C;
        margin: 0 0 2pt 0;
        text-align: left;
        letter-spacing: 1pt;
        line-height: 1.0;
      }
      h2 {
        font-family: 'Calibri', 'Arial', sans-serif;
        font-size: 11pt;
        font-weight: bold;
        color: #1F2937;
        text-transform: uppercase;
        letter-spacing: 0.6pt;
        border-bottom: 1.5pt solid #0F4C5C;
        margin: 14pt 0 4pt 0;
        padding-bottom: 2pt;
      }
      h3 {
        font-family: 'Georgia', 'Times New Roman', serif;
        font-size: 11pt;
        font-weight: bold;
        color: #1F2937;
        margin: 8pt 0 2pt 0;
      }
      h4 {
        font-family: 'Georgia', 'Times New Roman', serif;
        font-size: 10.5pt;
        font-weight: bold;
        font-style: italic;
        color: #1F2937;
        margin: 4pt 0 1pt 0;
      }
      p { margin: 0 0 4pt 0; }
      ul, ol { margin: 2pt 0 4pt 0; padding-left: 18pt; }
      li { margin-bottom: 2pt; }
      strong, b { font-weight: bold; color: #1F2937; }
      em, i { font-style: italic; }
      hr { display: none; }
      a { color: #0F4C5C; text-decoration: underline; }

      /*
       * Custom paragraph styles. PDF mirrors the Pandoc reference.docx
       * custom-style classes by matching a class attribute on the
       * generated HTML element. Marked passes div fences as <div>
       * with the class set, so we can target them.
       */
      .Tagline, [data-custom-style="Tagline"], div.tagline {
        font-family: 'Georgia', 'Times New Roman', serif;
        font-size: 10.5pt;
        font-style: italic;
        color: #595959;
        margin: 0 0 2pt 0;
      }
      .Contact, [data-custom-style="Contact"], div.contact {
        font-family: 'Georgia', 'Times New Roman', serif;
        font-size: 9.5pt;
        color: #595959;
        margin: 0 0 8pt 0;
      }
      .RoleHeadline, [data-custom-style="Role\\ Headline"], div.role-headline {
        font-family: 'Calibri', 'Arial', sans-serif;
        font-size: 11pt;
        font-weight: bold;
        color: #1F2937;
        margin: 0 0 2pt 0;
      }
      code { font-family: 'Georgia', 'Times New Roman', serif; background: none; padding: 0; }
      pre { background: none; padding: 0; }
      blockquote { margin: 0 0 4pt 0; padding-left: 12pt; border-left: 2pt solid #595959; color: #1F2937; }
      table { border-collapse: collapse; margin: 2pt 0 4pt 0; width: 100%; }
      th, td { border: none; padding: 0 6pt 0 0; vertical-align: top; }
      th { font-weight: bold; text-align: left; }
    `,
  },
};

/**
 * Pre-process Pandoc-style fenced divs into raw HTML divs so the
 * marked parser (used by the PDF pipeline) can render them. Pandoc
 * understands the original syntax natively for the DOCX pipeline,
 * so this preprocessor is a no-op for the inputs Pandoc consumes.
 *
 * Recognized syntax (Pandoc fenced div):
 *
 *   ::: {custom-style="Tagline"}
 *   content paragraphs (markdown)
 *   :::
 *
 *   ::: {.Tagline}                 <- class shorthand also accepted
 *   content
 *   :::
 *
 *   ::: {.Tagline custom-style="Tagline"}   <- both, combined
 *   content
 *   :::
 *
 * Output: <div class="Tagline">\n\ncontent\n\n</div>
 *
 * The blank lines inside the div tell marked to keep parsing the
 * inner content as markdown (CommonMark raw-HTML-with-blank-lines rule).
 */
function pandocDivsToHtml(md) {
  return md.replace(
    /^:::\s*\{([^}]+)\}\s*\n([\s\S]*?)\n:::\s*$/gm,
    (_match, attrs, content) => {
      const styleMatch = attrs.match(/custom-style="([^"]+)"/);
      const classMatch = attrs.match(/\.([A-Za-z0-9_-]+)/);
      const raw = styleMatch ? styleMatch[1] : (classMatch ? classMatch[1] : '');
      const cls = raw.replace(/\s+/g, '');
      // Surround with blank lines so each div is its own HTML block
      // under CommonMark rule 6 (blank line ends the block, allowing
      // following markdown - including the next div - to parse cleanly).
      return `\n<div class="${cls}">\n\n${content}\n\n</div>\n`;
    }
  );
}

/**
 * Convert markdown to HTML
 */
function markdownToHtml(markdown, title = null, styleName = 'default') {
  const style = STYLES[styleName] || STYLES.default;
  const preprocessed = pandocDivsToHtml(markdown);
  const content = marked.parse(preprocessed);

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  ${title ? `<title>${escapeHtml(title)}</title>` : ''}
  <style>${style.css}</style>
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
 * Create Word document from HTML using html-docx-js.
 *
 * Inline-CSS path. Functional but plain. Used when no styled
 * reference.docx is wired in for the requested style, or when Pandoc
 * is not available on the system.
 */
async function createWord(html, outputPath, marginIn = 1) {
  // html-docx-js margins are in twentieths of a point. 1 inch = 1440.
  const m = Math.round(marginIn * 1440);
  const docxBuffer = htmlDocx.asBlob(html, {
    margins: { top: m, right: m, bottom: m, left: m, header: 720, footer: 720, gutter: 0 },
  });
  const arrayBuffer = await docxBuffer.arrayBuffer();
  writeFileSync(outputPath, Buffer.from(arrayBuffer));
}

/**
 * Create Word document via Pandoc using a styled reference.docx.
 *
 * This is the path that produces designer-grade Word output. Pandoc
 * applies the named styles (Heading 1, Heading 2, Normal, etc.) from
 * the reference doc to the markdown's structural elements, producing
 * real OOXML styles rather than inline CSS.
 *
 * Returns true on success, false if Pandoc errors. Caller falls back
 * to html-docx-js on false.
 */
function createWordViaPandoc(markdownPath, outputPath, referenceDocxPath) {
  // Use Pandoc's `markdown` reader (a superset of GFM) so fenced divs
  // (::: blocks) and the custom-style attribute are recognized. The
  // resume pipeline relies on this for Tagline / Contact / Role Headline
  // paragraph-style mapping.
  const args = [
    '--from=markdown+fenced_divs+bracketed_spans+footnotes',
    '--to=docx',
    `--reference-doc=${referenceDocxPath}`,
    `--output=${outputPath}`,
    markdownPath,
  ];
  const result = spawnSync('pandoc', args, { encoding: 'utf-8' });
  if (result.status !== 0) {
    console.error(`Pandoc failed: ${result.stderr || result.error?.message || 'unknown error'}`);
    return false;
  }
  return true;
}

/**
 * Create PDF from HTML using Playwright (chromium)
 */
async function createPdf(html, outputPath, marginIn = 1) {
  const browser = await chromium.launch();
  const page = await browser.newPage();

  await page.setContent(html, { waitUntil: 'networkidle' });

  const m = `${marginIn}in`;
  await page.pdf({
    path: outputPath,
    format: 'Letter',
    margin: { top: m, right: m, bottom: m, left: m },
    printBackground: true,
  });

  await browser.close();
}

/**
 * Main creation function
 */
async function createDocument(outputPath, options = {}) {
  const { content, text, title, style = 'default' } = options;

  if (!STYLES[style]) {
    throw new Error(`Unknown style: ${style}. Available: ${Object.keys(STYLES).join(', ')}`);
  }

  let markdown;
  let markdownSourcePath = null;
  if (text) {
    markdown = text;
  } else if (content) {
    if (!existsSync(content)) {
      throw new Error(`Content file not found: ${content}`);
    }
    markdown = readFileSync(content, 'utf-8');
    markdownSourcePath = pathResolve(content);
  } else {
    throw new Error('Either --content or --text is required');
  }

  const marginIn = STYLES[style].marginIn;

  const outputDir = dirname(outputPath);
  if (outputDir && !existsSync(outputDir)) {
    mkdirSync(outputDir, { recursive: true });
  }

  const ext = extname(outputPath).toLowerCase();

  if (ext === '.docx') {
    // Prefer Pandoc + reference.docx when a template exists for this style
    // and Pandoc is available. This produces real Word styles (Heading 1,
    // Heading 2, Body, etc.) instead of inline CSS, which both Word and
    // ATS parsers handle better.
    const refDocx = REFERENCE_DOCX[style];
    const canUsePandoc = refDocx && existsSync(refDocx) && markdownSourcePath && isPandocAvailable();

    if (canUsePandoc) {
      const ok = createWordViaPandoc(markdownSourcePath, outputPath, refDocx);
      if (!ok) {
        console.error('Pandoc path failed; falling back to html-docx-js.');
        const html = markdownToHtml(markdown, title, style);
        await createWord(html, outputPath, marginIn);
      }
    } else {
      const html = markdownToHtml(markdown, title, style);
      await createWord(html, outputPath, marginIn);
    }
  } else if (ext === '.pdf') {
    const html = markdownToHtml(markdown, title, style);
    await createPdf(html, outputPath, marginIn);
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
  --style NAME        Style profile: default | resume (default: default)
  --help, -h          Show this help message

Style profiles:
  default             Calibri 11pt, 1" margins, generous spacing.
  resume              Calibri 10.5pt, 0.75" margins, tight spacing,
                      uppercase rule-underlined section headings.
                      ATS + recruiter-friendly. Single column. No
                      tables/borders/colors.

Examples:
  node create.js report.docx --content README.md
  node create.js summary.pdf --content notes.md --title "Meeting Notes"
  node create.js quick.docx --text "# Hello\\n\\nThis is a test."
  node create.js resume.docx --content resume.md --style resume
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
let style = 'default';

for (let i = 1; i < args.length; i++) {
  if (args[i] === '--content' && args[i + 1]) {
    content = args[++i];
  } else if (args[i] === '--text' && args[i + 1]) {
    text = args[++i];
  } else if (args[i] === '--title' && args[i + 1]) {
    title = args[++i];
  } else if (args[i] === '--style' && args[i + 1]) {
    style = args[++i];
  }
}

// Validate output extension
const ext = extname(outputPath).toLowerCase();
if (ext !== '.docx' && ext !== '.pdf') {
  console.error('Error: Output file must be .docx or .pdf');
  process.exit(1);
}

try {
  await createDocument(outputPath, { content, text, title, style });
  console.log(`\nSuccess! Document created: ${outputPath}`);
} catch (e) {
  console.error(`Error: ${e.message}`);
  process.exit(1);
}

