# PodMatch Browser Automation

Site-specific patterns for automating PodMatch interactions.

**Base URL patterns:** `podmatch.com/member/*`, `podmatch.com/podcast/*`


## Authentication

PodMatch may require login for some content.

**If you see a login prompt:**
1. STOP automation
2. Inform user: "PodMatch requires login. Please log in manually in the browser."
3. Wait for user confirmation before continuing


## Profile Photo Extraction

PodMatch profile photos are typically displayed directly without modal interaction.

### Step-by-Step Process

**1. Navigate and snapshot**
```
browser_navigate to profile URL
browser_snapshot
```

**2. Find the profile image**

Look in the snapshot for:
- `img` elements with src containing profile-related URLs
- Images near the top of the profile
- Images with reasonable dimensions (not tiny icons)

**3. Extract image URL**

```javascript
// browser_evaluate
() => {
  // Look for profile images
  const images = Array.from(document.querySelectorAll('img'))
    .filter(img => {
      // Filter out tiny images (icons, logos)
      if (img.naturalWidth < 100) return false;
      // Filter out common non-profile images
      if (img.src.includes('logo')) return false;
      if (img.src.includes('icon')) return false;
      return true;
    })
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

**CHECKPOINT:** Verify URL looks like a profile photo (reasonable size, not a placeholder)

**4. Download the image**

```bash
curl -L "extracted_url" -o "output_path.jpg"
```

Verify file size is reasonable.


## Profile Data Extraction

### Get name and bio
```javascript
() => {
  // Adjust selectors based on actual PodMatch structure
  const name = document.querySelector('h1, h2, .profile-name')?.innerText?.trim();
  const bio = document.querySelector('.bio, .description, p')?.innerText?.trim();
  return { success: !!name, name, bio };
}
```


## Known Quirks

### No modal required
Unlike LinkedIn, PodMatch typically displays the full-size image directly on the profile page. No need to click to open a modal.

### Image may be background-image
Some profile photos are set as CSS background images rather than `img` tags:

```javascript
() => {
  const elements = document.querySelectorAll('[style*="background-image"]');
  const urls = Array.from(elements)
    .map(el => {
      const style = el.style.backgroundImage;
      const match = style.match(/url\(["']?(.+?)["']?\)/);
      return match ? match[1] : null;
    })
    .filter(Boolean);
  return { success: urls.length > 0, urls };
}
```

### Lazy loading
Images may lazy-load. If image URL is a placeholder:
1. Scroll the image into view
2. Wait 1-2 seconds
3. Re-extract


## Common Failures and Fixes

| Failure | Cause | Fix |
|---------|-------|-----|
| Wrong image extracted | Picked logo instead of profile | Filter by size and position |
| Placeholder URL | Lazy loading not triggered | Scroll to element, wait, retry |
| No image found | Image is background-image | Check CSS background-image property |


## Example: Complete Profile Photo Workflow

```
1. browser_navigate: https://podmatch.com/member/username
2. browser_snapshot
   CHECKPOINT: "Page loaded, profile visible"
3. browser_evaluate: [extract largest non-icon image]
   CHECKPOINT: "Found 400x400 image URL"
4. curl: download to destination
   CHECKPOINT: "Downloaded 65KB file"
```

