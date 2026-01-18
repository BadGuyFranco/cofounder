# Google Sheets Browser Automation

Site-specific patterns for automating Google Sheets interactions.

**Base URL patterns:** `docs.google.com/spreadsheets/*`

## Capabilities

| Task | Capability |
|------|------------|
| Navigate to sheets | Yes |
| Read cell content | Yes (execute.js) |
| Extract full table data | Yes (execute.js) |
| Interact with cells | Limited (canvas rendering) |

**For heavy data work:** Consider the Google Sheets API connector (`/cofounder/connectors/google/`).

## Published vs. Edit Mode

### Published sheets (`/pubhtml`)
- No authentication required
- Data in HTML tables
- Full extraction possible

### Edit mode (`/edit`)
- Requires Google auth
- Canvas-based rendering
- Limited cell interaction

## Published Sheet Extraction

```bash
# Navigate to published sheet
node scripts/navigate.js "https://docs.google.com/spreadsheets/d/[ID]/pubhtml"

# Wait for content
node scripts/wait.js --time 2000

# Extract all table data
node scripts/execute.js --code "Array.from(document.querySelectorAll('table tr')).map(row => Array.from(row.querySelectorAll('td, th')).map(cell => cell.innerText))"
```

This returns a 2D array of all cell values.

## Tab Navigation

Published sheets with multiple tabs use the `gid` parameter:

```bash
# First tab (default)
node scripts/navigate.js "https://docs.google.com/spreadsheets/d/[ID]/pubhtml?gid=0"

# Specific tab
node scripts/navigate.js "https://docs.google.com/spreadsheets/d/[ID]/pubhtml?gid=123456"
```

## Extracting Specific Data

```bash
# Get all rows as arrays
node scripts/execute.js --code "Array.from(document.querySelectorAll('table tr')).map(r => Array.from(r.querySelectorAll('td')).map(c => c.innerText))"

# Get header row
node scripts/execute.js --code "Array.from(document.querySelectorAll('table tr:first-child th')).map(h => h.innerText)"

# Get specific column (e.g., column 2)
node scripts/execute.js --code "Array.from(document.querySelectorAll('table tr')).map(r => r.querySelectorAll('td')[1]?.innerText)"

# Count rows
node scripts/execute.js --code "document.querySelectorAll('table tr').length"
```

## Iframe Handling

Published sheets sometimes render in iframes. If extraction returns empty:

```bash
# Check for iframe
node scripts/execute.js --code "document.querySelector('iframe')?.src"

# If iframe found, navigate directly to it
node scripts/navigate.js "[iframe-url]"
node scripts/wait.js --time 2000
# Then extract
```

## Edit Mode Limitations

Google Sheets edit mode uses canvas rendering:
- Cell content is drawn on canvas
- Individual cells are NOT in the DOM
- Cannot extract data via DOM queries

**For edit mode data:** Use the Google Sheets API connector instead.

## Common Failures

| Failure | Cause | Fix |
|---------|-------|-----|
| Empty data | Content in iframe | Extract iframe URL, navigate to it |
| No table found | Edit mode sheet | Use Sheets API connector |
| Wrong tab data | Default gid | Add `?gid=TABID` to URL |
| Access denied | Private sheet | User must share or authenticate |

## Example: Full Table Extraction

```bash
# 1. Navigate to published sheet
node scripts/navigate.js "https://docs.google.com/spreadsheets/d/[ID]/pubhtml?gid=0"

# 2. Wait for load
node scripts/wait.js --time 2000

# 3. Extract headers
node scripts/execute.js --code "Array.from(document.querySelectorAll('table tr:first-child th, table tr:first-child td')).map(h => h.innerText)"

# 4. Extract all data rows
node scripts/execute.js --code "Array.from(document.querySelectorAll('table tr')).slice(1).map(r => Array.from(r.querySelectorAll('td')).map(c => c.innerText))"

# 5. Screenshot for reference
node scripts/screenshot.js --output ./sheet-data.png
```

## When to Use What

| Need | Tool |
|------|------|
| Full table extraction | Browser Control (execute.js) |
| Read/write operations | Google Sheets API connector |
| Visual inspection | Browser Control (screenshot) |
| Automated edits | Google Sheets API connector |
