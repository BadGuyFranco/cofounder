# Google Connector Setup

Complete instructions for setting up the comprehensive Google connector with access to Drive, Workspace, Gmail, YouTube, Calendar, and AI services.

## Before You Begin

**Fair warning:** Google does NOT make this easy. Their developer console is complex, the terminology is confusing, and there are multiple steps that must be done in the right order. This is not your fault; it's just how Google works.

**Time required:**
- **First-time setup:** Set aside 45-60 minutes. If you've never created API credentials before, expect some confusion and re-reading of steps.
- **Experienced users:** 20-30 minutes if you're familiar with Google Cloud Console.

**What makes this hard:**
- Google Cloud Console has a lot of menus and options
- You need to enable multiple APIs individually
- OAuth consent screen configuration has several screens
- Scopes are confusing (we'll explain which ones you need)
- Desktop apps work differently than web apps

**The good news:** You only do this once. After setup, the connector handles token refresh automatically. Follow each step exactly as written, and you'll get through it.

**If you get stuck:** Just tell me where you are stuck and I'll do my best to help, then we will continue the process.

## Prerequisites

- A Google account (free Gmail or Google Workspace)
- Access to [Google Cloud Console](https://console.cloud.google.com/)
- Access to [Google AI Studio](https://aistudio.google.com/) (for AI features)

## Overview

This connector requires two types of credentials:

| Type | Used For | Where to Get |
|------|----------|--------------|
| OAuth 2.0 | Drive, Docs, Sheets, Slides, Gmail, YouTube, Calendar | Google Cloud Console |
| API Key | Gemini AI (text, image, video generation) | Google AI Studio |

You can set up one or both depending on which features you need.

## Part A: OAuth 2.0 Setup (Drive, Gmail, YouTube, Calendar, Workspace)

### Step 1: Create a Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Sign in with the Google account you want to connect
3. Click the project dropdown at the top left (next to "Google Cloud")
4. Click **New Project**
5. Name it **Cofounder Google Connector** (or any name you prefer)
6. Click **Create**
7. Wait for creation (10-30 seconds)
8. **Important:** Click the project dropdown again and select your new project

### Step 2: Enable Required APIs

Each Google service requires its API to be enabled. We'll do this in three rounds.

1. Click the hamburger menu (☰) at top left
2. Go to **APIs & Services** → **Library**

### Round 1: Enable Your First API

Let's start with one to make sure you know the process.

1. In the search bar, type `Google Drive API`
2. Click on **Google Drive API** in the results
3. Click the blue **Enable** button

You should now see the API dashboard for Google Drive API.

**Stop here and confirm this worked before continuing.**

### Round 2: Enable Remaining Free APIs

Now enable the rest of the free APIs. After each one, click **Library** in the left sidebar to return to the search.

| API Name | Required For |
|----------|--------------|
| **Google Docs API** | Create/edit Google Docs |
| **Google Sheets API** | Create/edit Google Sheets |
| **Google Slides API** | Create/edit Google Slides |
| **Gmail API** | Send, read, manage emails |
| **YouTube Data API v3** | Videos, playlists, channels, captions |
| **YouTube Analytics API** | Channel analytics and statistics |
| **YouTube Reporting API** | Bulk analytics reports |
| **Google Calendar API** | Events, calendars |

**For each API:**
1. Search for the API name
2. Click on it in the results
3. Click the blue **Enable** button
4. Click **Library** in the left sidebar to return to the search
5. Repeat until all are enabled

**Stop here and confirm all free APIs are enabled before continuing.**

### Round 3: Optional Paid APIs (Require Billing)

These APIs enable advanced AI features like video generation (Veo) and enterprise image generation (Imagen). They require a billing account to be set up on your Google Cloud project.

**Important billing notes:**
- These are **pay-per-use**, not monthly subscriptions
- If you don't use them, you won't be charged
- New Google Cloud accounts get $300 in free credits
- Skip this section if you don't need video/advanced image generation

| API Name | Required For | Cost Model |
|----------|--------------|------------|
| **Generative Language API** | Gemini AI text/chat/images | Free tier available, may require billing setup |
| **Vertex AI API** | Veo video generation, Imagen images | Pay per generation |
| **Cloud Vision API** | Advanced image analysis | Free tier: 1,000 units/month, then pay-per-use |

**Note:** Generative Language API has a generous free tier via Google AI Studio, but enabling it in Cloud Console may require billing to be configured. Vertex AI is needed for Veo video generation or Imagen's enterprise image features.

**To enable paid APIs:**
1. You may be prompted to set up billing first
2. Follow the billing setup prompts (credit card required, but won't be charged without usage)
3. Then enable the APIs using the same process as above

### Round 4: Cloud Management APIs (Advanced, Optional)

These APIs let you manage Google Cloud itself, not just use Google services. Most users can skip this section.

**Who needs these:**
- You want to deploy websites or apps to Google Cloud
- You want to create API keys automatically (without clicking through the console)
- You want to manage multiple Google Cloud projects programmatically
- You're building automation that sets up new environments

**Who can skip these:**
- You just want to use Drive, Gmail, YouTube, Calendar, or AI features
- You're not deploying applications to Google Cloud

| API Name | What It Does (Plain English) |
|----------|------------------------------|
| **Cloud Run API** | Deploy websites and apps that run in containers |
| **Cloud Functions API** | Deploy small pieces of code that run on demand |
| **App Engine Admin API** | Deploy apps to Google's original app hosting service |
| **Cloud Build API** | Automatically build and deploy your code |
| **API Keys API** | Create and manage API keys without using the console |
| **Service Usage API** | Turn APIs on and off programmatically |
| **Cloud Resource Manager API** | Create and manage Google Cloud projects |
| **IAM API** | Manage who has access to what |

**Important:** These APIs require billing to be enabled. Like Round 3, they are pay-per-use. If you don't use them, you won't be charged.

**To enable:** Same process as before. Search for each API, click Enable. If prompted for billing and you haven't set it up yet, follow the prompts.

**Verify all APIs:** Go to **APIs & Services** → **Enabled APIs & Services** to see your complete list.

### Step 3: Configure OAuth Consent Screen

Before creating credentials, you must configure the consent screen (what users see when authorizing).

**Navigation:**
1. Click the hamburger menu (☰) at the top left corner
2. Scroll down and click **APIs & Services**
3. In the submenu that appears, click **OAuth consent screen**

**If you see "Google Auth Platform not configured yet":**
4. Click **Get started**

**App Information:**

| Field | Enter |
|-------|-------|
| App name | Cofounder Google Connector |
| User support email | Your email (select from dropdown) |

3. Click **Next**

**Audience:**

4. Select your audience type:
   - **Internal** - If you have Google Workspace (recommended; no verification needed)
   - **External** - If you have a free Gmail account (requires adding test users)

5. Click **Next**

**Contact Information:**

6. Enter your email address
7. Click **Next**

**Finish:**

8. Review and click **Finish** (or **Create**)

**For External users only:** You must add yourself as a test user:
1. In the OAuth consent screen, click **Audience** in the left menu
2. Under "Test users", click **Add users**
3. Enter your email address
4. Click **Save**

### Step 4: Configure OAuth Scopes

This step tells Google which permissions your app can request.

1. In the OAuth consent screen, click **Data Access** in the left menu
2. Click **Add or remove scopes**
3. In the filter, search for and check each scope you need:

**Core scopes (recommended for full functionality):**

| Scope | Description |
|-------|-------------|
| `.../auth/drive` | Full Google Drive access |
| `.../auth/documents` | Google Docs access |
| `.../auth/spreadsheets` | Google Sheets access |
| `.../auth/presentations` | Google Slides access |
| `.../auth/gmail.modify` | Full Gmail access |
| `.../auth/youtube` | YouTube channel management |
| `.../auth/youtube.upload` | YouTube video uploads |
| `.../auth/calendar` | Full Calendar access |

**Alternative: Minimal scopes (if you prefer restricted access):**

| Scope | Description |
|-------|-------------|
| `.../auth/drive.file` | Only files created by this app |
| `.../auth/gmail.readonly` | Read-only Gmail |
| `.../auth/gmail.send` | Send-only Gmail |
| `.../auth/calendar.readonly` | Read-only Calendar |

4. Click **Update** to save scope selections
5. Click **Save** at the bottom

### Step 5: Create OAuth Credentials

After completing the consent screen, you may be automatically taken to the Credentials page with a prompt saying "You haven't configured any OAuth clients for this project yet." If so, click **Create OAuth client** and skip to step 3 below.

**If you're not on that page:**
1. Click the hamburger menu (☰) at the top left
2. Click **APIs & Services** → **Credentials**
3. Click **+ Create Credentials** → **OAuth client ID**

**On the "Create OAuth client ID" form:**
4. Application type: Select **Desktop app** from the dropdown
5. Name: Enter **Cofounder CLI**
6. Click **Create**

You'll see a popup with:
- **Client ID** (long string ending in `.apps.googleusercontent.com`)
- **Client Secret** (shorter string)

**Copy both values** and save them securely. You'll need them next.

### Step 6: Provide Credentials to AI

Give the AI your Client ID and Client Secret. The AI will:

1. Store credentials securely
2. Generate an authorization URL
3. Guide you through the OAuth flow
4. Save your access tokens

**Required credentials:**
- `GOOGLE_CLIENT_ID` - The Client ID from Step 5
- `GOOGLE_CLIENT_SECRET` - The Client Secret from Step 5

**Credential storage location:** `/memory/connectors/google/[your-email].json`

### Step 7: Complete OAuth Flow

The AI will run the setup command, which will open a browser window.

**What happens:**
1. A browser window opens to Google's authorization page
2. Sign in to Google (if not already signed in)
3. Review the permissions and click **Allow**
4. You'll see a page that says **"Authorization Successful!"**

**Important:** When you see "Authorization Successful!" in the browser, tell the AI. The command may time out on the AI's side, but if you saw the success message, the authorization worked.

**Manual command (if needed):**
```bash
node scripts/auth.js setup --account your@email.com --client-id "YOUR_ID" --client-secret "YOUR_SECRET" --rounds "1,2"
```

### Step 8: Verify Setup

Run the test command to verify all enabled APIs are working:

```bash
node scripts/auth.js test --account your@email.com
```

Expected output:
```
=== Testing APIs for your@email.com ===

✓ OAuth authentication valid

✓ Google Drive
✓ Google Docs (API initialized)
✓ Google Sheets (API initialized)
✓ Google Slides (API initialized)
✓ Gmail
✓ YouTube
✓ Google Calendar

=== Results ===
Passed: 7/7
```

**If any tests fail:**
- Check that the API is enabled in Google Cloud Console
- Verify you have the correct scopes in your OAuth consent screen
- Try running `node scripts/auth.js refresh --account your@email.com`

## Part B: API Key Setup (Gemini AI)

The Gemini API uses a simpler API key (not OAuth). This is separate from the OAuth credentials above.

### Step 1: Get Gemini API Key

1. Go to [Google AI Studio API Keys](https://aistudio.google.com/apikey)
2. Sign in with your Google account
3. Click **Create API Key**
4. You need to select a Google Cloud project:
   - If you see **Cofounder Google Connector** in the list, select it
   - If you don't see it, click **Import project** and select **Cofounder Google Connector**
   - Or select any other project you have access to (the key works regardless)
5. Copy the generated API key

**Note:** Keep this key secret. Anyone with this key can use your Gemini quota.

### Step 2: Provide API Key to AI

Give the AI your Gemini API key. The AI will store it in:
`/memory/connectors/google/.env`

**Required:**
- `GOOGLE_AI_API_KEY` - Your Gemini API key

### Step 3: Verify AI Setup

```bash
node scripts/ai.js test
```

Expected output:
```
✓ Gemini API connection successful
Model: gemini-2.0-flash
```

## Multiple Google Accounts

To connect additional Google accounts, repeat Part A Steps 5-7 for each account:

```bash
node scripts/auth.js setup --account another@email.com
```

The `--account` flag determines which account credentials to use for operations.

**Automatic account detection:** When working with files in Google Drive sync folders, the connector automatically detects the account from the path:
```
/Users/.../GoogleDrive-user@example.com/Shared drives/...
```

## Credential File Locations

| Credential Type | Location |
|-----------------|----------|
| OAuth per account | `/memory/connectors/google/[email].json` |
| API keys | `/memory/connectors/google/.env` |

## Scopes Reference

**Full scopes for reference (used in Step 4):**

```
# Drive & Workspace
https://www.googleapis.com/auth/drive
https://www.googleapis.com/auth/documents
https://www.googleapis.com/auth/spreadsheets
https://www.googleapis.com/auth/presentations

# Gmail
https://www.googleapis.com/auth/gmail.modify
https://www.googleapis.com/auth/gmail.readonly
https://www.googleapis.com/auth/gmail.send

# YouTube
https://www.googleapis.com/auth/youtube
https://www.googleapis.com/auth/youtube.upload
https://www.googleapis.com/auth/youtube.force-ssl

# Calendar
https://www.googleapis.com/auth/calendar
https://www.googleapis.com/auth/calendar.readonly
```

## Quota and Rate Limits

| Service | Default Quota | Notes |
|---------|---------------|-------|
| Drive API | 20,000 queries/day | Generous for personal use |
| Gmail API | 250 quota units/user/second | Read=5, Send=100 |
| YouTube Data API | 10,000 units/day | Upload=1600 units (~6/day) |
| Calendar API | 1,000,000 queries/day | Very generous |
| Gemini API | Varies by tier | Check AI Studio dashboard |

**To request quota increases:**
1. Go to **APIs & Services** → **Enabled APIs**
2. Click on the API
3. Click **Quotas** tab
4. Click **Edit Quotas** (pencil icon)
5. Submit request with justification

## Troubleshooting

### OAuth Issues

**"Access blocked: This app's request is invalid"**
- You selected "Web application" instead of "Desktop app" when creating credentials
- Delete the credential and recreate as Desktop app

**"Error 403: access_denied"**
- External users: Add yourself as a test user in OAuth consent screen
- Check that required scopes are configured

**"Token expired" or "Invalid credentials"**
- Run: `node scripts/auth.js refresh --account your@email.com`
- If refresh fails, re-run setup

**"Quota exceeded"**
- Wait for quota reset (usually daily)
- Request quota increase in Cloud Console

### API Key Issues

**"API key not valid"**
- Verify the key is copied correctly (no extra spaces)
- Check that Generative Language API is enabled in Cloud Console
- Try generating a new key in AI Studio

**"Permission denied" for Gemini**
- Enable the **Generative Language API** in Cloud Console
- Wait a few minutes for propagation

### General Issues

**"Cannot find module"**
```bash
cd "/cofounder/connectors/google"
npm install
```

**"API not enabled"**
- Go to Cloud Console → APIs & Services → Library
- Search for and enable the missing API

## Security Best Practices

1. **Never share credentials** - Client secrets and API keys should stay private
2. **Use test mode** - Keep OAuth consent screen in "Testing" until production ready
3. **Restrict API keys** - In Cloud Console, restrict keys to specific APIs and IPs
4. **Rotate periodically** - Regenerate API keys every few months
5. **Audit access** - Review Cloud Console → IAM → Audit Logs periodically

## What's Next

After setup, see:
- `CAPABILITIES.md` - What you can do with this connector
- `AGENTS.md` - Technical reference for AI execution
