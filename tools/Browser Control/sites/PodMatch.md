# PodMatch Browser Automation

Site-specific patterns for automating PodMatch interactions.

**Base URL patterns:** `podmatch.com/guestdetailpreview/*`, `podmatch.com/hostdetailpreview/*`, `podmatch.com/member/*`, `podmatch.com/podcast/*`

## Capabilities

| Task | Capability |
|------|------------|
| Navigate to profiles | Yes |
| Read visible profile text | Yes (snapshot) |
| Extract profile photo URLs | Yes (run_code) |
| Download high-res profile photos | Yes (click modal + run_code) |
| Extract structured data | Yes (run_code) |

## Authentication

PodMatch may require login for some content.

**If you see a login prompt:**
1. STOP automation
2. Tell user: "PodMatch requires login. Please log in manually."
3. Wait for confirmation before continuing

## Profile Navigation

### Guest profile (public preview)

1. `browser_navigate` to `https://podmatch.com/guestdetailpreview/[profile-id]`
2. `browser_snapshot` to read the profile

### Host/podcast profile (public preview)

1. `browser_navigate` to `https://podmatch.com/hostdetailpreview/[slug]`
2. `browser_snapshot` to read the profile

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

1. `browser_snapshot` to find the HD photo in "Guest's Approved Images" section
2. `browser_click` the photo ref (e.g., img with alt "Guest HD Photo 2")
3. `browser_snapshot` to see the modal
4. `browser_run_code` with: `document.querySelector('[role="dialog"] img')?.src`
5. Use the returned URL to download the full-resolution image

**URL pattern insight:** Thumbnails use `sm_...sm_...jpg` pattern. Full-res images drop the `sm_` prefixes and are typically PNG.

**Why click the HD photo:** The main profile pic and HD photos on the page are both thumbnails. Only by clicking to open the modal do you get the full resolution.

## Quick Thumbnail URL (Lower Resolution)

For a quick 400x400 thumbnail without opening the modal:

`browser_run_code` with: `document.querySelector('img[alt="Guest\'s Main Profile Pic"]')?.src`

## Extracting Profile Data

Use `browser_run_code` with JavaScript:

```javascript
// Get name
document.querySelector('h1')?.innerText.replace(/Professional Badge|Elite Badge/g, '').trim()

// Get tagline
document.querySelector('h1 + p')?.innerText

// Get introduction
Array.from(document.querySelectorAll('h2')).find(h => h.innerText === 'Introduction')?.nextElementSibling?.innerText

// Get about text
Array.from(document.querySelectorAll('h2')).find(h => h.innerText.includes('About'))?.nextElementSibling?.innerText
```

## Interacting with Profile Elements

### Message guest (requires login)

1. `browser_snapshot` to find the "Send This Guest A Message" button
2. `browser_click` its ref
3. `browser_snapshot` to see the message form

### View all reviews

1. `browser_click` the "See All Reviews" ref from snapshot
2. `browser_snapshot` to read reviews

## Known Quirks

**Thumbnails on page:** Profile images visible on the page are 400x400 thumbnails with `sm_` prefix in URL. Click to open modal for full resolution.

**Modal structure:** When image modal opens, snapshot will include modal content. Use `[role="dialog"]` in run_code selectors for modal-specific queries.

**Dynamic content:** Profile sections load asynchronously. If snapshot is missing sections, re-snapshot after a moment.

**Guest vs Host profiles:** URL patterns differ. Guest profiles use `guestdetailpreview`, host profiles use `hostdetailpreview`.

## Common Failures

| Failure | Cause | Fix |
|---------|-------|-----|
| Profile not found | Wrong URL pattern | Use `guestdetailpreview` or `hostdetailpreview` |
| Content missing | Still loading | Re-snapshot |
| No modal image | Modal didn't open | Click on HD photo in approved images section |
| Low-res image | Used thumbnail | Open modal, extract from `[role="dialog"] img` |
| Login required | Session expired | User must log in |

## Example: Full Profile Extraction

1. `browser_navigate` to `https://podmatch.com/guestdetailpreview/[profile-id]`
2. `browser_snapshot` to read the profile
3. `browser_run_code` to extract structured data:
   ```javascript
   ({
     name: document.querySelector('h1')?.innerText.replace(/Professional Badge|Elite Badge/g, '').trim(),
     tagline: document.querySelector('h1 + p')?.innerText
   })
   ```
4. `browser_take_screenshot` for visual reference

## Example: Download High-Res Profile Photo

1. `browser_navigate` to `https://podmatch.com/guestdetailpreview/[profile-id]`
2. `browser_snapshot` to find the HD photo
3. `browser_click` the HD photo ref (alt "Guest HD Photo 2")
4. `browser_run_code` with: `document.querySelector('[role="dialog"] img')?.src`
5. Use the returned URL to download the full-resolution PNG
