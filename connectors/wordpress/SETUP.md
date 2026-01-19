# WordPress Connector Setup

Step-by-step guide. The AI will walk you through each step one at a time.

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
- WordPress 5.6 or later (Application Passwords built-in)
- Administrator or Editor access to your WordPress site
- Permalinks enabled (not "Plain" setting)

## Step 1: Access Your WordPress Admin

Go to your WordPress admin dashboard:

```
https://yoursite.com/wp-admin
```

Log in with your administrator account.

**Tell the AI when done.**

## Step 2: Navigate to Application Passwords

1. Click **Users** in the left sidebar
2. Click **Profile** (or click your username)
3. Scroll down to **Application Passwords** section

If you don't see Application Passwords, your site may need:
- WordPress 5.6+ (check Dashboard > Updates)
- HTTPS enabled (required for Application Passwords)
- No security plugin blocking it

**Tell the AI when done.**

## Step 3: Create Application Password

In the **Application Passwords** section:

1. In the **New Application Password Name** field, enter:

```
Cofounder Connector
```

2. Click **Add New Application Password**

**Tell the AI when done.**

## Step 4: Copy Your Application Password

WordPress will display a new password like:

```
xxxx xxxx xxxx xxxx xxxx xxxx
```

**Copy this password immediately.** It will only be shown once.

**Provide the following to the AI:**
- Your site URL (e.g., `https://yoursite.com`)
- Your WordPress username
- The application password you just copied

The AI will create your configuration file.

## Step 5: Verify Setup

The AI will run:

```bash
node scripts/site.js verify
```

Expected output:
```
Connecting to: https://yoursite.com
Username: your_username

Connection successful!

Logged in as: Your Name (your_username)
User ID: 1
Roles: administrator
```

## Multi-Site Configuration

To manage multiple WordPress sites, create a subdirectory for each:

```
/memory/connectors/wordpress/
  myblog/.env      <- First site
  myshop/.env      <- Second site
```

Use `--site <name>` flag to specify which site:

```bash
node scripts/posts.js list --site myblog
node scripts/posts.js list --site myshop
```

## Troubleshooting

**"node: command not found" or "npm: command not found":** Node.js is not in your PATH. See `/cofounder/system/installer/dependencies/nodejs.md` troubleshooting section. Quick fix: Run `conda activate` first, then retry.

**Application Passwords not showing:**
- Ensure WordPress 5.6+
- Ensure site uses HTTPS
- Check if a security plugin is blocking it

**"401 Unauthorized" after setup:**
- Verify username is correct (case-sensitive)
- Verify password includes spaces: `xxxx xxxx xxxx xxxx xxxx xxxx`
- Try regenerating the Application Password

**"rest_no_route" errors:**
- Go to Settings > Permalinks
- Select any option except "Plain"
- Click Save (even if not changing anything)

**"403 Forbidden" for some operations:**
- Your user role may lack permissions
- Editors can manage posts but not users
- Authors can only manage their own content
