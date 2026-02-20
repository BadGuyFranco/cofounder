# DataForSEO - Setup

## Step 1: Create a Free Account

Go to `https://app.dataforseo.com/register` and sign up with your email and a password.

No credit card is required. You receive a $1 credit automatically for testing.

## Step 2: Confirm Your Email

Check your inbox for a confirmation email and click the verification link.

## Step 3: Get Your API Password

Your API password is **not** your account login password. DataForSEO generates a separate password specifically for API access.

1. Log in to `app.dataforseo.com`
2. Go to `https://app.dataforseo.com/api-access`
3. Copy the password shown there (it looks like a hex string, e.g., `9e774f627722b594`)

## Step 4: Save Your Credentials

Create the file `/memory/connectors/dataforseo/.env` with your login email and the API password from Step 3:

```
DATAFORSEO_LOGIN=your@email.com
DATAFORSEO_PASSWORD=your_api_password_from_api-access_page
```

Your login email is your account email. The password is the one from `app.dataforseo.com/api-access`, not your account login password.

## Step 4: Install Dependencies

From inside the `connectors/dataforseo/` directory, run:

```bash
npm install
```

## Step 5: Test the Connection

From the cofounder workspace root:

```bash
node connectors/dataforseo/scripts/labs.js domain-overview --domain example.com
```

You should see organic keyword and traffic data for example.com. If you see an error, verify your credentials in the `.env` file.

## Step 6: Add Credits (When Ready)

Your $1 free credit is enough for testing. For production use, add a minimum of $50 at `app.dataforseo.com/billing`.

Credits never expire. At typical usage rates (a few audits per month), $50 lasts years.

**Note on Labs API coverage:** The Labs API (domain overview, ranked keywords, keyword gap) requires the target domain to have sufficient traffic history in DataForSEO's index. Smaller or newer domains may return "No domain data available" regardless of credit balance. The SERP API (rank-check) works for all domains regardless of size and is a reliable fallback. Labs coverage generally improves as a domain grows its organic traffic.

## Notes

- DataForSEO uses your email and password directly for HTTP Basic authentication
- There is no OAuth flow and no API key to generate separately
- Your credentials grant access to all DataForSEO APIs with no scope restrictions
- If you change your password at app.dataforseo.com, update the `.env` file to match
