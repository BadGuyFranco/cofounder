# Google Connector

Comprehensive access to Google services: Drive, Workspace, Gmail, YouTube, Calendar, AI, and Cloud Management.

## Quick Start

```bash
cd "/cofounder/connectors/google"
npm install
node scripts/auth.js test --account user@example.com  # Test all APIs
```

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

Run any script with `help` for full command syntax:
```bash
node scripts/drive.js help
node scripts/gmail.js help
```

## Configuration

### OAuth Credentials

**Location:** `/memory/connectors/google/[email].json`

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
| 2 | Docs, Sheets, Slides, Gmail, YouTube, Calendar | Free |
| 3 | Gemini AI, Vertex AI, Vision | May require billing |
| 4 | Cloud Run, Functions, API Keys, IAM | Requires billing |

Check enabled APIs: `node scripts/auth.js status --account EMAIL`

Configure APIs: `node scripts/auth.js configure-apis --account EMAIL --rounds "1,2,3"`

## Terms of Service Compliance

**YouTube:** No spam uploads, fake engagement, misleading metadata, or copyright infringement.

**Gmail:** No bulk unsolicited emails, email harvesting, or phishing.

**Acceptable:** Managing your own content, sending emails you would send manually, personal productivity automation.

## Troubleshooting

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

**"Cannot find module":**
```bash
cd "/cofounder/connectors/google" && npm install
```

## API Documentation

- Drive: https://developers.google.com/drive/api/v3
- Gmail: https://developers.google.com/gmail/api
- YouTube: https://developers.google.com/youtube/v3
- Calendar: https://developers.google.com/calendar/api
- Gemini: https://ai.google.dev/gemini-api/docs
