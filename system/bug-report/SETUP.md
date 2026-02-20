# Bug Report Setup

Maintainer-only setup. Configures Zoho CRM to receive bug reports from CoFounder users and automatically notify them when bugs are fixed.

Uses native Zoho CRM Professional features only (Web Forms and Workflow Rules). No Custom Functions or Enterprise edition required.

## Prerequisites

The Cases module needs two custom fields. If they were created during the previous Custom Function setup, they already exist.

1. Go to **Setup > Customization > Modules and Fields > Cases**
2. Confirm these fields exist (or create them):

| Field Label | API Name | Type | Length |
|---|---|---|---|
| CoFounder API Key | CoFounder_API_Key | Single Line | 200 |
| Notify On Fix | Notify_On_Fix | Single Line | 10 |

The Contacts module should already have a `CoFounder_API_Key` field (same name) used to identify users.

## Part 1: Bug Report Submission (Web Form)

A Zoho CRM Web Form provides a public POST URL that creates Cases without authentication.

### Step 1: Create the Web Form

1. Go to **Setup > Developer Space > Webforms**
2. Click **New Form**
3. Select **Cases** as the module
4. Name it "CoFounder Bug Report"

### Step 2: Add Fields

Drag these fields from the left panel into the form:

- Subject
- Description
- Priority
- Status
- Type
- Case Origin
- CoFounder API Key
- Notify On Fix

### Step 3: Mark Custom Fields as Hidden

For the fields that the script fills automatically (users will never see this form visually):

1. Click each field in the form builder
2. In Field Properties, check **"Set as Hidden Field"** for:
   - CoFounder API Key
   - Notify On Fix
   - Case Origin
   - Type
   - Status
   - Priority

Subject and Description can remain visible (they are required fields).

### Step 4: Disable Captcha

Since this form is submitted by a script (not a browser), disable spam protection:

1. In the form settings/advanced options, uncheck any reCAPTCHA or captcha options

### Step 5: Save and Get the Embed Code

1. Click **Save**
2. Click **Embed Options** (or the embed/publish button)
3. Choose **HTML/Source Code** embed type
4. Copy the generated HTML

### Step 6: Extract the Form URL and Hidden Fields

From the generated HTML, find:

1. The `action` attribute of the `<form>` tag. This is your **Web Form URL**.
2. All `<input type="hidden">` fields. These are metadata Zoho needs.

Example (your values will differ):

```html
<form action="https://crm.zoho.com/crm/WebToCase" method="POST">
  <input type="hidden" name="xnQsjsdp" value="abc123..." />
  <input type="hidden" name="xmIwtLD" value="def456..." />
  <input type="hidden" name="returnURL" value="https://..." />
  ...
</form>
```

### Step 7: Configure CoFounder

Open `system/bug-report/config.json` and set:

```json
{
  "webFormUrl": "https://crm.zoho.com/crm/WebToCase",
  "webFormHiddenFields": {
    "xnQsjsdp": "abc123...",
    "xmIwtLD": "def456...",
    "returnURL": "https://example.com"
  }
}
```

- `webFormUrl`: the `action` URL from the form tag
- `webFormHiddenFields`: every hidden input name/value pair from the generated HTML

### Step 8: Test Bug Submission

```
node system/bug-report/scripts/submit.js submit \
  --component "system/bug-report" \
  --summary "Test bug report" \
  --error "This is a test" \
  --notify \
  --severity Low
```

Check the Cases module for a new case with Subject "[CoFounder Bug] system/bug-report - Test bug report". Delete the test case after confirming.

## Part 2: Resolution Notification (Workflow Rule)

A Workflow Rule automatically emails the user when a Case is resolved. No script needed on the CoFounder side.

### Step 1: Create an Email Template

1. Go to **Setup > Customization > Email Templates** (or **Setup > Automation > Email Templates**)
2. Click **New Template**
3. Select **Cases** as the module
4. Name: "CoFounder Bug Fixed"
5. From: shawna@wisermethod.com (must be configured as an Organization Email)
6. Subject: "CoFounder Update Available: Bug Fix"
7. Body (HTML):

```html
<p>Hi there,</p>

<p>Good news! A bug you reported has been resolved:</p>

<p><strong>${Cases.Subject}</strong></p>

<p>To get the fix, open your IDE and type: <strong>update cofounder</strong></p>

<p>That is it. The update will pull the latest version with the fix included.</p>

<p>Thanks for reporting this. It helps make CoFounder better for everyone.</p>

<p>Anthony</p>
```

8. Click **Save**

Note: `${Cases.Subject}` is a merge field that Zoho replaces with the actual Case subject. Check Zoho's template editor for the exact merge field syntax available in your edition.

### Step 2: Use the Cases Email field

The resolve workflow writes the Contact email directly to the Case `Email` field, then sets Status to `Resolved` in the same update.

Confirm the Cases module has a usable `Email` field and that it can be selected as a recipient in Workflow email actions.

### Step 3: Create the Workflow Rule

1. Go to **Setup > Automation > Workflow Rules**
2. Click **Create Rule**
3. Select **Cases** as the module
4. Rule name: "CoFounder Bug Fix Notification"
5. **When to execute:**
   - Select **"On a record action"** > **"Edit"**
6. **Condition:**
   - Status is "Resolved" AND Notify On Fix is "true"
7. **Instant Action:**
   - Click **Email Notification**
   - Recipients: use the Cases `Email` field
   - Template: select "CoFounder Bug Fixed"
8. Click **Save**

### Step 4: Verify Organization Email

Make sure `shawna@wisermethod.com` is configured as an Organization Email:

1. Go to **Setup > General > Organization Emails**
2. Confirm shawna@wisermethod.com is listed and verified

### Step 5: Test the Notification

1. Open a test Case in Zoho CRM
2. Set `Notify_On_Fix` to "true" and set the Case `Email` field to your email
3. Change Status to "Resolved"
4. Check your inbox for the notification email

## Part 3: User Token Storage

During Continue Install, the user's `cf_` API key is extracted from their install URL and saved to `/memory/system/cofounder-api-key.json`. This happens automatically for new installs.

For existing users who installed before this feature, the key is not saved. If they request notification on a bug report, the agent will let them know they can re-run their original install command to save it.

## Cleanup: Remove Custom Functions

If you previously set up Custom Functions (Enterprise feature), you can now remove them:

1. Go to **Setup > Developer Hub > Functions**
2. Delete `cofounder_bug_report`
3. Delete `cofounder_notify_fix`
4. Revoke any API keys that were only used for these functions

## Security Notes

- The Web Form URL is public by design but only allows creating Cases
- No authentication tokens are exposed in the CoFounder codebase
- Notification emails are sent by Zoho's Workflow Rule engine, not by any external script
- The user's CoFounder API key is stored locally in `/memory/` (not committed to git)
- To disable bug reporting, clear the `webFormUrl` in `config.json`
- Notification is automatic; to disable it, deactivate the Workflow Rule in Zoho CRM

## Fallback Behavior

If the web form is not configured or submission fails, reports are saved locally as markdown files at `/memory/bug-reports/submitted/`.
