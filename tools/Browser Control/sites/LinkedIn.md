# LinkedIn Browser Automation

Site-specific patterns for automating LinkedIn interactions.

**Base URL patterns:** `linkedin.com/in/*`, `linkedin.com/company/*`, `linkedin.com/feed/*`

## Limitations on LinkedIn

LinkedIn automation has specific constraints:

| Task | MCP Capability |
|------|----------------|
| Navigate to profiles | Yes |
| Read visible profile data | Yes (from snapshot) |
| Click to open modals | Yes |
| Extract high-res photo URLs | **No** (requires JavaScript) |
| Extract structured data | **Partial** (visible text only) |

**For high-resolution profile photos:** Use Playwright scripts instead of MCP browser tools.


## Authentication

LinkedIn requires login for most content. The browser extension maintains session state.

**If you see a login wall:**
1. STOP automation
2. Inform user: "LinkedIn requires login. Please log in manually in the browser."
3. Wait for user confirmation before continuing


## Profile Navigation

### Navigate to a profile

```
1. browser_navigate: https://www.linkedin.com/in/username/
2. browser_wait_for: text containing the person's name
3. browser_snapshot
4. CHECKPOINT: "Profile loaded, found [name] in snapshot"
```

### What's visible in snapshots

LinkedIn profile snapshots typically contain:
- Person's name (usually in heading elements)
- Headline/title
- Current company
- Location
- Connection count
- "Connect" or "Message" button refs
- Navigation tabs (Posts, Activity, etc.)

### What's NOT visible in snapshots
- High-resolution image URLs (require JavaScript to extract)
- Detailed experience entries (may need to click "Show more")
- Email addresses (hidden until connected)
- Full "About" section (often truncated)


## Opening Profile Photo Modal

You can navigate to the profile photo modal, but extracting the high-res URL requires JavaScript.

**What you CAN do:**

```
1. browser_snapshot
2. Find profile photo button (look for "profile photo" or image near top)
3. CHECKPOINT: "Found profile photo element at ref [X]"
4. browser_click ref=[X]
5. browser_wait_for time=2
6. browser_snapshot
7. CHECKPOINT: "Modal opened" or "Modal did not open"
```

**What you CANNOT do:**
- Extract the actual image URL from the modal (requires `document.querySelector`)
- Download the image programmatically

**Alternative:** If user needs the profile photo, instruct them to:
1. Right-click the image in the modal
2. Select "Copy image address" or "Save image as"


## Extracting Visible Profile Data

From snapshots, you can extract:

**Name and headline:**
- Look for heading text at top of snapshot
- Headline usually follows name

**Current position:**
- Look for company name near headline
- May include job title

**Connection status:**
- Look for "Connect", "Message", "Follow", or "Pending" buttons

**Example checkpoint:**
```
CHECKPOINT: "Profile data from snapshot:
- Name: John Smith
- Headline: VP of Engineering at TechCorp
- Has 'Message' button (already connected)"
```


## Interacting with Profile Elements

### Send connection request

```
1. browser_snapshot
2. Find "Connect" button ref
3. browser_click ref=[connect button]
4. browser_wait_for time=1
5. browser_snapshot
6. Look for "Add a note" or "Send" button
7. browser_click to send (or click "Add a note" first)
```

### View full experience

```
1. browser_snapshot
2. Look for "Show all experiences" or similar link
3. browser_click ref=[show more link]
4. browser_wait_for time=1
5. browser_snapshot
6. CHECKPOINT: "Expanded experience section visible"
```


## Known Quirks

### Profile photo button varies
Sometimes it's a `button`, sometimes an `img` wrapped in a clickable container. Look for:
- Elements near the top-left of the profile
- Elements with "photo" or "image" in their accessible name

### Content loads dynamically
After initial page load, some sections load asynchronously. Always use `browser_wait_for` with expected text before snapshotting.

### Modal structure
When a modal opens, the snapshot will show the modal content overlaying the page. Look for dialog or modal elements in the accessibility tree.

### Rate limiting
LinkedIn may throttle or block if you make too many requests. If you encounter:
- Blank pages
- "Something went wrong" errors
- Repeated login prompts

STOP and wait before continuing. Inform user of rate limiting.


## Common Failures and Fixes

| Failure | Cause | Fix |
|---------|-------|-----|
| Profile not found | Wrong URL format | Ensure URL starts with `linkedin.com/in/` |
| Content missing | Page still loading | Use `browser_wait_for` with expected text |
| Click does nothing | Wrong element ref | Re-snapshot, find correct ref |
| Modal won't open | Element obscured | Look for cookie banner, dismiss first |
| Logged out unexpectedly | Session expired | User must log in again |


## Example: Profile Data Extraction Workflow

```
1. browser_navigate: https://www.linkedin.com/in/username/
2. browser_wait_for: text="Experience" (indicates profile loaded)
3. browser_snapshot
   CHECKPOINT: "Page loaded. Found:
   - Name: Jane Doe
   - Headline: Product Manager at StartupCo
   - Location: San Francisco Bay Area
   - Connect button at ref e423"

4. Report extracted data to user
```

**For photo extraction, inform user:**
"I can navigate to the profile and open the photo modal, but extracting the image URL requires JavaScript which isn't available in MCP browser tools. You can right-click the image to save it, or I can write a Playwright script for automated extraction."
