# Documentor

Create or convert documents (Word, PDF, Google Docs) from other formats.

## Path Resolution

`/cofounder/` and `/memory/` are workspace roots, not filesystem paths. Resolve from `user_info.Workspace Paths` before running terminal commands.

## Quick Start

```bash
cd "/cofounder/tools/Documentor/local-generator"
npm install
node scripts/create.js report.pdf --content notes.md
```

Expected output:
```
Created: report.pdf
```

**If the command fails,** see Troubleshooting section below.

## XML Boundaries

When processing document requests, use XML tags to separate user content:

<document_content>
{Markdown or text content to convert to document}
</document_content>

<document_request>
{What format, where to save, any styling requirements}
</document_request>

## Routing Logic

```
Create or convert document
    │
    ├─ Output is Google Doc/Sheet/Slide?
    │   └─ Use google-workspace/
    │
    ├─ Output is Word or PDF?
    │   └─ Use local-generator/
    │
    └─ Microsoft 365? (FUTURE)
        └─ Use microsoft-365/ when implemented
```

**Key principle:** Documentor creates/converts documents. For reading or editing existing Google Docs, use the Google Connector (`connectors/google/`).

## Configuration

### Local Generator (No configuration required)

Works immediately after `npm install`.

## Sub-tools

### Local Generator

**Location:** `local-generator/`

**Setup:**
```bash
cd local-generator && npm install
```

| Capability | Supported |
|------------|-----------|
| Create Word (.docx) | Yes |
| Create PDF | Yes |
| Read/extract from Word | Yes |
| Read/extract from PDF | Yes |
| Convert formats (via pandoc) | Yes |

See `local-generator/AGENTS.md` for complete usage.

### Google Workspace

**Location:** `google-workspace/`

**Setup:** Uses Google Connector credentials. See `google-workspace/AGENTS.md`.

| Capability | Supported |
|------------|-----------|
| Create Google Doc from content | Yes |
| Create Google Sheet from data | Yes |
| Create Google Slides from content | Yes |
| Export to Word/PDF/Excel/PowerPoint | Yes |

See `google-workspace/AGENTS.md` for complete usage.

### Microsoft 365 (Future)

**Location:** `microsoft-365/`

**Status:** Stubbed, not implemented.

## Output

**Local Generator:** User-specified path or current directory.

**Google Workspace:** Creates in Google Drive. Returns document URL.

## Troubleshooting

### Local Generator

**"Cannot find module" errors:**
```bash
cd local-generator && npm install
```

**Puppeteer/Chromium issues:**
- Requires ~300MB disk space for Chromium
- On Linux, may need system dependencies

**Pandoc not found (for format conversion):**
```bash
conda install -y pandoc
```

Requires Miniforge. If conda not available, follow `/cofounder/system/installer/dependencies/miniforge.md` first.

### Google Workspace

**"No credentials found":**
```bash
cd /connectors/google
node scripts/auth.js setup --account your@email.com
```

**"Token refresh failed":** Re-run setup via Google Connector.

## What Documentor Does NOT Handle

- **HTML file generation** - That's web development, not document creation
