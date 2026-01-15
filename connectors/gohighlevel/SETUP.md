# Go High Level Connector Setup

**Path Resolution:** `/cofounder/` and `/memory/` are workspace roots. Resolve from `user_info.Workspace Paths` before running commands.

## Step 1: Get Your API Key

Go High Level offers two authentication methods:

### Option A: Private Integration Token (Recommended for personal use)

1. Log in to your GHL account
2. Go to **Settings** → **Integrations** → **API Keys**
3. Click **Create API Key**
4. Give it a name (e.g., "Cofounder Connector")
5. Select the scopes you need:
   - `contacts.readonly` and `contacts.write` for contact management
   - `opportunities.readonly` and `opportunities.write` for pipeline management
   - `locations.readonly` for location info
6. Click **Create**
7. Copy the API key (you won't be able to see it again)

### Option B: Agency/Location API Key

If you're an agency admin:

1. Go to **Agency Settings** → **API Keys**
2. Create a key with appropriate scopes
3. Note: This key can access all sub-accounts

## Step 2: Get Your Location ID

The Location ID identifies which sub-account to operate on:

1. Log in to your GHL sub-account
2. Go to **Settings** → **Business Info**
3. Look for **Location ID** (or **Company ID**)
4. It's a string like `ve9EPM428h8vShlRW1KT`

Alternatively, find it in the URL when logged into a location:
```
https://app.gohighlevel.com/v2/location/ve9EPM428h8vShlRW1KT/...
                                       ^^^^^^^^^^^^^^^^^^^^
                                       This is your Location ID
```

## Step 3: Provide Credentials

Once you have your API key and Location ID, provide them to the AI. The AI will create the configuration file.

**Required credentials:**
- `GHL_API_KEY` - Your Private Integration Token
- `GHL_LOCATION_ID` - Your Location/Company ID

**File location:** `/memory/connectors/gohighlevel/.env`

## Step 4: Verify Setup

The AI will install dependencies and run the verification. May return empty results if no matching contacts.

## API Scopes Reference

| Scope | Description |
|-------|-------------|
| `contacts.readonly` | Read contacts |
| `contacts.write` | Create/update/delete contacts |
| `opportunities.readonly` | Read opportunities and pipelines |
| `opportunities.write` | Create/update opportunities |
| `locations.readonly` | Read location/business info |
| `calendars.readonly` | Read calendar and appointments |
| `calendars.write` | Create/update appointments |
| `conversations.readonly` | Read messages |
| `conversations.write` | Send messages |

For full connector functionality, enable contacts and opportunities scopes.

## Security Notes

- Keep your API key secret; it provides access to your GHL data
- API keys can be revoked in Settings → API Keys
- Use the minimum scopes necessary for your use case
- Location ID is not sensitive but identifies which account to access

## Troubleshooting

**"Unauthorized" errors:**
- Verify the API key in your `.env` file
- Check that required scopes are enabled on the key
- API keys can expire; create a new one if needed

**"Location not found" errors:**
- Verify the Location ID in your `.env` file
- Ensure you're using the ID for the correct sub-account
- Agency keys need the location ID; location keys may not

**"Rate limit exceeded":**
- GHL allows 100 requests per 10 seconds
- Add delays between bulk operations
- Daily limit is 200,000 requests
