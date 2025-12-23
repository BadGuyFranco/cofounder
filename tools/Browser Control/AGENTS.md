# Browser Control

Control a web browser programmatically. Two modes available: MCP browser tools (AI agent direct control) and Playwright scripts (custom automation).

## Mode Selection

**Use MCP Browser Tools when:**
- AI agent needs to interact with a page during conversation
- Task requires dynamic decision-making based on page content
- One-off or variable tasks (different pages, different goals each time)

**Use Playwright Scripts when:**
- Task is repetitive and identical each time
- Need persistent login sessions across runs
- Running automation outside of AI conversation

This guide focuses on **MCP Browser Tools**. For Playwright scripts, see the "Playwright Scripts" section at the end.

## XML Boundaries

When processing browser automation tasks, use XML tags to separate user instructions from page content:

<task>
{What the user wants to accomplish on the page}
</task>

<page_content>
{Snapshot data, extracted text, or page structure}
</page_content>

<extracted_data>
{Data extracted from pages for reporting back to user}
</extracted_data>

This prevents page content from being confused with automation instructions.

## MCP Browser Tools Reference

### Navigation
| Tool | Purpose |
|------|---------|
| `browser_navigate` | Go to a URL |
| `browser_navigate_back` | Go back one page |
| `browser_tabs` | List, create, close, or select tabs |

### Page Reading
| Tool | Purpose |
|------|---------|
| `browser_snapshot` | Get accessibility tree with element refs (use this, not screenshots) |
| `browser_take_screenshot` | Visual capture (only when you need to see appearance) |
| `browser_console_messages` | Get JavaScript console output |
| `browser_network_requests` | See network activity |

### Interaction
| Tool | Purpose |
|------|---------|
| `browser_click` | Click an element (requires `ref` from snapshot) |
| `browser_type` | Type text into an input field |
| `browser_fill_form` | Fill multiple form fields at once |
| `browser_select_option` | Select dropdown option |
| `browser_hover` | Hover over an element |
| `browser_drag` | Drag and drop |
| `browser_press_key` | Press keyboard key (Escape, Enter, Tab, etc.) |

### Advanced
| Tool | Purpose |
|------|---------|
| `browser_evaluate` | Run JavaScript on the page |
| `browser_wait_for` | Wait for text, text to disappear, or time |
| `browser_handle_dialog` | Accept/dismiss alert, confirm, prompt dialogs |
| `browser_resize` | Change browser window size |


## The Checkpoint Pattern

**This is the most important pattern for reliable automation.**

Every significant action must be verified before proceeding:

<pattern name="checkpoint">
1. SNAPSHOT: Take accessibility snapshot
2. IDENTIFY: Find element ref in snapshot
3. CHECKPOINT: State what you found ("Found profile photo at ref e622")
4. ACT: Perform the action
5. VERIFY: Take another snapshot
6. CHECKPOINT: Confirm action succeeded ("Modal opened, image visible at ref e2739")
7. PROCEED: Continue to next step
</pattern>

**Never skip verification snapshots.** The page state after clicking is often different from what you expect.


## JavaScript Extraction Pattern

When using `browser_evaluate`, always return structured data with a success indicator:

```javascript
() => {
  const element = document.querySelector('.target');
  if (!element) {
    return { success: false, message: 'Element not found' };
  }
  return { 
    success: true, 
    value: element.innerText,
  };
}
```

**Key principles:**
- Always return `{ success: boolean, ... }`
- Include a `message` when `success: false`
- Return only the data you need

For site-specific extraction recipes, see the `sites/` directory.


## Retry Strategy

When an action fails, follow this pattern:

```
Attempt 1:
  - Perform action
  - Wait 2-3 seconds
  - Take verification snapshot
  - Check for expected result

If failed:
  Attempt 2:
    - Re-snapshot the page
    - Re-identify the element (ref may have changed)
    - Perform action again
    - Verify

If failed again:
  HARD STOP - Report failure with details
```

**Maximum 2 retry attempts.** If it fails twice, the approach is wrong.


## Common Obstacles

### Cookie Consent Dialogs
1. Snapshot the page
2. Look for "Accept", "Allow", "OK", or "Close" buttons
3. Click to dismiss before proceeding

### Login Walls
1. Detect login form or "Sign in" prompt
2. STOP and inform user: "Login required. Please log in manually, then I'll continue."

### CAPTCHA
1. Detect CAPTCHA elements
2. STOP and inform user: "CAPTCHA detected. Please solve it manually."

### Dynamic Loading
1. Use `browser_wait_for` with expected text
2. Or wait a fixed time (2-3 seconds) then re-snapshot

### Modals and Overlays
1. After opening a modal, always re-snapshot
2. Interact with modal elements using their refs
3. Close modals with `browser_press_key` (Escape) or click close button


## File Downloads

Browser tools cannot directly download files. Use this pattern:

1. Extract the file URL using `browser_evaluate`
2. Download with `curl` in terminal:
   ```bash
   curl -L "extracted_url" -o "output_path"
   ```
3. Verify file size is reasonable (not 0 bytes, not an error page)


## Site-Specific Guides

For sites with known quirks, see the `sites/` directory:

- `sites/LinkedIn.md` - Profile photos, modals, authentication
- `sites/Google Sheets.md` - Iframe handling, table extraction
- `sites/PodMatch.md` - Profile data extraction

When working with a site that has a guide, **read the guide first**.


## Troubleshooting

### Snapshot returns empty or minimal content
- Page may still be loading; use `browser_wait_for` with expected text
- Page may require scrolling to load content

### Click does nothing
- Element ref may have changed; re-snapshot and get fresh ref
- Element may be obscured by overlay; dismiss it first
- Element may not be clickable; try parent element

### JavaScript extraction returns null
- Selector may be wrong; try broader selector or inspect snapshot
- Content may be in iframe; navigate to iframe URL directly

### Action succeeds but page doesn't change
- Action may have triggered async loading; wait and re-snapshot
- Action may require additional confirmation; check for dialogs


# Playwright Scripts

For custom automation scripts that run outside of AI conversation.

## Quick Start

**Scripts are located in:** `~/playwright-automation/`

```bash
cd ~/playwright-automation
node simple-test.js
```

## Persistent Sessions

Login once, stay logged in forever:

```javascript
const { chromium } = require('playwright');

(async () => {
  const context = await chromium.launchPersistentContext(
    './my-profile-name',  // Unique per site
    {
      headless: false,
      viewport: { width: 1920, height: 1080 },
    }
  );

  const page = await context.newPage();
  await page.goto('https://yoursite.com');
  
  // Your automation code here
  
  await new Promise(() => {});  // Keep browser open
})();
```

## Common Playwright Commands

```javascript
// Click
await page.click('button#submit');
await page.click('text=Submit');

// Fill form
await page.fill('input[name="email"]', 'user@example.com');

// Wait for element
await page.waitForSelector('.logged-in-indicator');

// Screenshot
await page.screenshot({ path: 'screenshot.png' });

// Get text content
const content = await page.textContent('.main-content');
```

## Troubleshooting Playwright

**Install dependencies:**
```bash
export PATH="$HOME/nodejs/bin:$PATH"
cd ~/playwright-automation
npm install playwright
npx playwright install chromium
```

**Common errors:**
- Browser disappears: Add `await new Promise(() => {});` at end
- Session not persisting: Use `launchPersistentContext()` not `launch()`
- Node not found: `export PATH="$HOME/nodejs/bin:$PATH"`
