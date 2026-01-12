# Documentor

Create Word, PDF, and cloud documents (Google Docs/Sheets/Slides).

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
Request for document (Word, PDF, Google Doc/Sheet/Slide)
    │
    ├─ User explicitly requests Google Doc/Sheet/Slide?
    │   └─ YES → Check if Google Workspace is configured
    │             • Configured → Use google-workspace/
    │             • Not configured → Guide user to SETUP.md
    │
    ├─ User explicitly requests Microsoft 365? (FUTURE)
    │   └─ YES → Check if Microsoft 365 is configured
    │
    └─ Word or PDF request (default path)
          └─ Use local-generator/
              • Word file → Markdown → .docx
              • PDF file → Markdown → .pdf
```

**Key principle:** Use Local Generator unless user explicitly asks for Google/365 integration.

## Configuration

### Local Generator (No configuration required)

Works immediately after `npm install`.

### Google Workspace (Optional)

**Credentials location:** `/memory/Connectors/google/[email].json` (uses Google Connector)

**Setup required:** See `/tools/Connectors/google/SETUP.md` for OAuth configuration.

Do NOT prompt users to set up Google integration. Only mention it if they specifically ask for Google Docs/Sheets/Slides.

## Sub-tools

### Local Generator (Default)

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

### Google Workspace (Optional)

**Location:** `google-workspace/`

**Setup:**
```bash
cd google-workspace && npm install
# Then set up via Google Connector:
cd /tools/Connectors/google
node scripts/auth.js setup --account your@email.com
```

| Capability | Supported |
|------------|-----------|
| Google Doc | Yes |
| Google Sheet | Yes |
| Google Slides | Yes |
| Export to Word/PDF/Excel/PowerPoint | Yes |
| Document styling (margins, page size) | Yes |
| Collaboration (inline markers) | Yes |

See `google-workspace/AGENTS.md` for complete usage.

### Microsoft 365 (Future)

**Location:** `microsoft-365/`

**Status:** Stubbed, not implemented.

## Output

**Local Generator:** User-specified path or current directory.

**Google Workspace:** Creates in Google Drive. Exports to same directory as source doc by default.

## Troubleshooting

### Local Generator Issues

**"Cannot find module" errors:**
```bash
cd local-generator && npm install
```

**Puppeteer/Chromium issues:**
- Requires ~300MB disk space for Chromium
- On Linux, may need system dependencies

**Pandoc not found (for format conversion):**
```bash
brew install pandoc  # macOS
```

### Google Workspace Issues

**Not set up:**
Point user to `/tools/Connectors/google/SETUP.md`

**"No credentials found":**
```bash
cd /tools/Connectors/google
node scripts/auth.js setup --account your@email.com
```

**"Token refresh failed":**
Credentials revoked. Re-run setup via Connector.

**"Folder not found":**
Check spelling (case-sensitive) and access permissions.

## What Documentor Does NOT Handle

- **HTML file generation** - That's web development, not document creation
