# Update CoFounder

Pull the latest CoFounder toolkit from the repository.

## Step 1: Find CoFounder Directory

Locate the `/cofounder/` directory in the current workspace. This is where the update command will run.

## Step 2: Run Update Command

Detect the operating system and run git pull from the cofounder directory.

**Mac/Linux:**

```bash
cd "COFOUNDER_PATH" && git pull
```

**Windows (must use Git Bash):**

```bash
& "C:\Program Files\Git\bin\bash.exe" -c "cd 'COFOUNDER_PATH' && git pull"
```

Replace `COFOUNDER_PATH` with the actual path to the cofounder directory.

For Windows, convert the path to Git Bash format. Example: `/c/Users/Name/Documents/CoFounder/cofounder`

## Step 3: Confirm

If the pull succeeds, tell the user: "CoFounder updated to the latest version."

If the output shows "Already up to date", tell the user: "CoFounder is already at the latest version."

## Troubleshooting

### "Invalid or revoked API key" or authentication failure

The user's subscription may have lapsed. Tell them to check their email for a new API key or contact support.

If they have a new key, they'll need to update the git remote:

```bash
cd "COFOUNDER_PATH" && git remote set-url origin "https://x:NEW_API_KEY@cofounder.wisermethod.com/git/cofounder.git"
```

### "Permission denied" on Windows

Ensure the command runs in Git Bash, not PowerShell or cmd.

### "fatal: not a git repository"

The cofounder directory was installed with the old zip method. The user needs to reinstall using the new git-based installer. Have them:

1. Delete the existing cofounder/ folder
2. Re-run the install prompt from their welcome email

Their memory/, workspaces/, and personal workspace folders will be preserved.
