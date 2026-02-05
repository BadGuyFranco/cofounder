# Figma Connector Capabilities

What this connector can do for you.

## Files

- Get full file structure as JSON
- Get specific nodes from a file
- Get file metadata (name, last modified, thumbnail)
- Download entire file as JSON for offline analysis
- Access specific file versions

## Image Export

- Export frames, components, or any node as images
- Supported formats: PNG, JPG, SVG, PDF
- Scale exports from 0.01x to 4x
- Download exports directly to local files
- Get image fill URLs from files

## Comments

- List all comments on a file
- Post new comments
- Reply to existing comments
- Delete your own comments
- Add emoji reactions to comments
- Remove your reactions

## Components

- List published components in a team library
- List published components in a file
- Get component metadata by key
- List component sets (variants)
- Access component thumbnails and descriptions

## Styles

- List published styles in a team library
- List published styles in a file
- Get style metadata by key
- Access color, text, effect, and grid styles

## User Info

- Verify token setup
- Get current user profile

## Limitations

- **No file creation:** Figma API is read-only for file content
- **No editing:** Cannot modify file content via API
- **Projects endpoint:** Requires private OAuth apps (not supported with PAT)
- **Variables:** Enterprise plan only
- **Library Analytics:** Enterprise plan only
- **Rate limits:** 10-150 requests/minute depending on endpoint tier and plan
- **Image expiration:** Export URLs expire after 30 days
- **Max image size:** 32 megapixels (larger exports are scaled down)
