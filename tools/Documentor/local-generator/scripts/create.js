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
 * - default:  general-purpose document style (Calibri 11pt, 1" margins)
 * - resume:   ATS + recruiter-friendly resume style (Calibri 10.5pt,
 *             0.75" margins, tight spacing, plain section headings)
 * - playbook: executive deliverable style. Same type system and palette
 *             as `resume` (Charter body, Avenir Next display, teal/ink/
 *             muted) but with document-grade vertical rhythm: 1" margins,
 *             1.45 line-height, real paragraph spacing. The resume profile
 *             is engineered to compress onto 3 pages; multi-page strategy
 *             documents (job playbooks, proposals, briefs) should use this
 *             profile instead so they read as designed deliverables.
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
    // Executive resume style (Design Advisor pass, 2026-05-28).
    // PDF is the canonical design target; DOCX is a degraded on-demand fallback
    // with no visual-parity obligation (per Anthony, 2026-05-28).
    // ATS-safe: single-column flow, real selectable text in DOM reading order,
    // no tables/images-for-text, canonical headings, modest heading tracking
    // (0.5pt; higher values make text extractors split heading letters).
    // Type roles: serif body (Charter), sans display (Avenir Next / Helvetica Neue).
    // Color (60-30-10): ink #1F2937 body; teal #0F4C5C accent used sparingly
    // (name, section rules, links only); muted #5B6770 tagline/contact/secondary.
    marginIn: 0.8,
    css: `
      body { font-family: 'Charter','Georgia','Times New Roman',serif; font-size: 10.5pt; line-height: 1.3; color: #1F2937; margin: 0; padding: 0; }
      h1 { font-family: 'Avenir Next','Helvetica Neue','Arial',sans-serif; font-size: 22pt; font-weight: 700; color: #0F4C5C; letter-spacing: 0.2pt; line-height: 1.0; margin: 0 0 1pt 0; }
      h2 { font-family: 'Avenir Next','Helvetica Neue','Arial',sans-serif; font-size: 10.5pt; font-weight: 700; color: #1F2937; text-transform: uppercase; letter-spacing: 0.5pt; border-bottom: 0.75pt solid #0F4C5C; padding-bottom: 2.5pt; margin: 15pt 0 5pt 0; }
      h3 { font-family: 'Charter','Georgia',serif; font-size: 10.5pt; font-weight: 700; color: #1F2937; margin: 8pt 0 1pt 0; page-break-after: avoid; }
      h4 { font-family: 'Charter','Georgia',serif; font-size: 10.5pt; font-weight: 700; font-style: italic; color: #1F2937; margin: 4pt 0 1pt 0; }
      p { margin: 0 0 3pt 0; }
      ul, ol { margin: 2pt 0 4pt 0; padding-left: 15pt; }
      li { margin-bottom: 2pt; line-height: 1.3; page-break-inside: avoid; }
      strong, b { font-weight: 700; color: #1F2937; }
      em, i { font-style: italic; }
      hr { display: none; }
      a { color: #0F4C5C; text-decoration: none; }
      .Tagline, [data-custom-style="Tagline"], div.tagline { font-family: 'Charter','Georgia',serif; font-size: 9.5pt; color: #5B6770; line-height: 1.3; text-wrap: balance; margin: 0 0 3pt 0; }
      .Contact, [data-custom-style="Contact"], div.contact { font-family: 'Avenir Next','Helvetica Neue','Arial',sans-serif; font-size: 9pt; color: #5B6770; letter-spacing: 0.2pt; margin: 0 0 11pt 0; }
      .RoleHeadline, [data-custom-style="Role\\ Headline"], div.role-headline { font-family: 'Avenir Next','Helvetica Neue','Arial',sans-serif; font-size: 12pt; font-weight: 600; color: #1F2937; margin: 0 0 3pt 0; }
      code { font-family: 'Charter','Georgia',serif; background: none; padding: 0; }
      pre { background: none; padding: 0; }
      blockquote { margin: 0 0 4pt 0; padding-left: 12pt; border-left: 2pt solid #5B6770; color: #1F2937; }
      table { border-collapse: collapse; margin: 2pt 0 4pt 0; width: 100%; }
      th, td { border: none; padding: 0 6pt 0 0; vertical-align: top; }
      th { font-weight: bold; text-align: left; }
    `,
  },
  playbook: {
    // Executive deliverable style (Design Advisor pass, 2026-06-05).
    // Shares the resume profile's type roles and 60-30-10 palette so a
    // playbook PDF sits next to a resume PDF as one design family, but
    // restores the vertical rhythm a multi-page document needs: the resume
    // profile's 3pt paragraph / 2pt list spacing is a 3-page compression
    // tactic, not a reading experience. Here paragraphs breathe (8pt),
    // lists articulate (5pt), section heads carry real air above (24pt),
    // and the leading is book-weight (1.45).
    // PDF output carries "Page N of M" folios on every page except page 1.
    marginIn: 1,
    pageNumbers: true,
    css: `
      body { font-family: 'Charter','Georgia','Times New Roman',serif; font-size: 10.5pt; line-height: 1.45; color: #1F2937; margin: 0; padding: 0; }
      h1 { font-family: 'Avenir Next','Helvetica Neue','Arial',sans-serif; font-size: 22pt; font-weight: 700; color: #0F4C5C; letter-spacing: 0.2pt; line-height: 1.0; margin: 0 0 2pt 0; }
      h2 { font-family: 'Avenir Next','Helvetica Neue','Arial',sans-serif; font-size: 11pt; font-weight: 700; color: #1F2937; text-transform: uppercase; letter-spacing: 0.5pt; border-bottom: 0.75pt solid #0F4C5C; padding-bottom: 3pt; margin: 24pt 0 9pt 0; page-break-after: avoid; }
      h3 { font-family: 'Charter','Georgia',serif; font-size: 10.5pt; font-weight: 700; color: #1F2937; margin: 14pt 0 4pt 0; page-break-after: avoid; }
      h4 { font-family: 'Charter','Georgia',serif; font-size: 10.5pt; font-weight: 700; font-style: italic; color: #1F2937; margin: 10pt 0 3pt 0; page-break-after: avoid; }
      p { margin: 0 0 8pt 0; }
      ul, ol { margin: 4pt 0 10pt 0; padding-left: 18pt; }
      li { margin-bottom: 5pt; line-height: 1.45; page-break-inside: avoid; }
      strong, b { font-weight: 700; color: #1F2937; }
      em, i { font-style: italic; }
      hr { display: none; }
      a { color: #0F4C5C; text-decoration: none; }
      .Tagline, [data-custom-style="Tagline"], div.tagline { font-family: 'Charter','Georgia',serif; font-size: 9.5pt; color: #5B6770; line-height: 1.3; text-wrap: balance; margin: 0 0 3pt 0; }
      .Contact, [data-custom-style="Contact"], div.contact { font-family: 'Avenir Next','Helvetica Neue','Arial',sans-serif; font-size: 9pt; color: #5B6770; letter-spacing: 0.2pt; margin: 0 0 18pt 0; }
      .RoleHeadline, [data-custom-style="Role\\ Headline"], div.role-headline { font-family: 'Avenir Next','Helvetica Neue','Arial',sans-serif; font-size: 12pt; font-weight: 600; color: #1F2937; margin: 0 0 3pt 0; }
      code { font-family: 'Charter','Georgia',serif; background: none; padding: 0; }
      pre { background: none; padding: 0; }
      blockquote { margin: 0 0 10pt 0; padding-left: 12pt; border-left: 2pt solid #5B6770; color: #1F2937; }
      table { border-collapse: collapse; margin: 4pt 0 10pt 0; width: 100%; }
      th, td { border: none; padding: 1pt 8pt 1pt 0; vertical-align: top; }
      th { font-weight: bold; text-align: left; }
    `,
  },
  letter: {
    // Business-letter style for cover letters. Roomier 1.25" margins and a
    // tighter line-height than `default`, with no extra body top margin, so a
    // short letter reads as composed rather than sparse.
    marginIn: 1.25,
    css: `
      body { font-family: 'Calibri','Arial',sans-serif; font-size: 11pt; line-height: 1.4; color: #1F2937; margin: 0 auto; max-width: 100%; }
      p { margin: 0 0 11pt 0; }
      a { color: #1F2937; text-decoration: none; }
      strong, b { font-weight: 700; }
      em, i { font-style: italic; }
      h1, h2, h3 { font-family: 'Calibri','Arial',sans-serif; font-weight: 700; }
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
 * Create PDF from HTML using Playwright (chromium).
 *
 * When pageNumbers is true, the footer shows "Page N of M" on every page
 * EXCEPT page 1 (title pages should not carry a folio). Chromium's print
 * pipeline cannot conditionally hide the footer on one page, so this is a
 * two-pass render: one PDF without footers, one with, both with identical
 * margins (the footer draws inside the margin box, so content layout is
 * byte-identical between passes). Page 1 of the plain render is then
 * stitched to pages 2..N of the numbered render via pdf-lib.
 */
async function createPdf(html, outputPath, marginIn = 1, pageNumbers = false) {
  const browser = await chromium.launch();
  const page = await browser.newPage();

  await page.setContent(html, { waitUntil: 'networkidle' });

  const m = `${marginIn}in`;
  const baseOpts = {
    format: 'Letter',
    margin: { top: m, right: m, bottom: m, left: m },
    printBackground: true,
  };

  if (!pageNumbers) {
    await page.pdf({ path: outputPath, ...baseOpts });
    await browser.close();
    return;
  }

  // Footer typography mirrors the resume/playbook secondary text role:
  // small sans, muted #5B6770.
  const footerTemplate = `
    <div style="width:100%; text-align:center; font-family:'Avenir Next','Helvetica Neue',Arial,sans-serif; font-size:8pt; color:#5B6770;">
      Page <span class="pageNumber"></span> of <span class="totalPages"></span>
    </div>`;

  const plainBuf = await page.pdf({ ...baseOpts });
  const numberedBuf = await page.pdf({
    ...baseOpts,
    displayHeaderFooter: true,
    headerTemplate: '<span></span>',
    footerTemplate,
  });
  await browser.close();

  const { PDFDocument } = await import('pdf-lib');
  const plain = await PDFDocument.load(plainBuf);
  const numbered = await PDFDocument.load(numberedBuf);
  const out = await PDFDocument.create();

  const [firstPage] = await out.copyPages(plain, [0]);
  out.addPage(firstPage);

  const total = numbered.getPageCount();
  if (total > 1) {
    const restIdx = Array.from({ length: total - 1 }, (_, i) => i + 1);
    const rest = await out.copyPages(numbered, restIdx);
    rest.forEach((p) => out.addPage(p));
  }

  writeFileSync(outputPath, Buffer.from(await out.save()));
}

/**
 * Main creation function
 */
async function createDocument(outputPath, options = {}) {
  const { content, text, title, style = 'default' } = options;

  if (!STYLES[style]) {
    throw new Error(`Unknown style: ${style}. Available: ${Object.keys(STYLES).join(', ')}`);
  }

  // Page numbers: CLI flag wins; otherwise the style profile decides.
  // PDF-only; the DOCX path ignores it (Word folios belong to the
  // reference template, not inline HTML).
  const pageNumbers = options.pageNumbers ?? STYLES[style].pageNumbers ?? false;

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
    await createPdf(html, outputPath, marginIn, pageNumbers);
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
  --style NAME        Style profile: default | resume | playbook | letter (default: default)
  --page-numbers      PDF only: add "Page N of M" footer on every page except
                      page 1. On by default for the playbook style; use
                      --no-page-numbers to suppress it there.
  --help, -h          Show this help message

Style profiles:
  default             Calibri 11pt, 1" margins, generous spacing.
  resume              Calibri 10.5pt, 0.75" margins, tight spacing,
                      uppercase rule-underlined section headings.
                      ATS + recruiter-friendly. Single column. No
                      tables/borders/colors.
  playbook            Resume type system and palette with document-grade
                      spacing: 1" margins, 1.45 leading, 8pt paragraph
                      rhythm. For multi-page deliverables (job playbooks,
                      proposals, briefs).
  letter              Calibri 11pt, 1.25" margins, business-letter rhythm.

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
let pageNumbers; // undefined = defer to the style profile

for (let i = 1; i < args.length; i++) {
  if (args[i] === '--content' && args[i + 1]) {
    content = args[++i];
  } else if (args[i] === '--text' && args[i + 1]) {
    text = args[++i];
  } else if (args[i] === '--title' && args[i + 1]) {
    title = args[++i];
  } else if (args[i] === '--style' && args[i + 1]) {
    style = args[++i];
  } else if (args[i] === '--page-numbers') {
    pageNumbers = true;
  } else if (args[i] === '--no-page-numbers') {
    pageNumbers = false;
  }
}

// Validate output extension
const ext = extname(outputPath).toLowerCase();
if (ext !== '.docx' && ext !== '.pdf') {
  console.error('Error: Output file must be .docx or .pdf');
  process.exit(1);
}

try {
  await createDocument(outputPath, { content, text, title, style, pageNumbers });
  console.log(`\nSuccess! Document created: ${outputPath}`);
} catch (e) {
  console.error(`Error: ${e.message}`);
  process.exit(1);
}

