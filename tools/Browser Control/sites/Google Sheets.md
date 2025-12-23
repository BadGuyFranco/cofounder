# Google Sheets Browser Automation

Site-specific patterns for automating Google Sheets interactions.

**Base URL patterns:** `docs.google.com/spreadsheets/*`


## Published Sheets vs. Edit Mode

### Published sheets (read-only)
URL contains `/pubhtml`
- No authentication required
- Data is inside an iframe
- Limited interactivity

### Edit mode sheets
URL contains `/edit`
- Requires Google authentication
- Full interactivity
- More complex DOM structure


## Iframe Handling (Published Sheets)

Published Google Sheets embed their content in an iframe. You must navigate to the iframe URL directly.

### Step-by-Step Process

**1. Navigate to published sheet**
```
browser_navigate to pubhtml URL
```

**2. Extract iframe source**
```javascript
// browser_evaluate
() => {
  const iframe = document.querySelector('iframe');
  if (iframe && iframe.src) {
    return { found: true, src: iframe.src };
  }
  return { found: false, message: 'No iframe found' };
}
```

**3. Navigate to iframe URL**
```
browser_navigate to extracted iframe src
browser_snapshot
```

Now you can interact with the actual sheet content.


## Table Data Extraction

### Get all rows from published sheet
```javascript
() => {
  const rows = Array.from(document.querySelectorAll('table tr'));
  const data = rows.map(row => {
    const cells = Array.from(row.querySelectorAll('td, th'));
    return cells.map(cell => cell.innerText.trim());
  });
  return { 
    success: data.length > 0, 
    rowCount: data.length,
    rows: data 
  };
}
```

### Find row by column value
```javascript
// Find row where column 0 contains "166"
() => {
  const rows = Array.from(document.querySelectorAll('table tr'));
  for (const row of rows) {
    const cells = Array.from(row.querySelectorAll('td, th'));
    if (cells[0]?.innerText?.includes('166')) {
      return {
        success: true,
        row: cells.map(c => c.innerText.trim())
      };
    }
  }
  return { success: false, message: 'Row not found' };
}
```

### Get specific cell value
```javascript
// Get cell at row 5, column 2 (0-indexed)
() => {
  const rows = Array.from(document.querySelectorAll('table tr'));
  const cell = rows[5]?.querySelectorAll('td, th')[2];
  if (cell) {
    return { success: true, value: cell.innerText.trim() };
  }
  return { success: false };
}
```


## Link Extraction from Cells

Sheets often contain hyperlinks. Extract both text and URL:

```javascript
() => {
  const links = [];
  const rows = Array.from(document.querySelectorAll('table tr'));
  rows.forEach((row, rowIndex) => {
    const cells = Array.from(row.querySelectorAll('td, th'));
    cells.forEach((cell, colIndex) => {
      const anchor = cell.querySelector('a');
      if (anchor) {
        links.push({
          row: rowIndex,
          col: colIndex,
          text: anchor.innerText.trim(),
          href: anchor.href
        });
      }
    });
  });
  return { success: true, links };
}
```


## Known Quirks

### Published sheet loads in iframe
Always check for iframe and navigate to its source before trying to extract data.

### Multiple tables
Some sheets have frozen rows/columns that create multiple `table` elements. Check all tables:
```javascript
() => {
  const tables = document.querySelectorAll('table');
  return { tableCount: tables.length };
}
```

### Empty cells
Empty cells may contain `&nbsp;` or whitespace. Always `.trim()` cell content.

### Merged cells
Merged cells span multiple columns. The cell count per row may vary.

### Sheet tabs
Published sheets with multiple tabs require navigating via the tab parameter:
```
?gid=0        // First tab
?gid=123456   // Specific tab by ID
```


## Common Failures and Fixes

| Failure | Cause | Fix |
|---------|-------|-----|
| No table data found | Still on iframe wrapper | Navigate to iframe src first |
| Wrong tab data | Default tab loaded | Add `?gid=TABID` to URL |
| Empty results | Sheet still loading | Wait 2 seconds, re-snapshot |
| Partial data | Frozen rows in separate table | Query all tables |


## Example: Extract Row from Production Schedule

```
1. browser_navigate: https://docs.google.com/spreadsheets/d/.../pubhtml?gid=123
2. browser_evaluate: [extract iframe src]
   CHECKPOINT: "Found iframe, src is ..."
3. browser_navigate: [iframe src]
4. browser_snapshot
   CHECKPOINT: "Sheet loaded, table visible"
5. browser_evaluate: [find row where column 0 = "166"]
   CHECKPOINT: "Found row: Episode 166, Guest Name, LinkedIn URL"
```

