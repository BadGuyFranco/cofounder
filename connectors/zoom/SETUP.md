# Zoom Connector Setup

Step-by-step guide. The AI will walk you through each step one at a time.

## Prerequisites

First, verify Node.js is installed:

```bash
node --version
```

- If you see "command not found": Follow `/cofounder/system/installer/dependencies/nodejs.md` first, then return here.
- If you see a version number (e.g., `v20.x.x`): Continue to Step 1.

**Account requirements:**
- Zoom account with admin or developer access
- Ability to create Server-to-Server OAuth apps in Zoom Marketplace

## Step 1: Go to Zoom App Marketplace

Go to https://marketplace.zoom.us/

Sign in with your Zoom account if prompted.

**Tell the AI when done.**

## Step 2: Access the Develop menu

1. Click **Develop** in the top navigation bar
2. Select **Build App** from the dropdown

**Tell the AI when done.**

## Step 3: Create a Server-to-Server OAuth App

1. Find **Server-to-Server OAuth** in the app type list
2. Click **Create** next to it

**Tell the AI when done.**

## Step 4: Name your app

In the **App Name** field, enter:

```
CoFounder Zoom Connector
```

Click **Create**.

**Tell the AI when done.**

## Step 5: Copy your Account ID

On the app credentials page, you will see your **Account ID**.

**Copy this value and provide it to the AI.**

## Step 6: Copy your Client ID

On the same page, find the **Client ID** field.

**Copy this value and provide it to the AI.**

## Step 7: Copy your Client Secret

On the same page, find the **Client Secret** field.

**Copy this value and provide it to the AI.**

## Step 8: Configure Scopes

Click on the **Scopes** tab in the left sidebar.

Click **Add Scopes** and add the following scopes:

**User scopes:**
- `user:read:admin` - View users
- `user:write:admin` - Manage users

**Meeting scopes:**
- `meeting:read:admin` - View meetings
- `meeting:write:admin` - Manage meetings

**Webinar scopes:**
- `webinar:read:admin` - View webinars
- `webinar:write:admin` - Manage webinars

**Recording scopes:**
- `cloud_recording:read:admin` - View recordings
- `cloud_recording:write:admin` - Manage recordings

**Report scopes:**
- `report:read:admin` - View reports

**Dashboard scopes:**
- `dashboard_meetings:read:admin` - View meeting dashboard
- `dashboard_webinars:read:admin` - View webinar dashboard
- `dashboard_zr:read:admin` - View Zoom Rooms dashboard

**Group scopes:**
- `group:read:admin` - View groups
- `group:write:admin` - Manage groups

Click **Done** after adding all scopes.

**Tell the AI when done.**

## Step 9: Activate the App

1. Click on the **Activation** tab in the left sidebar
2. Click **Activate your app**

Your app is now ready to use.

**Tell the AI when done.**

## Verify Setup

The AI will run: `node scripts/auth.js verify`

Expected output: Account information and "Credentials verified successfully!"

## Troubleshooting

**"Invalid client credentials":**
- Double-check that Account ID, Client ID, and Client Secret are correct
- Ensure there are no extra spaces in the values

**"Scope not found" during authorization:**
- Go back to your app in Zoom Marketplace
- Verify all required scopes are added and the app is activated

**Git Bash note (Windows users):**
If running commands outside the IDE and seeing issues, ensure you're using Git Bash rather than Command Prompt or PowerShell.
