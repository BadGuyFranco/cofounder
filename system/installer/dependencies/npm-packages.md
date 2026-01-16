# Installing npm Packages

When you see "Cannot find module" errors, you need to install the tool's npm packages.

**Windows users:** All commands must run in Git Bash, not PowerShell or cmd. No Git Bash? Install from https://gitforwindows.org first.

## Quick Fix

Navigate to the tool or connector directory and run:

```bash
npm install
```

## Examples

**For Image Generator:**
```bash
cd "/cofounder/connectors/replicate" && npm install
```

**For a specific connector:**
```bash
cd "/cofounder/connectors/[platform]" && npm install
```

## Troubleshooting

**"npm: command not found":**
Node.js is not installed. Follow `/cofounder/system/installer/dependencies/nodejs.md` first.

**"EACCES: permission denied":**
- Mac: Try `sudo npm install` (not recommended long-term)
- Better fix: `sudo chown -R $(whoami) ~/.npm`

**"Network error" or "ETIMEDOUT":**
Check your internet connection. If behind a proxy, configure npm: `npm config set proxy http://proxy:port`
