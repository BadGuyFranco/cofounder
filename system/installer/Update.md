# Update CoFounder

Pull the latest CoFounder toolkit from the repository.

## Step 1: Read API Key

Read the user's API key from `~/.cofounder/config.json`. The file contains:

```json
{
  "apiKey": "cf_...",
  "machineId": "...",
  "installedAt": "..."
}
```

Extract the `apiKey` value. If the file doesn't exist or has no key, stop and tell the user:

"I can't find your CoFounder API key. Check your email for the key that starts with `cf_` and paste it here."

## Step 2: Determine Install Directory

The install directory is the parent folder of `/cofounder/`. This is where the update command must run.

For example, if `/cofounder/` is at `/Users/name/Documents/CoFounder/cofounder/`, the install directory is `/Users/name/Documents/CoFounder/`.

## Step 3: Run Update Command

Detect the operating system and run the appropriate command from the install directory.

**Mac/Linux:**

```bash
cd "INSTALL_DIR" && curl -fsSL "https://cofounder.wisermethod.com/install?key=API_KEY" | sh
```

**Windows (must use Git Bash):**

```bash
"C:\Program Files\Git\bin\bash.exe" -c 'cd "INSTALL_DIR" && curl -fsSL "https://cofounder.wisermethod.com/install?key=API_KEY" | sh'
```

For Windows paths, convert backslashes to forward slashes. Example: `C:/Users/Name/Documents/CoFounder`

Replace `INSTALL_DIR` with the actual path from Step 2.
Replace `API_KEY` with the key from Step 1.

## Step 4: Copy Settings to Memory

After the update completes, copy the terminal settings to memory:

```bash
cp -r cofounder/.vscode memory/.vscode
```

This ensures Windows users continue to use Git Bash for terminal commands.

## Step 5: Confirm

Tell the user: "CoFounder updated to the latest version."

## Troubleshooting

### "API key invalid"

The key may have been revoked. Contact support or check for a new key in email.

### "Permission denied" on Windows

Ensure the command runs in Git Bash, not PowerShell or cmd.

### Update didn't change anything

The installer downloads from R2. If a new release hasn't been pushed yet, the files will be the same. This is normal.
