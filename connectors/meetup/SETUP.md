# Meetup Connector Setup

The AI walks you through each step one at a time.

**Path Resolution:** `/cofounder/` and `/memory/` are workspace roots. Resolve from `user_info.Workspace Paths` before running commands.

**Windows users:** All commands must run in Git Bash, not PowerShell or cmd. No Git Bash? Install from https://gitforwindows.org first.

## Prerequisites

First, verify Node.js is installed:

```bash
node --version
```

- If you see "command not found": Follow `/cofounder/system/installer/dependencies/nodejs.md` first, then return here.
- If you see a version number (e.g., `v20.x.x`): Continue below.

**Account requirements:**
- Active Meetup Pro subscription
- Organizer access to at least one group

## Step 1: Open Registration Page

Go to: https://www.meetup.com/api/oauth/list/

Click **Register a new OAuth client**.

**Tell the AI when you see the registration form.**

## Step 2: Client Name

Enter: `CoFounder Automation`

**Tell the AI when done.**

## Step 3: Application Website

Enter your website URL (any valid URL works).

**Tell the AI when done.**

## Step 4: Redirect URL

Enter exactly: `http://localhost:3000/callback`

**Tell the AI when done.**

## Step 5: Primary Reason (First Question)

Select: **"I want to promote/manage an existing Meetup Pro network"**

**Tell the AI when done.**

## Step 6: Network URL

Enter your Meetup Pro network URL (e.g., `https://www.meetup.com/pro/wiser/`).

**Tell the AI when done.**

## Step 7: Primary Reason (Second Question)

Select: **"Creating an in-house solution for my company"**

**Tell the AI when done.**

## Step 8: Full Description of Use Case

Enter:

```
Internal automation tool to manage Meetup events and groups. Used to create events, track RSVPs, and sync group data with internal systems.
```

**Tell the AI when done.**

## Step 9: Contact Name

Enter your full name.

**Tell the AI when done.**

## Step 10: Contact Email

Enter your email address.

**Tell the AI when done.**

## Step 11: Terms of Service

Check the box: **"Yes, I agree"**

**Tell the AI when done.**

## Step 12: Submit

Click **Register**.

Your application will show as **"Pending approval"**. Meetup manually reviews OAuth applications.

**Wait for approval email from Meetup** (can take hours to days).

## Step 13: Get Credentials

Once approved, go to: https://www.meetup.com/api/oauth/list/

Find your application and copy the **Key** and **Secret**.

**Give both values to the AI.**

## Step 14: OAuth Flow

The AI runs: `node scripts/auth.js url`

This prints an authorization URL. Open it in your browser and click **Allow**.

You'll be redirected to your redirect URL with a `code` parameter. Copy the code from the URL and give it to the AI.

The AI runs: `node scripts/auth.js exchange <code>`

## Step 15: Verify

The AI runs: `node scripts/auth.js status`

Done when you see: `[OK] Token is valid`

## Token Management

Tokens expire after 1 hour. Refresh with: `node scripts/auth.js refresh`
