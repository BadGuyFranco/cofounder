# Google Connector

Comprehensive access to Google services: Drive, Workspace, Gmail, YouTube, Calendar, AI, and Cloud Management.

## Quick Start

```bash
node scripts/auth.js test --account user@example.com  # Test all APIs
```

If you get "Cannot find module", run `npm install` first.

## Documentation Files

| File | Purpose |
|------|---------|
| `SETUP.md` | Step-by-step Google Cloud Console and credential setup |
| `CAPABILITIES.md` | What this connector can do |

**Not configured?** Follow `SETUP.md`.

**What can I do?** See `CAPABILITIES.md`.

## Scripts

| Script | Purpose |
|--------|---------|
| `auth.js` | OAuth setup, token management, API testing |
| `drive.js` | Files, folders, sharing, comments |
| `workspace.js` | Docs, Sheets, Slides |
| `gmail.js` | Send, read, manage emails |
| `youtube.js` | Videos, playlists, captions |
| `calendar.js` | Events, calendars |
| `ai.js` | Gemini text, image, video generation |
| `cloud.js` | Projects, APIs, keys, IAM, deployments |
| `search-console.js` | Search analytics, URL inspection, sitemaps |
| `pagespeed.js` | Core Web Vitals, performance scores, opportunities |
| `vision.js` | Image analysis: faces, labels, text, objects |
| `analytics.js` | GA4 traffic, top pages, sources, conversions, realtime |
| `ads.js` | Google Ads campaigns, keywords, ad groups, performance |
| `speech.js` | Transcribe audio to text, speaker diarization |
| `tts.js` | Synthesize text to speech, Neural2/Studio voices |
| `language.js` | NLP: entities, sentiment, classification, moderation |
| `translate.js` | Translate text and files across 100+ languages |
| `document-ai.js` | Extract structured data from PDFs and documents |
| `business.js` | Business Profile: locations, reviews, posts |
| `scheduler.js` | Schedule HTTP jobs on cron, run tasks automatically |
| `search-console.js` | Search analytics, URL inspection, sitemaps |
| `pagespeed.js` | Core Web Vitals, performance score, opportunities |

Run any script with `help` for full command syntax:
```bash
node scripts/drive.js help
node scripts/gmail.js help
```

## Search Console Site Registry

Verified GSC properties are cached at `/memory/connectors/google/search-console-sites.json` after any `sites` command runs. Check this file first when a site URL is needed for Search Console commands - no need to ask the user which property to use.

```json
{
  "user@example.com": {
    "last_updated": "2026-02-20",
    "properties": [
      { "siteUrl": "sc-domain:example.com", "permission": "siteOwner", "domain": "example.com" }
    ]
  }
}
```

If the file is missing or stale, run `node scripts/search-console.js sites --account EMAIL` to refresh it.

## Configuration

### OAuth Credentials

**Location:** `/memory/connectors/google/[email].json`

`/memory/` is a workspace root. Resolve from `user_info.Workspace Paths` before reading or creating this file.

```json
{
  "email": "user@example.com",
  "client_id": "...",
  "client_secret": "...",
  "access_token": "...",
  "refresh_token": "...",
  "enabled_apis": { "drive": true, "gmail": true, ... }
}
```

### API Key (Gemini AI)

**Location:** `/memory/connectors/google/.env`

```
GOOGLE_AI_API_KEY=your_gemini_api_key
```

## Account Selection

**Explicit:** Use `--account` flag:
```bash
node scripts/drive.js list --account user@example.com
```

**Automatic:** Detected from Google Drive sync paths:
```
/Users/.../GoogleDrive-user@example.com/Shared drives/...
```

## API Rounds

APIs are grouped into rounds during setup:

| Round | APIs | Billing |
|-------|------|---------|
| 1 | Drive | Free |
| 2 | Docs, Sheets, Slides, Gmail, YouTube, Calendar, Analytics (GA4), Business Profile | Free |
| 3 | Gemini AI, Vertex AI, Vision, Speech-to-Text, Text-to-Speech, Natural Language, Translation, Document AI, Scheduler | May require billing |
| 4 | Google Ads, Cloud Run, Functions, API Keys, IAM | Requires billing or developer tokens |

Check enabled APIs: `node scripts/auth.js status --account EMAIL`

Configure APIs: `node scripts/auth.js configure-apis --account EMAIL --rounds "1,2,3"`

## Terms of Service Compliance

**YouTube:** No spam uploads, fake engagement, misleading metadata, or copyright infringement.

**Gmail:** No bulk unsolicited emails, email harvesting, or phishing.

**Acceptable:** Managing your own content, sending emails you would send manually, personal productivity automation.

## Troubleshooting

**"node: command not found" or setup issues:** Follow `SETUP.md` in this connector's directory.

**"No credentials found":**
```bash
node scripts/auth.js setup --account your@email.com
```

**"[API] not enabled for [email]":**
```bash
node scripts/auth.js configure-apis --account your@email.com --apis "+api_name"
```

**"Token refresh failed":** Re-run setup.

**"Quota exceeded":** Wait for daily reset or request increase in Cloud Console.

## API Documentation

- PageSpeed Insights: https://developers.google.com/speed/docs/insights/v5/get-started
- Search Console: https://developers.google.com/webmaster-tools/search-console-api/reference/rest
- Cloud Vision: https://cloud.google.com/vision/docs/reference/rest
- Analytics (GA4): https://developers.google.com/analytics/devguides/reporting/data/v1
- Google Ads: https://developers.google.com/google-ads/api/docs
- Speech-to-Text: https://cloud.google.com/speech-to-text/docs/reference/rest
- Text-to-Speech: https://cloud.google.com/text-to-speech/docs/reference/rest
- Natural Language: https://cloud.google.com/natural-language/docs/reference/rest
- Translation: https://cloud.google.com/translate/docs/reference/rest
- Document AI: https://cloud.google.com/document-ai/docs/reference/rest
- Business Profile: https://developers.google.com/my-business/reference/businessinformation/rest
- Cloud Scheduler: https://cloud.google.com/scheduler/docs/reference/rest
- Drive: https://developers.google.com/drive/api/v3
- Gmail: https://developers.google.com/gmail/api
- YouTube: https://developers.google.com/youtube/v3
- Calendar: https://developers.google.com/calendar/api
- Gemini: https://ai.google.dev/gemini-api/docs
