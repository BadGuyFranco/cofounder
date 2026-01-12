# Supabase Connector Setup

## Overview

This connector uses a **two-tier authentication system**:

1. **Account Access Token** - Manages all your projects (create, delete, get keys)
2. **Project Credentials** - Per-project API keys for database/storage/auth operations

You only need to manually create the Access Token. Project credentials are auto-retrieved.

## Step 1: Create Supabase Account

1. Go to https://supabase.com
2. Click "Start your project" or "Sign Up"
3. Sign up with GitHub, email, or SSO
4. Verify your email if required

## Step 2: Create Personal Access Token

1. Go to https://supabase.com/dashboard/account/tokens
2. Click "Generate new token"
3. Give it a name (e.g., "Cofounder Connector")
4. Copy the token immediately (shown only once)

The token looks like: `sbp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`

## Step 3: Provide Credentials

Once you have your Personal Access Token, provide it to the AI. The AI will create the configuration file.

**Required credential:**
- `SUPABASE_ACCESS_TOKEN` - Your Personal Access Token (starts with `sbp_`)

**File location:** `/memory/Connectors/supabase/.env`

## Step 4: Verify Setup

The AI will install dependencies and run the verification. You should see a list of your projects (or "No projects found" if you haven't created any).

## Step 5: Configure a Project

If you have existing projects, configure one for local use:

```bash
# List projects
node scripts/management.js list

# Configure a project (auto-retrieves and saves API keys)
node scripts/management.js configure <project-ref>
```

Or create a new project:

```bash
# Create new project
node scripts/management.js create "my-dev-project" --region us-east-1

# Wait 1-2 minutes for provisioning, then configure
node scripts/management.js configure <new-project-ref>
```

## Step 6: Test the Connection

```bash
# List tables in your project
node scripts/tables.js list --project <project-ref>

# Check project health
node scripts/projects.js health --project <project-ref>
```

## Credential Storage

After setup, your credentials are stored at:

```
/memory/Connectors/supabase/
  .env                          # Account access token
  projects/
    <project-ref>.env           # Auto-generated project credentials
```

You never need to manually copy project API keys. The `management.js configure` command retrieves and stores them automatically.

## Working with Multiple Projects

Each project you configure gets its own credentials file. When running commands:

```bash
# If only one project configured, --project is optional
node scripts/tables.js list

# If multiple projects configured, specify which one
node scripts/tables.js list --project project-a
node scripts/records.js list users --project project-b
```

## Available Regions

When creating projects, you can specify a region:

| Region | Location |
|--------|----------|
| `us-east-1` | US East (N. Virginia) - Default |
| `us-west-1` | US West (N. California) |
| `eu-west-1` | Europe (Ireland) |
| `eu-west-2` | Europe (London) |
| `eu-central-1` | Europe (Frankfurt) |
| `ap-southeast-1` | Asia Pacific (Singapore) |
| `ap-northeast-1` | Asia Pacific (Tokyo) |
| `ap-south-1` | Asia Pacific (Mumbai) |
| `sa-east-1` | South America (Sao Paulo) |

## Access Token vs Project Keys

| Token Type | Scope | Used For |
|------------|-------|----------|
| Access Token | All projects in account | Creating projects, getting keys, management operations |
| Service Role Key | Single project | Database queries, storage, auth, functions |
| Anon Key | Single project | Client-side access (respects RLS) |

The connector uses:
- **Access Token** for `management.js` commands
- **Service Role Key** for all other project-specific commands

## Regenerating Tokens

**If your Access Token is compromised:**
1. Go to https://supabase.com/dashboard/account/tokens
2. Delete the compromised token
3. Generate a new one
4. Update `/memory/Connectors/supabase/.env`

**If project keys are compromised:**
1. Go to project Settings > API in dashboard
2. Regenerate keys
3. Run `node scripts/management.js configure <project-ref>` to update local config

## Free Tier Limits

- 2 free projects per account
- 500 MB database per project
- 1 GB file storage per project
- 2 GB bandwidth per month
- Projects pause after 1 week of inactivity

To restore a paused project:
```bash
node scripts/management.js restore <project-ref>
```

## Troubleshooting

**"Invalid access token":**
Token may be expired or revoked. Generate a new one at https://supabase.com/dashboard/account/tokens

**"No organizations found":**
You need at least one organization to create projects. Create one in the Supabase dashboard.

**"Project not found":**
Check the project reference is correct with `node scripts/management.js list`

**"Multiple projects configured":**
Specify which project to use with `--project <ref>`

**"Connection refused" / "Project paused":**
Free tier projects pause after inactivity. Restore with:
```bash
node scripts/management.js restore <project-ref>
```
