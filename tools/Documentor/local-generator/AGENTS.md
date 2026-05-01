# Local Generator

Offline fallback for Word and PDF generation when cloud services are unavailable.

## Quick Start

```bash
cd local-generator && npm install
node scripts/create.js report.pdf --content notes.md
```

Expected output:
```
Created: report.pdf
```

**If the command fails,** see Troubleshooting section below.

## Purpose

This sub-tool provides local document generation without requiring Google Workspace or Microsoft 365 credentials. Use it when:

- Cloud services are not configured
- Working offline
- Cloud authentication has failed
- Simple document generation is needed

## Setup

```bash
cd local-generator
npm install
```

**Note:** Playwright downloads browser binaries (~300MB) on first install. Run `npx playwright install chromium` to install only Chromium.

See **`requirements.txt`** for system dependencies (pandoc for format conversion).

## Operations

### Create Documents

**Script:** `scripts/create.js`

Generate Word (.docx) or PDF from markdown content.

**Usage:**

```bash
# From markdown file
node scripts/create.js output.docx --content content.md
node scripts/create.js output.pdf --content notes.md

# From direct text
node scripts/create.js output.docx --text "# Hello World"

# With title
node scripts/create.js report.pdf --content data.md --title "Quarterly Report"
```

**Options:**
- `output` - Output file path (.docx or .pdf) (required)
- `--content FILE` - Path to markdown file
- `--text TEXT` - Markdown text directly (alternative to --content)
- `--title TITLE` - Document title
- `--style NAME` - Style profile: `default` (general purpose) or `resume` (ATS + recruiter-friendly, Set B: Georgia body + Calibri headings, charcoal palette, 0.75" margins, hairline section borders)

**Supported outputs:** `.docx` and `.pdf` only

**Style profiles:**

| Style | Body font | Heading font | Margins | DOCX engine | Best for |
|-------|-----------|--------------|---------|-------------|----------|
| `default` | Calibri 11pt | Calibri (scaled) | 1 inch | html-docx-js (inline CSS) | Reports, notes, general docs |
| `resume` | Georgia 10.5pt charcoal | Calibri (16/11pt, charcoal, uppercase sections with hairline border) | 0.75 inch | Pandoc + reference.docx if available, html-docx-js fallback | ATS + recruiter-grade resumes |

The `resume` style produces real Word styles (Heading 1, Heading 2, Heading 3, Normal, Body Text) when Pandoc is installed, which is what recruiters and ATS parsers expect. The reference template lives at `templates/resume-reference.docx` and is rebuilt via `templates/build-resume-reference.py`. Edit the design tokens at the top of that script and rerun to update.

### Convert Formats

**Script:** `scripts/convert.js`

Convert between document formats using pandoc. Use this after exporting from Google Workspace or Microsoft 365.

**Usage:**

```javascript
import { convertFile, isPandocInstalled, PANDOC_FORMATS } from './scripts/convert.js';

// Check pandoc is available
if (!isPandocInstalled()) {
  console.error('Install pandoc: conda install -y pandoc');
}

// Convert HTML to markdown
convertFile('document.html', 'document.md', { from: 'html', to: 'gfm' });

// Convert HTML to epub with metadata
convertFile('document.html', 'document.epub', { 
  from: 'html', 
  to: 'epub',
  title: 'My Document',
  author: 'Author Name'
});
```

**Supported conversions (from HTML):**
- `md` / `markdown` - GitHub-flavored markdown
- `epub` - ePub ebook
- `latex` - LaTeX
- `rst` - reStructuredText
- `asciidoc` - AsciiDoc
- `org` - Emacs Org mode
- `textile` - Textile
- `mediawiki` - MediaWiki

**Requires:** pandoc (`conda install -y pandoc`, requires Miniforge)

### Read/Extract Documents

**Script:** `scripts/read.js`

Extract text content from existing Word or PDF documents.

**Usage:**

```bash
# Extract to stdout
node scripts/read.js document.docx
node scripts/read.js document.pdf

# Get structured JSON
node scripts/read.js document.pdf --json

# Save to file
node scripts/read.js contract.docx --output extracted.txt
```

**Options:**
- `input` - Input file path (.docx or .pdf) (required)
- `--json` - Output structured JSON instead of plain text
- `--output FILE` - Write output to file instead of stdout

**JSON output includes:**
- For Word: text, html representation, conversion messages
- For PDF: text, page count, document info, metadata

## Technical Details

**Pipeline:** Markdown → HTML (internal) → Target format

The HTML intermediate format is not exposed; it's used internally for consistent styling.

**Dependencies:**

| Package | Purpose |
|---------|---------|
| `marked` | Markdown to HTML conversion |
| `html-docx-js` | HTML to Word conversion |
| `playwright` | HTML to PDF rendering (Chromium) |
| `mammoth` | Word text extraction |
| `pdf-parse` | PDF text extraction |

## Styling

Documents use a clean, professional style:

- Font: Calibri (falls back to Arial)
- Size: 11pt body, scaled headings
- Margins: 1 inch all sides
- Line height: 1.5

Custom styling is not currently configurable. Future versions may support CSS templates.

## Limitations

- No complex formatting (columns, headers/footers, page numbers)
- No image embedding from markdown
- No table of contents generation
- No track changes or comments
- Word output may differ slightly from native Word

For complex document requirements, use Google Workspace or Microsoft 365 sub-tools.

## Troubleshooting

**"Cannot find module" errors:**
```bash
cd local-generator && npm install
```

**Playwright/Chromium issues:**
- Ensure sufficient disk space (~300MB)
- On Linux, may need additional system dependencies: `npx playwright install-deps chromium`
- Try: `npx playwright install chromium`

**Empty or corrupted output:**
- Verify input markdown is valid
- Check file permissions on output directory
- Try a simpler test document first

**PDF rendering issues:**
- Playwright uses headless Chromium; complex CSS may render differently
- Tables and code blocks should work; complex layouts may not

