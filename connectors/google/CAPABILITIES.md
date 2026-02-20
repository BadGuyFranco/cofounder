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

## PageSpeed Insights

- Run Core Web Vitals analysis on any public URL (mobile, desktop, or both)
- Get real-user field data (LCP, INP, CLS, FCP) from Chrome UX Report when available
- Get lab data (simulated): LCP, TBT, CLS, FCP, TTFB, Speed Index
- Get overall Lighthouse performance score (0-100)
- Surface top opportunities with estimated millisecond savings
- Surface failed diagnostics (unoptimized images, render-blocking resources, unused JS/CSS, etc.)
- No authentication required; uses `PAGESPEED_API_KEY` from `.env` for reliable quota

## Google Search Console

- List all verified Search Console properties
- Query search analytics: clicks, impressions, CTR, average position by query, page, country, device, or date
- Surface CTR opportunities: queries with high impressions and low CTR (highest-leverage on-page optimization targets)
- Get top queries and top pages by clicks
- Inspect any URL for indexation status, last crawl date, crawl method, robots.txt state, canonical URL, mobile usability, and rich result eligibility
- List sitemaps for a property with submitted/indexed counts and download status
- Submit or resubmit a sitemap
- Delete a sitemap from a property

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

## Google Analytics (GA4)

- List GA4 properties accessible to the account
- Query traffic: sessions, users, page views, bounce rate, session duration
- Top pages by views with engagement metrics
- Top traffic sources by channel, source, medium
- Daily audience overview over any date range
- Real-time active users with page and country breakdown
- Conversion events summary with revenue
- Custom reports with any dimension and metric combination

## Google Ads

- List accessible customer accounts
- List campaigns with impressions, clicks, spend, conversions
- Account-level performance summary for any date range
- List ad groups by campaign
- List keywords with match type, impressions, spend, CPC
- Run raw GAQL (Google Ads Query Language) queries for custom data

## Cloud Speech-to-Text

- Transcribe short audio files (< 60 seconds)
- Transcribe long audio files up to 8 hours via async operation
- Transcribe audio from Google Cloud Storage URIs
- Speaker diarization: identify and label multiple speakers
- Word-level timestamps for precise alignment
- Language detection and support for 125+ languages
- Boost recognition of domain-specific vocabulary
- Models: latest_long, phone_call, video, medical_dictation

## Cloud Text-to-Speech

- Synthesize text to MP3, OGG, WAV audio
- Studio voices: highest quality for professional content
- Neural2 voices: high quality, broad language support
- WaveNet voices: good quality, widest voice selection
- Control speaking rate, pitch, and volume
- SSML support for pauses, emphasis, and pronunciation control
- Long text file synthesis with automatic chunking
- 40+ languages with multiple voice options per language
- List and filter available voices by language and tier

## Cloud Natural Language

- Full text analysis: entities, sentiment, categories in one call
- Named entity extraction: people, places, organizations, dates, prices
- Document and sentence-level sentiment analysis (score + magnitude)
- Content classification into IAB taxonomy categories
- Text moderation: detect toxic, hateful, or explicit content
- Analyze local text files
- Supports HTML input (strips tags automatically)

## Cloud Translation

- Translate text to any of 100+ supported languages
- Auto-detect source language
- Translate entire text files with paragraph structure preserved
- Batch translation of multiple strings
- List all supported languages with localized names

## Cloud Document AI

- List configured Document AI processors
- Extract plain text from PDFs, images (OCR)
- Extract typed entities from invoices, receipts, forms, contracts
- Support for PDF, JPEG, PNG, TIFF, BMP, WebP
- Page-level metadata: dimensions, detected languages

## Google Business Profile

- List Business Profile accounts and locations
- Get full location details: address, hours, phone, categories
- List and read customer reviews with ratings and replies
- Reply to reviews (or delete existing replies)
- List local posts (standard, event, offer types)
- Create new local posts with call-to-action links
- Delete local posts

## Cloud Scheduler

- List all scheduled jobs with status and next run time
- Create HTTP jobs that fire on any cron schedule
- Update schedule, URL, or body of existing jobs
- Manually trigger a job to run immediately
- Pause and resume jobs without deleting them
- Delete jobs
- List available regions
- Show common cron schedule patterns

## Limitations

**General:**
- All operations require proper authentication (see SETUP.md)
- Rate limits apply to all APIs (varies by service)
- Some features require specific OAuth scopes

**Search Console:**
- Only works for properties you own or have verified in Search Console
- URL Inspection requires the Search Console URL Inspection API enabled in Google Cloud Console
- Indexing requests (as a button in the GSC UI) are not available via API for general web pages; use sitemap submission to trigger crawling
- Data is subject to GSC's standard sampling and processing delays (typically 2-3 days)

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

**Google Analytics (GA4):**
- Requires GA4 property (does not work with old Universal Analytics / UA-... properties)
- Data is subject to sampling at high row counts
- Realtime data has a short delay (seconds)

**Google Ads:**
- Requires a Google Ads developer token (apply at developers.google.com/google-ads/api/docs/get-started/dev-token)
- Developer token must be approved for standard access to access live accounts
- Test accounts available immediately with basic access token
- Set GOOGLE_ADS_DEVELOPER_TOKEN and GOOGLE_ADS_CUSTOMER_ID in .env

**Cloud Speech-to-Text:**
- Synchronous recognition: audio must be < 60 seconds and < 10MB
- Longer audio: use transcribe-async command (up to 480 minutes)
- Best results with FLAC or LINEAR16 encoding
- Speaker diarization may reduce overall accuracy

**Cloud Text-to-Speech:**
- Studio voices: highest quality, limited language support, higher cost
- Neural2 voices: high quality, broad language support
- Long text is automatically chunked; combined output may have slight seam between chunks
- Audio output is concatenated raw bytes; for precise editing use a DAW

**Cloud Natural Language:**
- Text classification requires at least 20 characters
- Entity sentiment available but less reliable on short texts
- Moderation categories are probabilistic, not deterministic

**Cloud Translation:**
- Long files are chunked automatically; paragraph structure is preserved
- HTML mode strips tags before analysis; translated text is plain text
- Translated output may not preserve formatting of original documents

**Cloud Document AI:**
- Requires creating a processor in Google Cloud Console before use
- Processor types are specialized: use the right type for your document
- Processing large PDFs may take several seconds
- Requires GOOGLE_CLOUD_PROJECT set in .env

**Google Business Profile:**
- Only works for locations you own or manage in Business Profile
- Review responses are limited to one reply per review
- Local posts expire after 7 days by default (events and offers have their own schedules)
- Some API endpoints still use v4 (reviews, posts); others have moved to v1

**Cloud Scheduler:**
- Requires App Engine initialized in the project (one-time setup)
- Minimum schedule interval: 1 minute
- Jobs require an HTTP endpoint to call; combine with Cloud Run or Cloud Functions
- Requires GOOGLE_CLOUD_PROJECT set in .env
- Timezone defaults to America/New_York; change with --timezone flag
