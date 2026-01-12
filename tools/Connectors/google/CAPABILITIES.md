# Google Connector Capabilities

What this connector can do for you.

## Google Drive

- List files and folders in My Drive or Shared Drives
- Upload files to Drive
- Download files from Drive
- Create, rename, move, copy, and delete files/folders
- Share files with specific people or make public
- Manage permissions (view, comment, edit)
- Search for files by name, type, or content
- Export Google files to other formats (PDF, DOCX, etc.)
- Add and read comments on files

## Google Docs

- Create new documents
- Read document content
- Edit and append text
- Apply formatting (bold, italic, headings)
- Find and replace text
- Set margins and page size
- Export to PDF, DOCX, TXT, HTML, RTF

## Google Sheets

- Create new spreadsheets
- Read cell data and ranges
- Write data to cells and ranges
- Create and manage sheets (tabs)
- Apply formatting and formulas
- Export to XLSX, CSV, PDF

## Google Slides

- Create new presentations
- Read slide content
- Add, duplicate, and delete slides
- Add text, images, and shapes
- Export to PPTX, PDF

## Gmail

- Send emails with subject, body, and attachments
- Read emails from inbox
- Search emails by sender, subject, date, labels
- List email threads
- Apply and manage labels
- Mark as read/unread
- Move to trash
- Create drafts

## YouTube

- List videos on your channel
- Upload videos with title, description, tags
- Update video metadata (title, description, tags, category)
- Set video privacy (public, unlisted, private)
- Schedule video publication
- Upload custom thumbnails
- Create, update, and delete playlists
- Add/remove videos from playlists
- Upload and manage captions/subtitles
- Read video comments

## Google Calendar

- List calendars
- Create, read, update, delete events
- Set event details (time, location, description)
- Add attendees and send invitations
- Set reminders and notifications
- Create recurring events
- Search events by date range or text

## AI (Gemini)

- Generate text responses to prompts
- Analyze and describe images
- Generate images from text prompts
- Generate videos from text prompts (Veo)
- Summarize documents
- Answer questions about uploaded files
- Code generation and explanation

## Cloud Management (Advanced)

**Projects:**
- List your Google Cloud projects
- View project details
- Create new projects

**API Management:**
- List enabled APIs for a project
- Enable or disable APIs programmatically
- Manage API quotas

**API Keys:**
- List API keys for a project
- Create new API keys
- Get API key values
- Delete API keys
- Set API key restrictions

**Service Accounts (IAM):**
- List service accounts
- Create service accounts
- Generate service account keys

**Cloud Run:**
- List deployed services
- View service details and URLs
- Check revision status

**Cloud Functions:**
- List deployed functions
- View function details and triggers

**Cloud Build:**
- List recent builds
- View build status and logs

## Limitations

**General:**
- All operations require proper authentication (see SETUP.md)
- Rate limits apply to all APIs (varies by service)
- Some features require specific OAuth scopes

**Drive:**
- Cannot access files you don't have permission to view
- Shared Drive access requires membership

**Gmail:**
- Cannot send from addresses you don't own
- Attachment size limit: 25MB

**YouTube:**
- Video uploads consume 1,600 quota units (~6 uploads/day on default quota)
- Custom thumbnails require verified channel
- Some features require YouTube Partner Program membership

**Calendar:**
- Cannot access calendars not shared with you
- External attendees may not receive invitations depending on their settings

**AI:**
- Gemini quota varies by API tier
- Video generation (Veo) may have limited availability
- Some content may be refused due to safety filters

**Cloud Management:**
- Requires billing account for most operations
- Project creation requires organization permissions
- API key management requires API Keys API enabled
- Service account keys are sensitive; store securely
- Cloud Run/Functions/Build require respective APIs enabled
