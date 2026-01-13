# WordPress Connector Capabilities

What this connector can do for you.

## Posts

- List posts with filters (status, author, category, tag, search)
- Get post details including content
- Create new posts (draft or published)
- Update post content, title, status
- Schedule posts for future publication
- Move posts to trash or permanently delete
- Restore posts from trash
- Assign categories and tags to posts
- Set featured images

## Pages

- List pages with filters
- Get page details including content
- Create new pages (draft or published)
- Update page content, title, status
- Set parent pages for hierarchy
- Set page templates
- Control menu order
- Move pages to trash or permanently delete

## Media

- List media files with filters (type, search)
- Upload images, videos, PDFs, and other files
- Get media details including dimensions and sizes
- Update media title, alt text, caption, description
- Delete media files
- View available image sizes

## Categories

- List all categories
- Get category details
- Create new categories
- Update category name, slug, description
- Set parent categories for hierarchy
- Delete categories

## Tags

- List all tags
- Get tag details
- Create new tags
- Update tag name, slug, description
- Delete tags

## Comments

- List comments with filters (status, post, author)
- Get comment details
- Create new comments
- Update comment content
- Approve or hold comments
- Mark comments as spam
- Move comments to trash
- Permanently delete comments

## Users

- Get current authenticated user info
- List users with filters (role, search)
- Get user details (name, email, bio, avatar)
- View user roles and capabilities

## Site

- Verify connection and credentials
- Get site information (name, description, timezone)
- View available API namespaces

## Multi-Site Support

- Manage multiple WordPress sites from one location
- Switch between sites using `--site <name>` flag
- Each site has its own credentials

## Limitations

- Requires WordPress 5.6+ (for Application Passwords)
- Site must use HTTPS
- REST API must be enabled (check permalinks settings)
- User role determines available operations
- No theme or plugin management (admin-only, security-sensitive)
- No settings management (one-time setup tasks)
- No block/widget management (theme-specific)
