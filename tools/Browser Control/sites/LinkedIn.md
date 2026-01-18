# LinkedIn Browser Automation

Site-specific patterns for automating LinkedIn interactions.

**Base URL patterns:** `linkedin.com/in/*`, `linkedin.com/company/*`, `linkedin.com/feed/*`

**Script options:** Run `node scripts/<name>.js help` for detailed options.

## Capabilities

| Task | Capability |
|------|------------|
| Navigate to profiles | Yes |
| Read visible profile data | Yes (snapshot) |
| Click to open modals | Yes |
| Extract profile photo URLs | Yes (execute.js) |
| Extract structured data | Yes (execute.js) |

## Authentication

LinkedIn requires login for most content. Profile data persists between sessions.

**If you see a login wall:**
1. STOP automation
2. Tell user: "LinkedIn requires login. Please log in manually in the browser."
3. Wait for confirmation before continuing

## Profile Navigation

```bash
# Navigate to profile
node scripts/navigate.js https://www.linkedin.com/in/username/

# Wait for content to load
node scripts/wait.js --time 2000

# Read profile
node scripts/snapshot.js
```

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

```bash
# 1. Click the profile photo button to open modal
node scripts/click.js --selector "button[aria-label='open profile picture']"

# 2. Wait for modal, extract 800x800 image URL
node scripts/wait.js --time 1500
node scripts/execute.js --code "document.querySelector('[role=\"dialog\"] img')?.src"

# 3. Download actual file (not screenshot) using browser auth
node scripts/download.js --url "<url-from-step-2>" --output ~/profile-photo.jpg
```

This gets the actual JPEG file at full resolution, not a re-encoded screenshot.

**Why this selector:** The `aria-label` selector is reliable across profile types (your own vs. others). Class-based selectors like `button.profile-photo-edit__edit-btn` only appear on your own profile's edit mode.

**Confirmation:** When the modal opens, the URL changes to include `/overlay/photo/`.

## Extracting Structured Data

```bash
# Get name
node scripts/execute.js --code "document.querySelector('h1')?.innerText"

# Get headline
node scripts/execute.js --code "document.querySelector('.text-body-medium')?.innerText"

# Get all experience entries
node scripts/execute.js --code "Array.from(document.querySelectorAll('.experience-item')).map(e => e.innerText)"
```

## Interacting with Profile Elements

### Send connection request

```bash
node scripts/click.js --text "Connect"
node scripts/wait.js --time 1000
node scripts/snapshot.js
# Look for "Send" or "Add a note" in snapshot
node scripts/click.js --text "Send"
```

### View full experience

```bash
node scripts/click.js --text "Show all"
node scripts/wait.js --time 1000
node scripts/snapshot.js
```

## Known Quirks

**Content loads dynamically:** Always wait after navigation before taking snapshot.

**Modal structure:** When modal opens, use `[role="dialog"]` to query modal-specific selectors.

**Rate limiting:** If you see blank pages or errors, STOP and wait. Tell user about rate limiting.

**Photo modal URL:** When the profile photo modal opens, the URL changes to include `/overlay/photo/`. Use this to confirm the modal opened.

## Common Failures

| Failure | Cause | Fix |
|---------|-------|-----|
| Profile not found | Wrong URL | Ensure URL starts with `linkedin.com/in/` |
| Content missing | Still loading | Use `wait.js --time 2000` after navigation |
| Click does nothing | Wrong selector | Use snapshot to find correct element |
| Photo button timeout | Class-based selector | Use `button[aria-label='open profile picture']` |
| Logged out | Session expired | User must log in again |

## Example: Full Profile Extraction

```bash
# 1. Navigate
node scripts/navigate.js https://www.linkedin.com/in/username/

# 2. Wait for load
node scripts/wait.js --time 2000

# 3. Extract basic data via JavaScript
node scripts/execute.js --code "({
  name: document.querySelector('h1')?.innerText,
  headline: document.querySelector('.text-body-medium')?.innerText
})"

# 4. Screenshot for reference
node scripts/screenshot.js --output ./linkedin-profile.png
```

## Example: Download High-Res Profile Photo

```bash
# 1. Navigate to profile
node scripts/navigate.js https://www.linkedin.com/in/username/
node scripts/wait.js --time 2000

# 2. Open photo modal
node scripts/click.js --selector "button[aria-label='open profile picture']"
node scripts/wait.js --time 1500

# 3. Extract high-res URL
node scripts/execute.js --code "document.querySelector('[role=\"dialog\"] img')?.src"

# 4. Download the file (use URL from step 3)
node scripts/download.js --url "<url-from-step-3>" --output ./profile-photo.jpg
```

This downloads the actual 800x800 JPEG, not a screenshot.
