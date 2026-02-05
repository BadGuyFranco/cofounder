# Figma Connector

Connect to Figma to read files, export images, and manage comments.

## API Documentation

https://developers.figma.com/docs/rest-api/

## Quick Start

```bash
node scripts/users.js me
```

## Documentation Files

| File | Purpose |
|------|---------|
| `SETUP.md` | Step-by-step credential setup |
| `CAPABILITIES.md` | Available scripts, commands, and workflows |

## Configuration

**Credentials:** `/memory/connectors/figma/.env`

`/memory/` is a workspace root. Resolve from `user_info.Workspace Paths` before reading or creating this file.

```
FIGMA_PAT=figd_XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
```

**Not configured?** Follow `SETUP.md` to create your Personal Access Token.

**What can I do?** See `CAPABILITIES.md` for all available scripts and commands.

## Scripts

| Script | Purpose |
|--------|---------|
| `files.js` | Read file content, nodes, metadata; download as JSON |
| `images.js` | Export nodes as PNG, JPG, SVG, PDF |
| `comments.js` | List, post, delete comments and reactions |
| `components.js` | Access published components from libraries |
| `styles.js` | Access published styles from libraries |
| `users.js` | Get current user info (verify token) |

Run `node scripts/<script>.js help` for command details.

## Required Scopes

When creating a Personal Access Token, enable these scopes:

- `file_content:read` - Read files and export images
- `file_metadata:read` - Read file metadata
- `file_comments:read` - Read comments
- `file_comments:write` - Post and delete comments
- `library_content:read` - Read file components and styles
- `library_assets:read` - Get component/style by key
- `team_library_content:read` - Read team components and styles
- `current_user:read` - Read user info

## Troubleshooting

**"node: command not found" or setup issues:** Follow `SETUP.md` in this connector's directory.

**"FIGMA_PAT not found":** Create `/memory/connectors/figma/.env` with your token.

**"403 Forbidden":** Token is invalid, expired, or lacks required scopes. Generate a new PAT with correct scopes.

**"404 Not Found":** File key is incorrect or you don't have access to the file.

**"429 Too Many Requests":** Rate limit hit. Scripts auto-retry, but reduce request frequency.

**"No image URL returned":** Node ID is invalid, node is invisible, or has 0% opacity.

**Components/styles empty:** File must be published as a library. Check that components are published.
