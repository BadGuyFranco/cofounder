# Publer Connector Capabilities

Complete reference for all available features and commands.

## Scripts Overview

| Script | File | Purpose |
|--------|------|---------|
| User | `scripts/user.js` | User profile and credentials verification |
| Workspaces | `scripts/workspaces.js` | Workspace and social account management |
| Posts | `scripts/posts.js` | Post creation, scheduling, and management |
| Media | `scripts/media.js` | Media library and file uploads |
| Analytics | `scripts/analytics.js` | Performance metrics and insights |

## User Management (`user.js`)

**Commands:**

| Command | Description |
|---------|-------------|
| `me` | Get current authenticated user profile |

**Example:**
```bash
node scripts/user.js me --verbose
```

## Workspace Management (`workspaces.js`)

**Commands:**

| Command | Description |
|---------|-------------|
| `list` | List all workspaces |
| `current` | Get current workspace details |
| `accounts` | List connected social accounts |
| `account <id>` | Get specific account details |

**Examples:**
```bash
node scripts/workspaces.js list
node scripts/workspaces.js accounts
node scripts/workspaces.js account acc123 --verbose
```

## Post Management (`posts.js`)

**Commands:**

| Command | Description |
|---------|-------------|
| `list` | List posts with optional filters |
| `get <id>` | Get post by ID |
| `create` | Create new post |
| `update <id>` | Update existing post |
| `delete <id>` | Delete post |
| `duplicate <id>` | Duplicate post |
| `reschedule <id> <time>` | Reschedule post |

**List Options:**

| Option | Description |
|--------|-------------|
| `--status <status>` | Filter by status (scheduled, draft, published, failed) |
| `--account <id>` | Filter by social account |
| `--from <date>` | Filter from date (YYYY-MM-DD) |
| `--to <date>` | Filter to date (YYYY-MM-DD) |
| `--limit <n>` | Number of posts to return |
| `--page <n>` | Page number |

**Create Options:**

| Option | Description |
|--------|-------------|
| `--text <text>` | Post text content |
| `--accounts <ids>` | Comma-separated account IDs (required) |
| `--schedule <datetime>` | Schedule time (ISO 8601) |
| `--draft` | Create as draft |
| `--now` | Publish immediately |
| `--media <ids>` | Comma-separated media IDs |
| `--link <url>` | Link URL |
| `--link-title <title>` | Link preview title |
| `--link-description <d>` | Link preview description |
| `--location <location>` | Location tag |
| `--first-comment <text>` | First comment (Instagram) |
| `--labels <labels>` | Comma-separated labels |
| `--customizations <json>` | Platform-specific options (JSON) |

**Examples:**
```bash
# List scheduled posts
node scripts/posts.js list --status scheduled

# Create draft
node scripts/posts.js create --text "Draft content" --accounts acc1

# Create and schedule
node scripts/posts.js create --text "Hello world!" --accounts acc1,acc2 --schedule "2025-01-15T10:00:00"

# Publish immediately
node scripts/posts.js create --text "Live now!" --accounts acc1 --now

# Create with media
node scripts/posts.js create --text "Check this out!" --accounts acc1 --media media123

# Create with link
node scripts/posts.js create --text "Read more:" --accounts acc1 --link "https://example.com"

# Update post
node scripts/posts.js update post123 --text "Updated content"

# Reschedule
node scripts/posts.js reschedule post123 "2025-01-20T14:00:00"
```

## Media Management (`media.js`)

**Commands:**

| Command | Description |
|---------|-------------|
| `list` | List media assets |
| `get <id>` | Get media by ID |
| `upload <filepath>` | Upload from local file |
| `upload-url <url>` | Upload from URL |
| `delete <id>` | Delete media |
| `folders` | List folders |
| `create-folder <name>` | Create folder |
| `move <id> <folder-id>` | Move media to folder |

**List Options:**

| Option | Description |
|--------|-------------|
| `--type <type>` | Filter by type (image, video, gif, document) |
| `--folder <id>` | Filter by folder |
| `--search <query>` | Search by name |
| `--limit <n>` | Number of items |
| `--page <n>` | Page number |

**Upload Options:**

| Option | Description |
|--------|-------------|
| `--name <name>` | Custom name |
| `--folder <id>` | Target folder |
| `--description <desc>` | Description |

**Supported File Types:**
- Images: jpg, jpeg, png, gif, webp, svg, bmp
- Videos: mp4, mov, avi, webm, mkv, m4v
- Documents: pdf, doc, docx

**Examples:**
```bash
# List all media
node scripts/media.js list

# List images only
node scripts/media.js list --type image

# Upload image
node scripts/media.js upload /path/to/image.jpg

# Upload with name to folder
node scripts/media.js upload /path/to/logo.png --name "Company Logo" --folder folder123

# Upload from URL
node scripts/media.js upload-url "https://example.com/image.jpg"

# Create folder
node scripts/media.js create-folder "Marketing Assets"
```

## Analytics (`analytics.js`)

**Commands:**

| Command | Description |
|---------|-------------|
| `summary` | Get analytics overview |
| `charts` | Get dashboard charts |
| `post <id>` | Get specific post analytics |
| `posts` | Get post insights |
| `hashtags` | Get hashtag analysis |
| `best-times` | Get best posting times |
| `members` | Get team member activity |
| `competitors` | Get competitor analysis |

**Date Range Options:**

| Option | Description |
|--------|-------------|
| `--start <date>` | Start date (YYYY-MM-DD) |
| `--end <date>` | End date (YYYY-MM-DD) |
| `--period <period>` | Predefined period (7d, 30d, 90d, 12m) |

**Filter Options:**

| Option | Description |
|--------|-------------|
| `--account <id>` | Filter by account |
| `--sort <field>` | Sort field |
| `--order <order>` | Sort order (asc, desc) |
| `--limit <n>` | Number of results |
| `--page <n>` | Page number |

**Examples:**
```bash
# Get summary for last 30 days
node scripts/analytics.js summary --period 30d

# Get charts
node scripts/analytics.js charts --account acc123 --period 7d

# Get post analytics
node scripts/analytics.js post post123

# Get top posts by engagement
node scripts/analytics.js posts --sort engagement --order desc --limit 10

# Get hashtag performance
node scripts/analytics.js hashtags --period 30d

# Get best posting times
node scripts/analytics.js best-times --account acc123

# Get competitor insights
node scripts/analytics.js competitors --account acc123
```

## Platform Support

**Supported Platforms:**
- Facebook (pages, groups)
- Instagram (posts, stories, reels)
- X/Twitter
- LinkedIn (profiles, company pages)
- Pinterest
- TikTok
- YouTube
- Google Business Profile
- Telegram
- WordPress

**Platform-Specific Features:**

Use `--customizations` with JSON for platform-specific options:

```bash
# Instagram first comment
node scripts/posts.js create --text "Post" --accounts insta1 --first-comment "#hashtags #here"

# Custom per platform
node scripts/posts.js create --text "Default text" --accounts fb1,tw1 --customizations '{"fb1":{"text":"Facebook version"},"tw1":{"text":"Twitter version"}}'
```

## Rate Limits

- 100 requests per 2 minutes per user
- Scripts auto-pause when approaching limits
- Use `--verbose` to see rate limit status

## All Scripts Support

| Option | Description |
|--------|-------------|
| `--verbose` | Show full API responses |
| `help` | Show command help |
