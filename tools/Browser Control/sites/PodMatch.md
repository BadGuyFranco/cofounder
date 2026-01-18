# PodMatch Browser Automation

Site-specific patterns for automating PodMatch interactions.

**Base URL patterns:** `podmatch.com/guestdetailpreview/*`, `podmatch.com/hostdetailpreview/*`, `podmatch.com/member/*`, `podmatch.com/podcast/*`

**Script options:** Run `node scripts/<name>.js help` for detailed options.

## Capabilities

| Task | Capability |
|------|------------|
| Navigate to profiles | Yes |
| Read visible profile text | Yes (snapshot) |
| Extract profile photo URLs | Yes (execute.js) |
| Download high-res profile photos | Yes (click modal + download.js) |
| Extract structured data | Yes (execute.js) |

## Authentication

PodMatch may require login for some content.

**If you see a login prompt:**
1. STOP automation
2. Tell user: "PodMatch requires login. Please log in manually."
3. Wait for confirmation before continuing

## Profile Navigation

### Guest profile (public preview)

```bash
node scripts/navigate.js https://podmatch.com/guestdetailpreview/[profile-id]
node scripts/wait.js --time 2000
node scripts/snapshot.js
```

### Host/podcast profile (public preview)

```bash
node scripts/navigate.js https://podmatch.com/hostdetailpreview/[slug]
node scripts/wait.js --time 2000
node scripts/snapshot.js
```

## What's Visible in Snapshots

PodMatch guest profile snapshots typically contain:
- Guest name (h1 heading)
- Professional badge indicators
- One-page title/tagline
- Badges (Pro Member, Episode count, Review count)
- Guest tags (topic categories)
- Introduction text
- Call to action with URL
- About section
- Social media links
- Episode title ideas
- Ready-to-answer questions
- Noteworthy podcast appearances
- Reviews with ratings

## Extracting Profile Photo (Best Method)

PodMatch shows 400x400 thumbnails on the page. The full-resolution image is in a modal.

```bash
# 1. Click on a photo in "Guest's Approved Images" section
node scripts/click.js --selector "img[alt='Guest HD Photo 2']"

# 2. Wait for modal, extract full-res image URL
node scripts/wait.js --time 1500
node scripts/execute.js --code "document.querySelector('[role=\"dialog\"] img')?.src"

# 3. Download the full-res image
node scripts/download.js --url "<url-from-step-2>" --output ~/profile-photo.png
```

**URL pattern insight:** Thumbnails use `sm_...sm_...jpg` pattern. Full-res images drop the `sm_` prefixes and are typically PNG.

**Why click the HD photo:** The main profile pic and HD photos on the page are both thumbnails. Only by clicking to open the modal do you get the full resolution.

## Quick Thumbnail URL (Lower Resolution)

For a quick 400x400 thumbnail without opening the modal:

```bash
node scripts/execute.js --code "document.querySelector('img[alt=\"Guest\\'s Main Profile Pic\"]')?.src"
```

## Extracting Profile Data

```bash
# Get name
node scripts/execute.js --code "document.querySelector('h1')?.innerText.replace(/Professional Badge|Elite Badge/g, '').trim()"

# Get tagline
node scripts/execute.js --code "document.querySelector('h1 + p')?.innerText"

# Get introduction
node scripts/execute.js --code "Array.from(document.querySelectorAll('h2')).find(h => h.innerText === 'Introduction')?.nextElementSibling?.innerText"

# Get about text
node scripts/execute.js --code "Array.from(document.querySelectorAll('h2')).find(h => h.innerText.includes('About'))?.nextElementSibling?.innerText"

# Get guest tags
node scripts/execute.js --code "Array.from(document.querySelectorAll('h2')).find(h => h.innerText === 'Guest Tags')?.parentElement?.querySelectorAll('p').forEach(p => console.log(p.innerText))"
```

## Interacting with Profile Elements

### Message guest (requires login)

```bash
node scripts/click.js --text "Send This Guest A Message"
node scripts/wait.js --time 1000
node scripts/snapshot.js
```

### View all reviews

```bash
node scripts/click.js --text "See All Reviews"
node scripts/wait.js --time 1000
node scripts/snapshot.js
```

## Known Quirks

**Thumbnails on page:** Profile images visible on the page are 400x400 thumbnails with `sm_` prefix in URL. Click to open modal for full resolution.

**Modal structure:** When image modal opens, use `[role="dialog"]` to query modal-specific selectors.

**Dynamic content:** Profile sections load asynchronously. Wait 2+ seconds after navigation.

**Guest vs Host profiles:** URL patterns differ. Guest profiles use `guestdetailpreview`, host profiles use `hostdetailpreview`.

## Common Failures

| Failure | Cause | Fix |
|---------|-------|-----|
| Profile not found | Wrong URL pattern | Use `guestdetailpreview` or `hostdetailpreview` |
| Content missing | Still loading | Use `wait.js --time 2000` after navigation |
| No modal image | Modal didn't open | Click on HD photo in approved images section |
| Low-res image | Used thumbnail | Open modal, extract from `[role="dialog"] img` |
| Login required | Session expired | User must log in |

## Example: Full Profile Extraction

```bash
# 1. Navigate
node scripts/navigate.js https://podmatch.com/guestdetailpreview/[profile-id]

# 2. Wait for content
node scripts/wait.js --time 2000

# 3. Extract basic data via JavaScript
node scripts/execute.js --code "({
  name: document.querySelector('h1')?.innerText.replace(/Professional Badge|Elite Badge/g, '').trim(),
  tagline: document.querySelector('h1 + p')?.innerText
})"

# 4. Screenshot for reference
node scripts/screenshot.js --output ./podmatch-profile.png
```

## Example: Download High-Res Profile Photo

```bash
# 1. Navigate to profile
node scripts/navigate.js https://podmatch.com/guestdetailpreview/[profile-id]
node scripts/wait.js --time 2000

# 2. Open photo modal (click HD photo in approved images)
node scripts/click.js --selector "img[alt='Guest HD Photo 2']"
node scripts/wait.js --time 1500

# 3. Extract full-res URL from modal
node scripts/execute.js --code "document.querySelector('[role=\"dialog\"] img')?.src"

# 4. Download the file (use URL from step 3)
node scripts/download.js --url "<url-from-step-3>" --output ./profile-photo.png
```

This downloads the full-resolution PNG, not the 400x400 thumbnail.
