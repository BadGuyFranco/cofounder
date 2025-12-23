# LinkedIn Browser Automation

Site-specific patterns for automating LinkedIn interactions.

**Base URL patterns:** `linkedin.com/in/*`, `linkedin.com/company/*`, `linkedin.com/feed/*`


## Authentication

LinkedIn requires login for most content. The browser extension maintains session state.

**If you see a login wall:**
1. STOP automation
2. Inform user: "LinkedIn requires login. Please log in manually in the browser."
3. Wait for user confirmation before continuing


## Profile Photo Extraction

LinkedIn profile photos require clicking to get the high-resolution version.

### Step-by-Step Process

**1. Navigate and snapshot**
```
browser_navigate to profile URL
browser_snapshot
```

**2. Find the profile photo button**

Look in the snapshot for:
- `button` with text "open profile photo" or similar
- `img` with alt text containing the person's name
- Element near the top-left of the profile

**CHECKPOINT:** State the exact ref found (e.g., "Found profile photo button at ref e622")

**3. Click to open modal**
```
browser_click with the identified ref
browser_wait_for 2-3 seconds
browser_snapshot
```

**4. Verify modal opened**

Look in the new snapshot for:
- `dialog` or `[role="dialog"]` element
- `figure "Profile image"` or similar
- Larger image element inside

**CHECKPOINT:** Confirm modal is open ("Modal opened, found figure at ref e2739")

**If modal NOT detected:**
- Click again (ref may have changed; use fresh ref from snapshot)
- Maximum 2 attempts, then HARD STOP

**5. Extract high-resolution URL**

```javascript
// browser_evaluate
() => {
  const images = Array.from(document.querySelectorAll('img'))
    .filter(img => img.src && img.src.includes('licdn.com'))
    .filter(img => img.naturalWidth >= 200)
    .sort((a, b) => b.naturalWidth - a.naturalWidth);
  
  if (images.length > 0) {
    return { 
      success: true, 
      url: images[0].src,
      width: images[0].naturalWidth,
      height: images[0].naturalHeight
    };
  }
  return { success: false, message: 'No suitable image found' };
}
```

**Verify the URL contains high-res indicator:**
- Good: `profile-displayphoto-crop_800_800` (high-res)
- Bad: `profile-displayphoto-shrink_100_100` (thumbnail)

**6. Download the image**

```bash
curl -L "extracted_url" -o "output_path.jpg"
```

Verify file size is >50KB (thumbnails are smaller).

**7. Close modal**

```
browser_press_key Escape
```


## Profile Data Extraction

### Get name and headline
```javascript
() => {
  const name = document.querySelector('h1')?.innerText?.trim();
  const headline = document.querySelector('.text-body-medium')?.innerText?.trim();
  return { success: !!name, name, headline };
}
```

### Get current position
```javascript
() => {
  const experience = document.querySelector('#experience');
  if (!experience) return { success: false };
  const firstRole = experience.closest('section')?.querySelector('li');
  const title = firstRole?.querySelector('span[aria-hidden="true"]')?.innerText;
  const company = firstRole?.querySelectorAll('span[aria-hidden="true"]')?.[1]?.innerText;
  return { success: !!title, title, company };
}
```


## Known Quirks

### Profile photo button is not always a button
Sometimes it's an `img` wrapped in a clickable container. Look for:
- Direct `button` element with profile photo
- `img` element that's clickable (has click handler)
- Parent `div` that's interactive

### Modal takes time to load
Always wait 2-3 seconds after clicking before checking for modal. The high-res image loads asynchronously.

### Multiple image sizes in modal
The modal may contain multiple `img` elements. Always sort by `naturalWidth` and take the largest.

### Rate limiting
LinkedIn may throttle or block if you make too many requests. If you encounter:
- Blank pages
- "Something went wrong" errors
- Repeated login prompts

STOP and wait before continuing.


## Common Failures and Fixes

| Failure | Cause | Fix |
|---------|-------|-----|
| Downloads small image | Didn't click to open modal | Always click profile photo first |
| Modal never opens | Wrong element clicked | Re-snapshot, find correct ref |
| URL returns 403 | Link expired | Extract fresh URL, download immediately |
| Profile not found | Wrong URL format | Ensure URL starts with `linkedin.com/in/` |


## Example: Complete Profile Photo Workflow

```
1. browser_navigate: https://www.linkedin.com/in/username/
2. browser_snapshot
   CHECKPOINT: "Page loaded, found profile photo button at ref e622"
3. browser_click: ref=e622
4. browser_wait_for: 3 seconds
5. browser_snapshot
   CHECKPOINT: "Modal open, figure visible at ref e2739"
6. browser_evaluate: [extract largest image URL]
   CHECKPOINT: "Found 800x800 image URL"
7. curl: download to destination
   CHECKPOINT: "Downloaded 85KB file"
8. browser_press_key: Escape
```

