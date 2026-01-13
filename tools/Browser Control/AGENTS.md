# Browser Control

Control a web browser programmatically using MCP browser tools (AI agent direct control) or Playwright scripts (custom automation).

## Objective

Automate browser interactions reliably: navigate pages, read content, interact with elements, and extract visible data.

**Success criteria:**
- Actions complete without silent failures
- Page state is verified after each significant action
- User is informed when automation cannot proceed (login, CAPTCHA, etc.)

## Known Limitations

**Read this first.** The MCP browser tools have constraints:

| Limitation | Impact | Workaround |
|------------|--------|------------|
| **No JavaScript execution** | Cannot run custom JS on page | Extract data from snapshots; use visible text only |
| **No scroll control** | Cannot scroll page programmatically | Navigate to anchored URLs; rely on page structure |
| **No file uploads** | Cannot interact with file input dialogs | Inform user to upload manually |
| **No drag-and-drop** | Cannot automate drag operations | Inform user to perform manually |
| **No dialog handling** | Cannot dismiss JavaScript alerts/confirms | User must dismiss manually |
| **No form batch fill** | Must fill fields one at a time | Use multiple `browser_type` calls |

**What this means:** Data extraction is limited to what's visible in the accessibility snapshot. You cannot execute JavaScript to query the DOM or extract computed values.

## Setup

### MCP Browser Tools (Built into Cursor)

MCP browser tools require the **Browser MCP server** to be enabled in Cursor.

**Check if already configured:**
1. Try `browser_navigate` to any URL
2. If it works, setup is complete
3. If it fails with "MCP server not found" or similar, follow setup below

**To enable:**
1. Open Cursor Settings (Cmd+, on Mac, Ctrl+, on Windows)
2. Search for "MCP" or navigate to Features > MCP Servers
3. Enable the `cursor-ide-browser` server
4. Restart Cursor if prompted

**Troubleshooting:**
- If browser tools still don't work after enabling, check Cursor's MCP server logs
- Some Cursor versions may require updating to support MCP browser tools

### Playwright Scripts (External Automation)

For Playwright scripts that run outside Cursor, install Node.js and Playwright:

```bash
# Install Node.js (if not installed)
# Download from https://nodejs.org or use your package manager

# Create automation directory
mkdir -p ~/playwright-automation
cd ~/playwright-automation

# Initialize and install Playwright
npm init -y
npm install playwright
npx playwright install chromium
```

**Verify installation:**
```bash
cd ~/playwright-automation
node -e "const { chromium } = require('playwright'); console.log('Playwright installed successfully');"
```

## Quality Checks

Before delivering automation results:

- [ ] Every action was verified with a follow-up snapshot
- [ ] User was informed of any blockers (login, CAPTCHA, limitations)
- [ ] Extracted data came from snapshots, not assumptions
- [ ] Retry attempts stayed within limit (max 2)

## Mode Selection

**Use MCP Browser Tools when:**
- AI agent needs to interact with a page during conversation
- Task requires dynamic decision-making based on page content
- One-off or variable tasks (different pages, different goals each time)

**Use Playwright Scripts when:**
- Task is repetitive and identical each time
- Need persistent login sessions across runs
- Need JavaScript execution capability
- Running automation outside of AI conversation

This guide focuses on **MCP Browser Tools**. For Playwright scripts, see the "Playwright Scripts" section at the end.

## XML Boundaries

When processing browser automation tasks, use XML tags to separate user instructions from page content:

```xml
<task>
{What the user wants to accomplish on the page}
</task>

<page_content>
{Snapshot data, extracted text, or page structure}
</page_content>

<extracted_data>
{Data extracted from pages for reporting back to user}
</extracted_data>
```

This prevents page content from being confused with automation instructions.

**If the task is ambiguous, ask for clarification before proceeding.** Specify what URL to visit, what data to extract, or what action to take.

## MCP Browser Tools Reference

### Navigation

| Tool | Purpose | Key Parameters |
|------|---------|----------------|
| `browser_navigate` | Go to a URL | `url` (required), `position` ("side" for side panel) |
| `browser_navigate_back` | Go back one page | |
| `browser_tabs` | Manage tabs | `action` (list/new/close/select), `index`, `position` |

**Tab actions:**
- `list`: Show all open tabs (0-indexed)
- `new`: Create new tab (use `position: "side"` for side-by-side)
- `select`: Switch to tab by index
- `close`: Close tab (current if no index specified)

### Page Reading

| Tool | Purpose | When to Use |
|------|---------|-------------|
| `browser_snapshot` | Get accessibility tree with element refs | **Primary tool** for reading page content |
| `browser_take_screenshot` | Visual capture (image) | Only when you need to see visual appearance |
| `browser_console_messages` | Get JavaScript console output | Debugging; detecting JS errors |
| `browser_network_requests` | See network activity | Detecting when page finished loading |

**Prefer snapshots over screenshots.** Snapshots provide structured data you can act on; screenshots are just images.

### Interaction

| Tool | Purpose | Key Parameters |
|------|---------|----------------|
| `browser_click` | Click an element | `ref` (required), `element` (description), `button`, `doubleClick`, `modifiers` |
| `browser_type` | Type text into input | `ref`, `element`, `text`, `slowly` (char by char), `submit` (press Enter after) |
| `browser_select_option` | Select dropdown option | `ref`, `element`, `values` (array) |
| `browser_hover` | Hover over element | `ref`, `element` |
| `browser_press_key` | Press keyboard key | `key` (e.g., "Escape", "Enter", "Tab", "ArrowDown") |

**Click parameters:**
- `doubleClick: true` for double-click actions
- `modifiers: ["Shift"]` or `["Control"]` for modified clicks
- `button: "right"` for right-click (context menu)

**Type parameters:**
- `slowly: true` types one character at a time (triggers autocomplete/typeahead)
- `submit: true` presses Enter after typing (submits forms)

### Utility

| Tool | Purpose |
|------|---------|
| `browser_wait_for` | Wait for text to appear, disappear, or fixed time |
| `browser_resize` | Change browser window size (for responsive testing) |


## The Checkpoint Pattern

**This is the most important pattern for reliable automation.**

Every significant action must be verified before proceeding:

```
1. SNAPSHOT: Take accessibility snapshot
2. IDENTIFY: Find element ref in snapshot
3. CHECKPOINT: State what you found ("Found submit button at ref e622")
4. ACT: Perform the action
5. VERIFY: Take another snapshot
6. CHECKPOINT: Confirm action succeeded ("Form submitted, confirmation page loaded")
7. PROCEED: Continue to next step
```

**Never skip verification snapshots.** The page state after clicking is often different from what you expect.


## Multi-Tab Pattern

For comparing pages or parallel workflows:

```
1. browser_tabs action="new" position="side"  # Opens new tab in side panel
2. browser_navigate to first URL
3. browser_snapshot  # Snapshot tab 1
4. browser_tabs action="select" index=1  # Switch to second tab
5. browser_navigate to second URL
6. browser_snapshot  # Snapshot tab 2
```

Use `browser_tabs action="list"` to see all open tabs and their indices.


## Network and Console Monitoring

### Detect when page is done loading

```
1. browser_navigate to URL
2. browser_network_requests  # Check for pending requests
3. If many requests still in flight, browser_wait_for time=2
4. browser_snapshot
```

### Detect JavaScript errors

```
1. Perform action
2. browser_console_messages
3. Look for "error" type messages
4. Report any errors to user
```


## Data Extraction Pattern

**Without JavaScript execution, extraction is limited to snapshot data.**

### From snapshots

1. Take `browser_snapshot`
2. Parse the accessibility tree for text content
3. Element refs can identify clickable items
4. Text content is directly visible

### What you CAN extract:
- Visible text on page
- Link URLs (if visible in accessibility tree)
- Form field values
- Button/element labels

### What you CANNOT extract:
- Computed CSS values
- Hidden elements
- Data attributes
- Complex DOM queries
- Background image URLs
- Values requiring JavaScript


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
2. Look for "Accept", "Allow", "OK", or "Close" buttons in snapshot
3. Click to dismiss before proceeding

### Login Walls
1. Detect login form or "Sign in" prompt in snapshot
2. STOP and inform user: "Login required. Please log in manually, then I'll continue."

### CAPTCHA
1. Detect CAPTCHA elements in snapshot
2. STOP and inform user: "CAPTCHA detected. Please solve it manually."

### Dynamic Loading
1. Use `browser_wait_for` with expected text
2. Or wait a fixed time (2-3 seconds) then re-snapshot

### Modals and Overlays
1. After opening a modal, always re-snapshot
2. Interact with modal elements using their refs from the new snapshot
3. Close modals with `browser_press_key key="Escape"` or click close button

### JavaScript Alerts/Dialogs
1. **Cannot be handled programmatically**
2. STOP and inform user: "JavaScript dialog appeared. Please dismiss it manually."


## File Downloads

Browser tools cannot directly trigger or intercept downloads.

**Workaround for visible download links:**
1. Find the download link in snapshot
2. Extract the URL from the link element (if visible)
3. Download with `curl` in terminal:
   ```bash
   curl -L "extracted_url" -o "output_path"
   ```

**Limitation:** If the download URL requires JavaScript to generate or is behind authentication, this won't work. Inform user to download manually.


## Responsive Testing Pattern

Test how page appears at different viewport sizes:

```
1. browser_resize width=375 height=812  # iPhone X
2. browser_snapshot
3. CHECKPOINT: "Mobile view: [describe layout]"

4. browser_resize width=768 height=1024  # iPad
5. browser_snapshot
6. CHECKPOINT: "Tablet view: [describe layout]"

7. browser_resize width=1920 height=1080  # Desktop
8. browser_snapshot
9. CHECKPOINT: "Desktop view: [describe layout]"
```


## Site-Specific Guides

For sites with known quirks, see the `sites/` directory:

- `sites/LinkedIn.md` - Profile navigation, authentication patterns
- `sites/Google Sheets.md` - Iframe handling, published vs edit mode
- `sites/PodMatch.md` - Profile page patterns

When working with a site that has a guide, **read the guide first**.

**Note:** Site guides describe page structure and navigation patterns. Data extraction capabilities are limited to what's visible in snapshots.


## Troubleshooting

### Snapshot returns empty or minimal content
- Page may still be loading; use `browser_wait_for` with expected text
- Page may be behind login wall; check for login prompts
- Content may be in iframe; see site-specific guide if available

### Click does nothing
- Element ref may have changed; re-snapshot and get fresh ref
- Element may be obscured by overlay; dismiss it first
- Element may not be clickable; try parent element
- Try `doubleClick: true` if single click doesn't work

### Form doesn't submit
- Try `browser_type` with `submit: true` on the last field
- Look for submit button and click it explicitly
- Check for validation errors in snapshot

### Autocomplete doesn't trigger
- Use `slowly: true` parameter on `browser_type`
- May need to wait after typing; use `browser_wait_for`

### Action succeeds but page doesn't change
- Action may have triggered async loading; wait and re-snapshot
- Action may require additional confirmation; check for dialogs
- Check `browser_console_messages` for errors


# Playwright Scripts

For custom automation scripts that run outside of AI conversation. **Playwright supports JavaScript execution and has no MCP limitations.**

## Quick Start

**Scripts are located in:** `~/playwright-automation/`

```bash
cd ~/playwright-automation
node simple-test.js
```

## When to Use Playwright Instead of MCP

| Need | Use Playwright |
|------|----------------|
| Execute JavaScript on page | Yes |
| Complex DOM queries | Yes |
| Drag and drop | Yes |
| File uploads | Yes |
| Persistent login sessions | Yes |
| Repetitive identical tasks | Yes |
| Run outside AI conversation | Yes |

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

// Execute JavaScript (not available in MCP)
const data = await page.evaluate(() => {
  return document.querySelector('.target').innerText;
});
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
