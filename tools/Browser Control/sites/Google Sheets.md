# Google Sheets Browser Automation

Site-specific patterns for automating Google Sheets interactions.

**Base URL patterns:** `docs.google.com/spreadsheets/*`

## Limitations on Google Sheets

| Task | MCP Capability |
|------|----------------|
| Navigate to sheets | Yes |
| Read visible cell content | **Partial** (from snapshot, limited) |
| Extract full table data | **No** (requires JavaScript) |
| Interact with cells | **Limited** (can click, but editing is complex) |

**For reliable data extraction from Google Sheets:** Use the Google Sheets API connector (`/cofounder/connectors/google/`) or Playwright scripts.


## Published Sheets vs. Edit Mode

### Published sheets (read-only)
URL contains `/pubhtml`
- No authentication required
- Data displayed in HTML table format
- Content may be in iframe

### Edit mode sheets
URL contains `/edit`
- Requires Google authentication
- Complex canvas-based rendering
- **Very limited automation capability** (cells are rendered on canvas, not DOM)


## Published Sheet Navigation

### Basic navigation

```
1. browser_navigate: https://docs.google.com/spreadsheets/d/[ID]/pubhtml
2. browser_wait_for time=2  # Allow iframe to load
3. browser_snapshot
4. CHECKPOINT: "Sheet loaded, [describe visible content]"
```

### Iframe handling

Published sheets often render content in an iframe. The snapshot may show the wrapper page rather than the actual data.

**What to look for in snapshot:**
- If you see table data: proceed with extraction
- If you see minimal content: data is likely in iframe

**Iframe workaround:**
1. Look for the iframe URL in page source or snapshot
2. Navigate directly to the iframe URL
3. Re-snapshot


## What You Can Extract from Snapshots

From published sheet snapshots, you may see:
- Sheet title
- Tab names (if multiple sheets)
- Some cell content (depending on rendering)
- Links within cells

**Extraction is limited because:**
- Snapshots show accessibility tree, not full DOM
- Table structure may not be fully represented
- Large sheets may only show visible portion


## Tab Navigation

Published sheets with multiple tabs use the `gid` parameter:

```
?gid=0        # First tab (default)
?gid=123456   # Specific tab by ID
```

To switch tabs:
```
1. Construct URL with desired gid
2. browser_navigate to the new URL
3. browser_wait_for time=2
4. browser_snapshot
```


## Edit Mode Limitations

**Google Sheets edit mode uses canvas rendering.** This means:
- Cell content is drawn on a canvas element
- Individual cells are NOT in the DOM
- Snapshots show the canvas, not cell values
- **Cannot extract cell data via MCP browser tools**

**For edit mode sheets:** Use the Google Sheets API connector instead.


## Recommended Alternatives

### For data extraction

**Google Sheets API (preferred):**
```
Location: /cofounder/connectors/google/
Capability: Full read/write access to sheet data
Requirement: Google API credentials
```

**Playwright with JavaScript:**
```javascript
// Can execute JavaScript to query published sheet tables
const rows = await page.evaluate(() => {
  return Array.from(document.querySelectorAll('table tr'))
    .map(row => Array.from(row.querySelectorAll('td'))
      .map(cell => cell.innerText));
});
```

### For simple visual inspection

MCP browser tools work for:
- Navigating to a sheet
- Taking screenshots for visual reference
- Verifying a sheet exists and is accessible


## Common Failures and Fixes

| Failure | Cause | Fix |
|---------|-------|-----|
| Empty snapshot | Content in iframe | Navigate to iframe URL directly |
| No table data | Edit mode sheet | Use Sheets API instead |
| Wrong tab data | Default gid loaded | Add `?gid=TABID` to URL |
| Access denied | Private sheet | User must share or authenticate |


## Example: Published Sheet Inspection

```
1. browser_navigate: https://docs.google.com/spreadsheets/d/[ID]/pubhtml?gid=0
2. browser_wait_for time=2
3. browser_snapshot
   CHECKPOINT: "Sheet loaded. Visible in snapshot:
   - Title: 'Q4 Sales Data'
   - Tabs visible: Sheet1, Sheet2, Summary
   - Some table content visible"

4. browser_take_screenshot  # For visual reference
   CHECKPOINT: "Screenshot captured showing table layout"

5. Report to user: "I can see the sheet is accessible and contains a table
   with sales data. For full data extraction, I recommend using the
   Google Sheets API connector which can read all rows programmatically."
```


## When to Use What

| Need | Tool |
|------|------|
| Full table data | Google Sheets API connector |
| Visual inspection | MCP browser (snapshot/screenshot) |
| JavaScript extraction | Playwright scripts |
| Automated edits | Google Sheets API connector |
| One-time manual viewing | MCP browser navigation |
