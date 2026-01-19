# Update CoFounder

Pull the latest CoFounder toolkit from the repository.

## Step 1: Find CoFounder Directory

Locate the `/cofounder/` directory in the current workspace. This is where the update command will run.

## Step 2: Run Update Command

Run git pull from the cofounder directory:

```bash
cd "COFOUNDER_PATH" && git pull
```

Replace `COFOUNDER_PATH` with the actual path to the cofounder directory.

## Step 3: Confirm

If the pull succeeds, tell the user: "CoFounder updated to the latest version."

If the output shows "Already up to date", tell the user: "CoFounder is already at the latest version."

## Step 4: Version Check

After update completes, verify `/memory/system/version.txt` matches `/cofounder/system/version.txt`.

If mismatch or `/memory/system/version.txt` missing → Follow `/cofounder/system/migrations/AGENTS.md`

## Troubleshooting

### "Invalid or revoked API key" or authentication failure

The user's subscription may have lapsed. Tell them to check their email for a new API key or contact support.

If they have a new key, they'll need to update the git remote:

```bash
cd "COFOUNDER_PATH" && git remote set-url origin "https://x:NEW_API_KEY@cofounder.wisermethod.com/git/cofounder.git"
```

### "Permission denied" on Windows

Verify the workspace file has the Git Bash terminal settings configured (see Continue Install.md Step 5).

### "fatal: not a git repository"

The cofounder directory was installed with the old zip method. The user needs to reinstall using the new git-based installer. Have them:

1. Delete the existing cofounder/ folder
2. Re-run the install prompt from their welcome email

Their memory/, workspaces/, and personal workspace folders will be preserved.
