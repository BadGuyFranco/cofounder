# Google Connector

Comprehensive access to Google services: Drive, Workspace, Gmail, YouTube, Calendar, AI, and Cloud Management.

## API Documentation

- Drive: https://developers.google.com/drive/api/v3/about-sdk
- Gmail: https://developers.google.com/gmail/api/guides
- YouTube: https://developers.google.com/youtube/v3
- Calendar: https://developers.google.com/calendar/api/guides/overview
- Gemini: https://ai.google.dev/gemini-api/docs
- Cloud Resource Manager: https://cloud.google.com/resource-manager/reference/rest
- Service Usage: https://cloud.google.com/service-usage/docs/reference/rest
- API Keys: https://cloud.google.com/docs/authentication/api-keys
- Cloud Run: https://cloud.google.com/run/docs/reference/rest
- Cloud Functions: https://cloud.google.com/functions/docs/reference/rest

## Quick Start

```bash
cd "/cofounder/tools/Connectors/google"
npm install
node scripts/auth.js status --account user@example.com
```

## Documentation Files

| File | Purpose |
|------|---------|
| `SETUP.md` | Step-by-step Google Cloud Console and credential setup |
| `CAPABILITIES.md` | User-facing list of what this connector can do |

## Configuration

### OAuth Credentials (Drive, Gmail, YouTube, Calendar, Workspace)

**Location:** `/memory/Connectors/google/[email].json`

Each file contains:
```json
{
  "email": "user@example.com",
  "client_id": "...",
  "client_secret": "...",
  "access_token": "...",
  "refresh_token": "...",
  "expiry": "2025-01-15T10:30:00.000Z",
  "enabled_apis": {
    "drive": true,
    "docs": true,
    "sheets": true,
    "gmail": true,
    "youtube": true,
    "calendar": true,
    "ai": false,
    "cloud_run": false
  }
}
```

The `enabled_apis` object tracks which APIs were enabled during setup. Scripts check this before making API calls.

**Not configured?** Follow `SETUP.md` Part A.

**Need to change enabled APIs?**
```bash
node scripts/auth.js configure-apis --account user@example.com --rounds "1,2,3"
node scripts/auth.js configure-apis --account user@example.com --apis "+ai,+vertex"
```

### API Key (Gemini AI)

**Location:** `/memory/Connectors/google/.env`

```
GOOGLE_AI_API_KEY=your_gemini_api_key
```

**Not configured?** Follow `SETUP.md` Part B.

## Scripts

| Script | Purpose | Requires |
|--------|---------|----------|
| `scripts/auth.js` | OAuth setup, token management, API config | Client ID/Secret |
| `scripts/drive.js` | Files, folders, sharing, comments | OAuth |
| `scripts/workspace.js` | Docs, Sheets, Slides | OAuth |
| `scripts/gmail.js` | Send, read, manage emails | OAuth |
| `scripts/youtube.js` | Videos, playlists, captions | OAuth |
| `scripts/calendar.js` | Events, calendars | OAuth |
| `scripts/ai.js` | Gemini text, image, video | API Key |
| `scripts/cloud.js` | Projects, APIs, keys, IAM, Cloud Run | OAuth (Round 4 APIs) |

Run any script with `--help` for command syntax.

## Account Selection

### Explicit Account

Use `--account` flag:
```bash
node scripts/drive.js list --account user@example.com
```

### Automatic Detection

When working with Google Drive sync paths, account is auto-detected:
```
/Users/.../GoogleDrive-user@example.com/Shared drives/...
                         ^^^^^^^^^^^^^^^^
                         Account extracted
```

Pass the path and let the script detect:
```bash
node scripts/drive.js info --path "/Users/.../GoogleDrive-user@example.com/..."
```

## Script Reference

### auth.js

```bash
# Set up new account (with rounds 1 and 2 enabled by default)
node scripts/auth.js setup --account user@example.com \
  --client-id "YOUR_ID" --client-secret "YOUR_SECRET"

# Set up with specific API rounds enabled
node scripts/auth.js setup --account user@example.com \
  --client-id "YOUR_ID" --client-secret "YOUR_SECRET" --rounds "1,2,3"

# Test all enabled APIs
node scripts/auth.js test --account user@example.com

# Check token status and enabled APIs
node scripts/auth.js status --account user@example.com

# Refresh expired token
node scripts/auth.js refresh --account user@example.com

# Configure which APIs are enabled
node scripts/auth.js configure-apis --account user@example.com --rounds "1,2,3,4"
node scripts/auth.js configure-apis --account user@example.com --apis "+ai,+vertex,-vision"

# List API rounds and what they contain
node scripts/auth.js api-rounds

# List configured accounts
node scripts/auth.js list

# Show available scopes
node scripts/auth.js scopes
```

### drive.js

```bash
# List files in a folder
node scripts/drive.js list "Shared drives/GPT" --account user@example.com

# Get file info
node scripts/drive.js info FILE_ID --account user@example.com

# Create folder
node scripts/drive.js create-folder "New Folder" --parent PARENT_ID --account user@example.com

# Upload file
node scripts/drive.js upload ./local-file.pdf --parent FOLDER_ID --account user@example.com

# Download file
node scripts/drive.js download FILE_ID ./output.pdf --account user@example.com

# Move file
node scripts/drive.js move FILE_ID NEW_PARENT_ID --account user@example.com

# Copy file
node scripts/drive.js copy FILE_ID --name "Copy of file" --account user@example.com

# Delete file
node scripts/drive.js delete FILE_ID --account user@example.com

# Share file
node scripts/drive.js share FILE_ID --email other@example.com --role writer --account user@example.com

# Export Google Doc to PDF
node scripts/drive.js export FILE_ID pdf ./output.pdf --account user@example.com

# Search files
node scripts/drive.js search "quarterly report" --account user@example.com

# List comments
node scripts/drive.js comments FILE_ID --account user@example.com

# Add comment
node scripts/drive.js comment FILE_ID "Great work!" --account user@example.com
```

### workspace.js

```bash
# Create Google Doc
node scripts/workspace.js doc create --title "Meeting Notes" --account user@example.com

# Read Google Doc
node scripts/workspace.js doc read DOC_ID --account user@example.com

# Append to Google Doc
node scripts/workspace.js doc append DOC_ID "New paragraph text" --account user@example.com

# Create Google Sheet
node scripts/workspace.js sheet create --title "Budget 2025" --account user@example.com

# Read sheet data
node scripts/workspace.js sheet read SHEET_ID --range "A1:D10" --account user@example.com

# Write to sheet
node scripts/workspace.js sheet write SHEET_ID --range "A1" --values '[["Header1","Header2"],["Data1","Data2"]]' --account user@example.com

# Create Google Slides
node scripts/workspace.js slides create --title "Q4 Presentation" --account user@example.com

# Add slide
node scripts/workspace.js slides add-slide PRESENTATION_ID --account user@example.com
```

### gmail.js

```bash
# Send email
node scripts/gmail.js send --to recipient@example.com --subject "Hello" --body "Message body" --account user@example.com

# Send with attachment
node scripts/gmail.js send --to recipient@example.com --subject "Report" --body "See attached" --attach ./report.pdf --account user@example.com

# List inbox
node scripts/gmail.js list --account user@example.com

# List with filters
node scripts/gmail.js list --from sender@example.com --after 2025-01-01 --account user@example.com

# Read email
node scripts/gmail.js read MESSAGE_ID --account user@example.com

# Search emails
node scripts/gmail.js search "quarterly report" --account user@example.com

# List labels
node scripts/gmail.js labels --account user@example.com

# Apply label
node scripts/gmail.js label MESSAGE_ID "Important" --account user@example.com

# Mark as read
node scripts/gmail.js mark-read MESSAGE_ID --account user@example.com

# Move to trash
node scripts/gmail.js trash MESSAGE_ID --account user@example.com

# Create draft
node scripts/gmail.js draft --to recipient@example.com --subject "Draft" --body "Content" --account user@example.com
```

### youtube.js

```bash
# List my videos
node scripts/youtube.js videos --account user@example.com

# Get video details
node scripts/youtube.js video VIDEO_ID --account user@example.com

# Upload video
node scripts/youtube.js upload ./video.mp4 --title "My Video" --description "Description" --account user@example.com

# Update video metadata
node scripts/youtube.js update VIDEO_ID --title "New Title" --description "New description" --account user@example.com

# Set video privacy
node scripts/youtube.js privacy VIDEO_ID public --account user@example.com

# Upload thumbnail
node scripts/youtube.js thumbnail VIDEO_ID ./thumb.jpg --account user@example.com

# List playlists
node scripts/youtube.js playlists --account user@example.com

# Create playlist
node scripts/youtube.js create-playlist --title "Favorites" --description "My favorites" --account user@example.com

# Add video to playlist
node scripts/youtube.js add-to-playlist PLAYLIST_ID VIDEO_ID --account user@example.com

# Upload captions
node scripts/youtube.js captions VIDEO_ID ./captions.srt --language en --account user@example.com

# List comments on video
node scripts/youtube.js comments VIDEO_ID --account user@example.com
```

### calendar.js

```bash
# List calendars
node scripts/calendar.js calendars --account user@example.com

# List events
node scripts/calendar.js events --account user@example.com

# List events in date range
node scripts/calendar.js events --start 2025-01-01 --end 2025-01-31 --account user@example.com

# Get event details
node scripts/calendar.js event EVENT_ID --account user@example.com

# Create event
node scripts/calendar.js create --title "Team Meeting" --start "2025-01-15T10:00:00" --end "2025-01-15T11:00:00" --account user@example.com

# Create event with attendees
node scripts/calendar.js create --title "Sync" --start "2025-01-15T14:00:00" --duration 30 --attendees "a@example.com,b@example.com" --account user@example.com

# Update event
node scripts/calendar.js update EVENT_ID --title "Updated Title" --account user@example.com

# Delete event
node scripts/calendar.js delete EVENT_ID --account user@example.com

# Quick add (natural language)
node scripts/calendar.js quick-add "Coffee with John tomorrow at 3pm" --account user@example.com
```

### ai.js

```bash
# Test connection
node scripts/ai.js test

# Text generation
node scripts/ai.js text "Explain quantum computing in simple terms"

# Text with system prompt
node scripts/ai.js text "Write a haiku" --system "You are a poet"

# Analyze image
node scripts/ai.js vision ./image.jpg "What's in this image?"

# Generate image
node scripts/ai.js image "A futuristic cityscape at sunset" --output ./city.png

# Generate image with aspect ratio
node scripts/ai.js image "Mountain landscape" --aspect-ratio 16:9 --output ./landscape.png

# Generate video (Veo)
node scripts/ai.js video "A cat playing piano" --output ./cat.mp4

# List available models
node scripts/ai.js models
```

### cloud.js

```bash
# List your Google Cloud projects
node scripts/cloud.js projects --account user@example.com

# Get project details
node scripts/cloud.js project my-project-id --account user@example.com

# Create a new project
node scripts/cloud.js create-project new-project-id "My New Project" --account user@example.com

# List enabled APIs for a project
node scripts/cloud.js apis list --project my-project --account user@example.com

# Enable an API
node scripts/cloud.js apis enable drive --project my-project --account user@example.com

# Disable an API
node scripts/cloud.js apis disable vision --project my-project --account user@example.com

# List API keys
node scripts/cloud.js api-keys list --project my-project --account user@example.com

# Create an API key
node scripts/cloud.js api-keys create "My App Key" --project my-project --account user@example.com

# Get API key value
node scripts/cloud.js api-keys get projects/my-project/locations/global/keys/key-id --account user@example.com

# List service accounts
node scripts/cloud.js service-accounts --project my-project --account user@example.com

# Create service account
node scripts/cloud.js create-sa my-service-account "My Service Account" --project my-project --account user@example.com

# Create service account key
node scripts/cloud.js create-sa-key my-service-account@my-project.iam.gserviceaccount.com --account user@example.com

# List Cloud Run services
node scripts/cloud.js run list --project my-project --region us-central1 --account user@example.com

# Get Cloud Run service details
node scripts/cloud.js run get my-service --project my-project --region us-central1 --account user@example.com

# List Cloud Functions
node scripts/cloud.js functions list --project my-project --account user@example.com

# List recent builds
node scripts/cloud.js builds list --project my-project --account user@example.com
```

## Multi-Account Workflows

When operating across multiple Google accounts:

```bash
# Work with personal account
node scripts/gmail.js send --to client@example.com --subject "Invoice" --account personal@gmail.com

# Work with business account
node scripts/drive.js upload ./report.pdf --parent FOLDER_ID --account business@company.com
```

## Error Handling

Common errors and solutions:

**"No credentials found for [email]"**
```bash
node scripts/auth.js setup --account your@email.com
```

**"Token refresh failed"**
- Credentials may have been revoked
- Re-run setup: `node scripts/auth.js setup --account your@email.com`

**"Quota exceeded"**
- Wait for quota reset (usually daily at midnight Pacific)
- Request quota increase in Google Cloud Console

**"403 Forbidden"**
- Missing required OAuth scope
- Re-run setup with additional scopes

**"API not enabled"**
- Enable the API in Google Cloud Console → APIs & Services → Library
- Then update local config: `node scripts/auth.js configure-apis --account your@email.com --apis "+api_name"`

**"[API] API is not enabled for [email]"**
- The API was not marked as enabled during setup
- Run: `node scripts/auth.js configure-apis --account your@email.com --apis "+api_name"`
- Or re-run setup with the correct rounds

**"Cannot find module"**
```bash
cd "/cofounder/tools/Connectors/google" && npm install
```

## Terms of Service Compliance

**For YouTube operations, refuse requests that involve:**
- Spam or bulk uploading (excessive volume)
- Fake engagement (artificial views, likes, comments)
- Misleading metadata (clickbait, wrong category)
- Copyright infringement
- Circumventing rate limits

**For Gmail operations, refuse requests that involve:**
- Bulk unsolicited emails (spam)
- Email harvesting or scraping
- Phishing or impersonation
- Circumventing sending limits

**Acceptable automation:**
- Managing your own content
- Sending emails you would send manually
- Organizing your own files and calendar
- Personal productivity automation

## Integration Notes

### Relation to Documentor

This connector provides the same Google Workspace functionality as `Documentor/google-workspace/` but in a unified location. The Documentor integration may redirect here.

### Relation to Image Generator

The `ai.js` module provides Gemini image generation. The Image Generator tool may use this connector for Google AI operations.

### Credential Migration

If you have existing credentials in `/memory/Documentor/accounts/google/`, they are compatible. Copy them to `/memory/Connectors/google/` or continue using both locations during transition.
