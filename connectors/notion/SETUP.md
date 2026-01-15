# Notion Connector Setup

**Path Resolution:** `/cofounder/` and `/memory/` are workspace roots. Resolve from `user_info.Workspace Paths` before running commands.

## Step 1: Create a Notion Integration

1. Go to [notion.so/my-integrations](https://www.notion.so/my-integrations)
2. Click "New integration"
3. Name it (e.g., "Cofounder Connector")
4. Select the workspace you want to connect
5. Click "Submit"

## Step 2: Get Your API Key

1. After creating the integration, you'll see an "Internal Integration Secret"
2. Click "Show" then "Copy"
3. The key starts with `secret_`

## Step 3: Provide Credentials

Once you have your API key, provide it to the AI. The AI will create the configuration file.

**Required credential:**
- `NOTION_API_KEY` - Your Internal Integration Secret (starts with `secret_`)

**File location:** `/memory/connectors/notion/.env`

## Step 4: Connect Integration to Pages/Databases

**Critical:** Your integration can only access pages and databases you explicitly share with it.

For each page or database you want to access:

1. Open the page or database in Notion
2. Click the "..." menu (top right)
3. Click "Add connections"
4. Search for and select your integration name
5. Click "Confirm"

**Note:** If a page is inside another page, you need to connect the integration to the parent page as well (or the child page directly).

## Step 5: Verify Setup

The AI will install dependencies and run the verification (searches for pages containing "test"). May return empty results if no matches.

## Permissions

When creating your integration, you can configure:

| Permission | Description |
|------------|-------------|
| Read content | Read pages and databases |
| Update content | Modify existing pages and database entries |
| Insert content | Create new pages and database entries |

For full functionality, enable all three.

## Security Notes

- Keep your API key secret; it provides full access to connected pages
- The integration can only access pages you explicitly share with it
- Revoking access: Remove the integration from pages, or delete the integration entirely

## Troubleshooting

**"Unauthorized" errors:**
- Verify the API key in your `.env` file
- Ensure the key starts with `secret_`

**"Object not found" errors:**
- The integration hasn't been connected to the page/database
- Follow Step 4 to add the connection

**Integration not appearing in "Add connections":**
- Make sure you're in the same workspace where you created the integration
- Try refreshing the Notion page
