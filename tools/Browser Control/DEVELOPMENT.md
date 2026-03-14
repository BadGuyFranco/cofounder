# Browser Control Development

Extension and customization patterns for Browser Control.

## Site Guides

Site-specific automation patterns help agents work with particular websites. Two locations:

| Location | Purpose |
|----------|---------|
| `/memory/tools/browser-control/sites/` | User overrides (checked first) |
| `/cofounder/tools/Browser Control/sites/` | Shared defaults (fallback) |

**Loading precedence:** User file wins. If no user file exists, use cofounder version.

**Fork model:** Creating a user file means you own that site's patterns. You get full control but cofounder updates won't flow to your version. Don't create a user file if you want automatic improvements.

### Adding a New Site Guide

Create `sites/[SiteName].md` with:

- Base URL patterns
- Capabilities table
- Authentication notes
- Common workflows (using MCP tool names and/or CLI commands)
- Known quirks
- Failure patterns

See existing site guides for examples.

## MCP Server Configuration

The launcher script (`start-mcp.js`) accepts pass-through arguments for the Playwright MCP server. Common options:

| Flag | Purpose |
|------|---------|
| `--browser <name>` | Browser to use: chromium (default), chrome, firefox, webkit, msedge |
| `--headless` | Run without visible window |
| `--caps vision` | Enable vision-based interactions (screenshot analysis) |
| `--caps pdf` | Enable PDF generation |
| `--save-trace` | Save Playwright trace for debugging |
| `--save-video 800x600` | Record session video |
| `--proxy-server <url>` | Route through proxy |
| `--device "iPhone 15"` | Emulate a device |
| `--viewport-size 1280x720` | Set viewport dimensions |

To add flags, edit the `args` array in the MCP config files (`.cursor/mcp.json` and `.mcp.json`):

```json
{
  "mcpServers": {
    "playwright": {
      "command": "node",
      "args": ["tools/Browser Control/start-mcp.js", "--caps", "vision,pdf"]
    }
  }
}
```

## CLI Scripts

The CLI scripts in `scripts/` use a local HTTP server architecture. `session.js start` launches the server and browser; individual scripts send commands to it.

Scripts can be extended or new ones added following the existing pattern. See `scripts/utils.js` for the shared communication layer.

## Profile Management

Both MCP and CLI share the same profile directory: `~/.browser-control/profiles/default/`. Login data persists across sessions regardless of which interface is used.
