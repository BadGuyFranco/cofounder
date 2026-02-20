# Bing Webmaster Tools - Setup

## Step 1: Sign In to Bing Webmaster Tools

Go to `https://www.bing.com/webmasters/` and sign in with a Microsoft account.

If you do not have a Microsoft account, create one for free at `https://account.microsoft.com/`.

## Step 2: Add and Verify Your Sites

For each site you want to audit in the SEO Expert tool:

1. Click **Add a site** on the dashboard
2. Enter your site URL (e.g., `https://example.com`)
3. Choose a verification method:

   **Option A: XML file (recommended)**
   - Download the `BingSiteAuth.xml` file Bing provides
   - Upload it to the root of your site so it is accessible at `https://example.com/BingSiteAuth.xml`
   - Click **Verify**

   **Option B: Meta tag**
   - Copy the meta tag Bing provides (looks like `<meta name="msvalidate.01" content="XXXXXXXX">`)
   - Add it to the `<head>` section of your site's homepage
   - Click **Verify**

   **Option C: CNAME record**
   - Add the CNAME record Bing provides to your domain's DNS
   - Click **Verify** (DNS changes can take up to 24 hours)

Repeat this for each site.

## Step 3: Generate an API Key

1. In the Bing Webmaster Tools dashboard, click the **gear icon** (top right corner)
2. Select **API Access**
3. Click **Generate API Key**
4. Copy the key

The API key is tied to your Microsoft account and grants access to all verified sites in your account.

## Step 4: Save the API Key

Create the file `/memory/connectors/bing/.env` with:

```
BING_WEBMASTER_API_KEY=your_api_key_here
```

Replace `your_api_key_here` with the key from Step 3.

## Step 5: Verify the Connection

From the cofounder workspace root, run:

```bash
node connectors/bing/scripts/webmaster.js sites
```

You should see your verified sites listed. If you see an error, check the troubleshooting section in `AGENTS.md`.

## Step 6: Install Dependencies

If you get "Cannot find module" when running any command, run:

```bash
npm install
```

from inside the `connectors/bing/` directory.

## Notes

- The API key has no expiration but can be regenerated at any time from the dashboard
- Each Microsoft account has one API key; it applies to all verified sites in that account
- Bing Webmaster Tools is completely free, including the API
- If you have multiple Bing accounts for different clients, each account needs its own API key and its own `.env` configuration
