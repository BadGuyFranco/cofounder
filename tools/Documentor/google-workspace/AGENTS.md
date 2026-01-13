# Google Workspace Sub-tool

Create Google Docs, Sheets, and Slides from other content formats. Export to Word/PDF/Excel/PowerPoint.

**Purpose:** Document creation and format conversion. For reading or editing existing Google Docs, use the Google Connector (`/connectors/google/`).

## Quick Start

```bash
node scripts/docs.js create --title "Meeting Notes" --account user@example.com
```

Expected output:
```
Document: Meeting Notes
URL: https://docs.google.com/document/d/abc123/edit
```

**If the command fails,** complete Setup below first.

## Setup

This tool uses the centralized **Google Connector** for authentication.

**Step 1: Set up Google Connector**

Follow `/connectors/google/SETUP.md` to configure OAuth credentials.

**Step 2: Authenticate your account**

```bash
cd /connectors/google
node scripts/auth.js setup --account your@email.com
```

When prompted, select scopes that include:
- `documents` - Google Docs access
- `spreadsheets` - Google Sheets access  
- `presentations` - Google Slides access
- `drive` - Google Drive access (for folders and exports)

**Step 3: Verify**

```bash
node scripts/auth.js status --account your@email.com
```

Credentials stored in `/memory/Connectors/google/[email].json`

## Scripts

| Script | Purpose | Help |
|--------|---------|------|
| `scripts/docs.js` | Create, read, edit, export Google Docs | `--help` |
| `scripts/sheets.js` | Create, read, write, export Google Sheets | `--help` |
| `scripts/slides.js` | Create, read, add/delete slides, export Google Slides | `--help` |
| `scripts/drive.js` | Folder navigation, file ops, comments | `--help` |
| `scripts/collaboration.js` | Document collaboration (imported by docs.js) | JSDoc in file |

Run any script with `--help` for full command syntax.

## Key Capabilities

**Document styling** (via `docs.js`):
- Get/set margins (all sides or individual)
- Get/set page size (Letter, A4, trade paperback, custom)

**Document collaboration** (via `docs.js` or import `collaboration.js`):
- Inline markers: colored `[comment:]` (blue) and `[suggestion:]` (gold) annotations
- Find and replace with optional highlighting
- List/accept native Google suggestions
- Update heading styles (font, size, color)

**Export**: Native formats (pdf, docx, txt, html, rtf, odt). For conversion to md/epub, export to HTML then use `local-generator/scripts/convert.js`.

**Path detection**: Automatically extracts account from Google Drive paths like `/Users/.../GoogleDrive-user@example.com/Shared drives/...`

## Known Limitations

**Cannot create suggestions programmatically.** Google Docs "Suggesting" mode is UI-only. Workaround: inline markers.

**Drive API comments don't appear in Docs margin.** They're file-level, not document-anchored. Workaround: inline markers.

## Troubleshooting

**"No credentials found":** Set up the Google Connector first:
```bash
cd /connectors/google
node scripts/auth.js setup --account your@email.com
```

**"Token refresh failed":** Credentials revoked. Re-run setup via Connector.

**"Folder not found":** Check spelling (case-sensitive) and access permissions.

**"Shared Drive not found":** Must be a member of the Shared Drive.
