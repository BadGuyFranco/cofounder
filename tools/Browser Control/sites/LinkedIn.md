# LinkedIn Browser Automation

Site-specific patterns for automating LinkedIn interactions.

**Base URL patterns:** `linkedin.com/in/*`, `linkedin.com/company/*`, `linkedin.com/feed/*`

## Capabilities

| Task | Capability |
|------|------------|
| Navigate to profiles | Yes |
| Read visible profile data | Yes (snapshot) |
| Click to open modals | Yes |
| Extract profile photo URLs | Yes (run_code) |
| Extract structured data | Yes (run_code) |

## Authentication

LinkedIn requires login for most content. Profile data persists between sessions.

**If you see a login wall:**
1. STOP automation
2. Tell user: "LinkedIn requires login. Please log in manually in the browser."
3. Wait for confirmation before continuing

## Profile Navigation

1. `browser_navigate` to `https://www.linkedin.com/in/username/`
2. `browser_snapshot` to read the profile

**Checkpoint:** Verify name and headline appear in snapshot.

**Tip:** Use `/in/me/` to navigate to your own profile.

## What's Visible in Snapshots

LinkedIn profile snapshots typically contain:
- Person's name (heading elements)
- Headline/title
- Current company
- Location
- Connection count
- Connect/Message button info
- Navigation tabs (Posts, Activity, etc.)

## Extracting Profile Photo (Best Method)

The highest resolution photo is in the profile photo modal. This method works for both your own profile and other people's profiles.

1. `browser_snapshot` to find the profile photo button
2. `browser_click` the button with `aria-label='open profile picture'` (use ref from snapshot)
3. `browser_snapshot` to read the modal content
4. `browser_run_code` with: `document.querySelector('[role="dialog"] img')?.src`
5. Download the URL from the result (this is the full 800x800 JPEG)

**Why the aria-label selector:** It is reliable across profile types (your own vs. others). Class-based selectors like `button.profile-photo-edit__edit-btn` only appear on your own profile's edit mode.

**Confirmation:** When the modal opens, the URL changes to include `/overlay/photo/`.

## Extracting Structured Data

Use `browser_run_code` with JavaScript:

```javascript
// Get name
document.querySelector('h1')?.innerText

// Get headline
document.querySelector('.text-body-medium')?.innerText

// Get all experience entries
Array.from(document.querySelectorAll('.experience-item')).map(e => e.innerText)
```

## Interacting with Profile Elements

### Send connection request

1. `browser_snapshot` to find the Connect button
2. `browser_click` the Connect button ref
3. `browser_snapshot` to see Send/Add a note options
4. `browser_click` Send

### View full experience

1. `browser_click` the "Show all" link ref from snapshot
2. `browser_snapshot` to read expanded content

## Known Quirks

**Content loads dynamically:** Always snapshot after navigation. Playwright MCP handles waiting automatically, but LinkedIn's lazy loading may require scrolling to reveal content.

**Modal structure:** When modal opens, snapshot will include modal content. Use `[role="dialog"]` in run_code selectors for modal-specific queries.

**Rate limiting:** If you see blank pages or errors, STOP and wait. Tell user about rate limiting.

**Photo modal URL:** When the profile photo modal opens, the URL changes to include `/overlay/photo/`. Use this to confirm the modal opened.

## Common Failures

| Failure | Cause | Fix |
|---------|-------|-----|
| Profile not found | Wrong URL | Ensure URL starts with `linkedin.com/in/` |
| Content missing | Still loading | Re-snapshot; scroll down if content is below fold |
| Click does nothing | Stale ref | Take fresh snapshot, use new ref |
| Photo button not found | Wrong selector | Look for `open profile picture` in snapshot |
| Logged out | Session expired | User must log in again |

## Example: Full Profile Extraction

1. `browser_navigate` to `https://www.linkedin.com/in/username/`
2. `browser_snapshot` to read the profile
3. `browser_run_code` to extract structured data:
   ```javascript
   ({
     name: document.querySelector('h1')?.innerText,
     headline: document.querySelector('.text-body-medium')?.innerText
   })
   ```
4. `browser_take_screenshot` for visual reference

## Example: Download High-Res Profile Photo

1. `browser_navigate` to `https://www.linkedin.com/in/username/`
2. `browser_snapshot` to find the profile photo button
3. `browser_click` the profile photo button ref
4. `browser_run_code` with: `document.querySelector('[role="dialog"] img')?.src`
5. Use the returned URL to download the full 800x800 JPEG
