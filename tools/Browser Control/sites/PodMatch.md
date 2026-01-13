# PodMatch Browser Automation

Site-specific patterns for automating PodMatch interactions.

**Base URL patterns:** `podmatch.com/member/*`, `podmatch.com/podcast/*`

## Limitations on PodMatch

| Task | MCP Capability |
|------|----------------|
| Navigate to profiles | Yes |
| Read visible profile text | Yes (from snapshot) |
| Extract image URLs | **No** (requires JavaScript) |
| Click profile elements | Yes |

**For image URL extraction:** Use Playwright scripts.


## Authentication

PodMatch may require login for some content.

**If you see a login prompt:**
1. STOP automation
2. Inform user: "PodMatch requires login. Please log in manually in the browser."
3. Wait for user confirmation before continuing


## Profile Navigation

### Navigate to a member profile

```
1. browser_navigate: https://podmatch.com/member/username
2. browser_wait_for time=2
3. browser_snapshot
4. CHECKPOINT: "Profile loaded, found [name/content indicator]"
```

### Navigate to a podcast profile

```
1. browser_navigate: https://podmatch.com/podcast/podcastname
2. browser_wait_for time=2
3. browser_snapshot
4. CHECKPOINT: "Podcast profile loaded"
```


## What's Visible in Snapshots

PodMatch profile snapshots typically contain:
- Member/podcast name (heading elements)
- Bio or description text
- Categories or topics
- Social media links (if displayed as text)
- "Connect" or action button refs

### What's NOT reliably visible:
- Profile image URLs (require JavaScript to extract from `img.src` or CSS background)
- Detailed statistics
- Private contact information


## Extracting Visible Profile Data

From snapshots, report what's visible:

```
CHECKPOINT: "Profile data from snapshot:
- Name: [visible name]
- Bio: [visible bio text, may be truncated]
- Topics: [any visible categories]
- Action buttons: [Connect, Message, etc. with refs]"
```


## Profile Photo Limitations

**Unlike LinkedIn, PodMatch typically displays photos directly (no modal).** However:

- Image URLs still require JavaScript to extract
- Profile photos may be CSS background images (not `img` tags)
- Lazy loading may show placeholder URLs

**What you CAN do:**
1. Navigate to profile
2. Confirm image is visually present (via screenshot)
3. Report that manual download is needed

**What you CANNOT do:**
- Extract the image URL programmatically
- Download the image automatically

**User instructions for manual download:**
"I can navigate to the profile, but extracting the image URL requires JavaScript. To save the image manually:
1. Right-click the profile image
2. Select 'Save image as' or 'Copy image address'
Or I can write a Playwright script for automated extraction."


## Interacting with Profile Elements

### Send connection request

```
1. browser_snapshot
2. Find "Connect" or "Request Match" button ref
3. browser_click ref=[button ref]
4. browser_wait_for time=1
5. browser_snapshot
6. CHECKPOINT: "Connection request sent" or "Follow-up action required"
```


## Known Quirks

### Images may be lazy-loaded
If the snapshot or screenshot shows a placeholder, the actual image may not have loaded yet. Try:
1. `browser_wait_for time=3`
2. Re-snapshot

### Background images
Some profile photos are CSS background images rather than `img` tags. These won't appear in accessibility snapshots at all.

### Dynamic content
Profile sections may load asynchronously. Use `browser_wait_for` with expected text.


## Common Failures and Fixes

| Failure | Cause | Fix |
|---------|-------|-----|
| Profile not found | Wrong URL format | Check URL structure |
| Content missing | Page still loading | Wait longer, re-snapshot |
| No image visible | Lazy loading | Wait, re-snapshot |
| Login required | Session expired | User must log in |


## Example: Profile Inspection Workflow

```
1. browser_navigate: https://podmatch.com/member/username
2. browser_wait_for time=2
3. browser_snapshot
   CHECKPOINT: "Page loaded. Found:
   - Name: Alex Johnson
   - Bio: 'Podcast host covering tech and startups...'
   - Connect button at ref e156"

4. browser_take_screenshot  # For visual reference
   CHECKPOINT: "Screenshot captured showing profile layout and photo"

5. Report to user: "Profile found for Alex Johnson. I can see their bio
   and profile photo in the browser. To extract the image URL for download,
   I would need to use a Playwright script with JavaScript execution."
```


## When to Use What

| Need | Tool |
|------|------|
| View profile content | MCP browser (snapshot) |
| Visual reference | MCP browser (screenshot) |
| Extract image URLs | Playwright scripts |
| Automated data collection | Playwright scripts |
| Send connection request | MCP browser (click) |
