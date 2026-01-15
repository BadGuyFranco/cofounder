# HeyGen Connector Setup

**Path Resolution:** `/cofounder/` and `/memory/` are workspace roots. Resolve from `user_info.Workspace Paths` before running commands.

## Prerequisites

- HeyGen account at https://heygen.com
- API access enabled (available on paid plans)

## Step 1: Log in to HeyGen

**Already have an account?**
1. Go to https://app.heygen.com
2. Sign in with your email and password

**Need to create an account?**
1. Go to https://app.heygen.com/signup
2. Create your account and select a plan with API access (Creator or higher)

## Step 2: Access Settings

1. Click on your profile/account icon in the bottom-left corner of the screen
2. A menu will appear
3. Click on "Settings"

## Step 3: Navigate to Usage & Billing

1. In the left sidebar, you'll see several options
2. Click on "Usage & Billing"

## Step 4: Go to the HeyGen API Tab

1. You'll see a page titled "Subscriptions & API"
2. At the top, there are two tabs: "HeyGen App" and "HeyGen API"
3. Click on the "HeyGen API" tab

## Step 5: Activate Your API Token

1. Scroll down to the "Advanced Settings" section
2. Find the "API Token" option
3. Click the blue "Activate" button

## Step 6: Copy Your API Key

1. A dialog box will appear with the title "API key generated"
2. Your API key will be displayed in a dark box
3. Click the blue "Copy to clipboard" button to copy your key
4. OR manually select and copy the text if preferred

**Important:** Save your API key somewhere safe. If you lose it, you'll need to regenerate a new one.

## Step 7: Provide Your API Key

Once you have your API key, provide it to the AI. The AI will configure everything for you.

## Step 8: Verify Setup

The AI will verify your connection by checking your account. You should see:
- Your remaining credits
- Confirmation that the connection is working

If you see an error instead, check that your API key was copied correctly.

## Multiple Accounts

To configure multiple HeyGen accounts, provide each account name and API key to the AI. For example:
- "personal" account with key ABC123
- "business" account with key XYZ789

When making requests, tell the AI which account to use.

## Plan Requirements

| Feature | Required Plan |
|---------|---------------|
| API Access | Creator plan or higher |
| Custom Avatars | Business plan or higher |
| Instant Avatars | Business plan or higher |
| Video Translation | Enterprise |

## Rate Limits

HeyGen rate limits vary by plan:
- Concurrent video generations are limited
- API calls per minute are limited
- Check your plan details for specific limits

## Regenerating Tokens

If your token is compromised or lost:

1. Go to Settings > Usage & Billing > HeyGen API tab
2. Scroll to Advanced Settings > API Token
3. Click to regenerate your token
4. Copy the new token and provide it to the AI to update the credentials file

## Troubleshooting

**"API not enabled":** API access requires a paid plan. Upgrade your HeyGen subscription.

**"Token not working":** Token may have been regenerated. Create a new one and update the config.

**"Cannot find API settings":** Go to Settings > Usage & Billing, then click the "HeyGen API" tab at the top of the page.
