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
- Common workflows
- Known quirks
- Failure patterns

See existing site guides for examples.
