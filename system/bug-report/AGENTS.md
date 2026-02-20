# Bug Report

Submit CoFounder bug reports to the maintainer via Zoho CRM Web Form.

No user-side Zoho credentials required. Reports are sent to a public Web Form URL that creates Cases in the maintainer's Zoho CRM. If the web form is not configured, reports save locally.

## When to Use

This file covers two workflows:

1. **Submit a report** (proactive). Offer when something in `/cofounder/` is not working as expected.
2. **Review open reports** (on request). When the maintainer says "review bugs," "triage bugs," or similar.

### When to offer a report

Offer when any `/cofounder/` component is not working as expected:
- A script crashes or exits with an error
- A tool produces wrong or unexpected output
- A documented workflow or AGENTS.md leads to a dead end
- A setup step does not work as described
- Behavior does not match what CAPABILITIES.md or README.md promises

The failing component must live under `/cofounder/`, not `/memory/my tools/` or `/memory/my connectors/`.

Do NOT offer a bug report for:
- User-created tools or connectors (help them debug instead)
- Missing credentials or setup issues (walk through SETUP.md)
- Expected validation errors ("--field is required")
- Network timeouts or transient API failures

## Workflow

### Step 1: Check for pending artifacts

Error artifacts are automatically captured at `/memory/bug-reports/pending/` when cofounder scripts fail via `outputError()`.

If a pending artifact exists for the current failure, use it as the base. If not (e.g., the error was observed by the agent but did not go through `outputError()`), build the report manually.

### Step 2: Enrich the report

Ask the user:
- "What were you trying to do when this happened?" (one sentence)
- **Only if** `/memory/system/cofounder-api-key.json` exists: "Would you like to be notified by email when this is fixed?" (yes/no)
- "Is there anything else that might help debug this?" (optional)

Combine user context with the error artifact or your own observations. Always include:
- **agent-context**: which AGENTS.md workflow, command sequence, or step you were executing when the failure happened. This is the "where to look" for the maintainer.
- **command**: the exact node command that was run (the agent knows this; do not ask the user).

If the user wants notification, add `--notify` to the submit command. The script reads their CoFounder API key from the file and includes it in the report. If the key file does not exist, skip the notification question entirely; the user installed before this feature was added.

### Step 3: Submit

Run the submit script:

```
node system/bug-report/scripts/submit.js submit \
  --component "tools/Image Generator" \
  --summary "Short description of the failure" \
  --error "The error message" \
  --context "What the user was doing" \
  --agent-context "Following Image Generator AGENTS.md, SVG to PNG workflow, step 3" \
  --command "node tools/Image Generator/scripts/svg-to-png.js --input logo.svg --output logo.png" \
  --script "tools/Image Generator/scripts/svg-to-png.js" \
  --stack "First few lines of stack trace" \
  --notify \
  --os "darwin 25.2.0" \
  --node "v22.0.0"
```

Or submit a pending artifact directly:

```
node system/bug-report/scripts/submit.js submit-artifact \
  --file /memory/bug-reports/pending/<filename>.json \
  --context "What the user was doing" \
  --agent-context "Which workflow step was being executed" \
  --notify
```

Omit `--notify` if the user declined notification.

### Step 4: Confirm

Tell the user the bug report was submitted. Include:
- If notification was requested and an API key was found: "You'll receive an email when this is resolved."
- If notification was requested but no API key was found: "Notification could not be set up because your CoFounder API key was not found. Re-running your original install command will save it for next time."
- If the web form is not configured, the script saves the report locally at `/memory/bug-reports/submitted/` and tells the user.

## Commands

### submit.js (user-side, no Zoho credentials needed)

| Command | Purpose |
|---------|---------|
| `submit` | Submit a bug report with individual fields |
| `submit-artifact` | Submit from a pending error artifact file |
| `list` | List pending error artifacts |
| `help` | Show usage |

## How It Works

**Bug submission:** The submit script POSTs form data to a Zoho CRM Web Form (a public URL that creates Cases without authentication). The Web Form URL and its required hidden fields are stored in `system/bug-report/config.json`. When the form is submitted, Zoho CRM creates a Case record. If the user opted in to notification, the Case includes their CoFounder API key (from `/memory/system/cofounder-api-key.json`) and a `Notify_On_Fix` flag.

**Resolution notification:** Two steps work together. First, when the agent resolves a Case during the Review Workflow, it looks up the Contact by `CoFounder_API_Key`, copies their email to the Case's Email field, and sets Status to "Resolved". Then a Zoho CRM Workflow Rule fires automatically: when Status changes to "Resolved" and `Notify_On_Fix` is "true", Zoho sends a "your bug is fixed, update CoFounder" email to the address in the Case's Email field. The user's email is never stored on their machine; it is resolved from the maintainer's Zoho Contacts at resolve time using the `cf_` key as the lookup.

If `config.json` has no web form URL, reports are saved as local markdown files.

## Review Workflow

When the maintainer says "review bugs" or similar:

### Step 1: Fetch open Cases

```
node connectors/zoho/scripts/search.js search "CoFounder" --module Cases --org first-strategy
```

### Step 2: Show the list

Present each Case with its subject, severity, and date. Ask which one to work on first, or offer to go through them in priority order (High first).

### Step 3: Pull the full report

```
node connectors/zoho/scripts/records.js get <case_id> --module Cases --org first-strategy
```

The Description field contains the structured bug report. Read the "What broke," "How to reproduce," "Context," and "Where to look" sections.

### Step 4: Investigate and fix

1. Read the script identified in "Where to look"
2. Reproduce the issue using the command in "How to reproduce"
3. Fix the root cause
4. Test the fix

### Step 5: Resolve

Before marking the Case as resolved, check if the user requested notification:

1. Read the Case's `Notify_On_Fix` and `CoFounder_API_Key` fields from the record fetched in Step 3.

2. If `Notify_On_Fix` is "true" and `CoFounder_API_Key` has a value, look up the Contact's email:

```
node connectors/zoho/scripts/search.js search "<CoFounder_API_Key_value>" --module Contacts --org first-strategy
```

Then fetch the matched Contact to get their email:

```
node connectors/zoho/scripts/records.js get <contact_id> --module Contacts --org first-strategy
```

3. Write the Contact's email to the Case's Email field, then set Status to Resolved in a single update:

```
node connectors/zoho/scripts/records.js update <case_id> --module Cases --org first-strategy --field-Email "user@example.com" --field-Status "Resolved"
```

4. If `Notify_On_Fix` is "false", no API key is present, or no Contact is found, skip the email lookup and just resolve:

```
node connectors/zoho/scripts/records.js update <case_id> --module Cases --org first-strategy --field-Status "Resolved"
```

The Zoho Workflow Rule fires on status change to "Resolved" and sends the notification email to the Cases Email field automatically. No additional script is needed.

## Severity Guidelines

| Severity | Criteria |
|----------|----------|
| High | Script crashes, data loss, blocks user workflow |
| Medium | Unexpected output, partial failure, workaround exists |
| Low | Cosmetic issue, documentation mismatch, minor inconvenience |
