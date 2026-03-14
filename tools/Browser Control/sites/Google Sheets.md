# Google Sheets Browser Automation

Site-specific patterns for automating Google Sheets interactions.

**Base URL patterns:** `docs.google.com/spreadsheets/*`

## Capabilities

| Task | Capability |
|------|------------|
| Navigate to sheets | Yes |
| Read cell content | Yes (run_code) |
| Extract full table data | Yes (run_code) |
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

1. `browser_navigate` to `https://docs.google.com/spreadsheets/d/[ID]/pubhtml`
2. `browser_snapshot` to verify the page loaded
3. `browser_run_code` to extract table data:
   ```javascript
   Array.from(document.querySelectorAll('table tr')).map(row =>
     Array.from(row.querySelectorAll('td, th')).map(cell => cell.innerText)
   )
   ```

This returns a 2D array of all cell values.

## Tab Navigation

Published sheets with multiple tabs use the `gid` parameter:

- First tab (default): `https://docs.google.com/spreadsheets/d/[ID]/pubhtml?gid=0`
- Specific tab: `https://docs.google.com/spreadsheets/d/[ID]/pubhtml?gid=123456`

## Extracting Specific Data

Use `browser_run_code` with JavaScript:

```javascript
// Get all rows as arrays
Array.from(document.querySelectorAll('table tr')).map(r =>
  Array.from(r.querySelectorAll('td')).map(c => c.innerText)
)

// Get header row
Array.from(document.querySelectorAll('table tr:first-child th')).map(h => h.innerText)

// Get specific column (e.g., column 2)
Array.from(document.querySelectorAll('table tr')).map(r =>
  r.querySelectorAll('td')[1]?.innerText
)

// Count rows
document.querySelectorAll('table tr').length
```

## Iframe Handling

Published sheets sometimes render in iframes. If extraction returns empty:

1. `browser_run_code` with: `document.querySelector('iframe')?.src`
2. If iframe found, `browser_navigate` directly to the iframe URL
3. Then extract data normally

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

1. `browser_navigate` to `https://docs.google.com/spreadsheets/d/[ID]/pubhtml?gid=0`
2. `browser_snapshot` to verify the page loaded
3. `browser_run_code` to get headers:
   ```javascript
   Array.from(document.querySelectorAll('table tr:first-child th, table tr:first-child td')).map(h => h.innerText)
   ```
4. `browser_run_code` to get data rows:
   ```javascript
   Array.from(document.querySelectorAll('table tr')).slice(1).map(r =>
     Array.from(r.querySelectorAll('td')).map(c => c.innerText)
   )
   ```
5. `browser_take_screenshot` for visual reference

## When to Use What

| Need | Tool |
|------|------|
| Full table extraction | Browser Control (run_code) |
| Read/write operations | Google Sheets API connector |
| Visual inspection | Browser Control (screenshot) |
| Automated edits | Google Sheets API connector |
