# Cloudflare Connector Capabilities

What this connector can do for you.

## Zones (Domains)

- List all domains in your account
- Get zone details and settings
- Look up zone ID by domain name

## DNS Records

- List all DNS records for a domain
- Create new DNS records (A, AAAA, CNAME, MX, TXT, SRV, etc.)
- Update existing DNS records
- Delete DNS records
- Toggle proxy status (orange cloud on/off)

## Page Rules

- List all page rules for a domain
- Create redirect rules (301, 302)
- Create forwarding rules
- Update page rule settings
- Delete page rules
- Set rule priority

## SSL/TLS

- View current SSL mode (Off, Flexible, Full, Full Strict)
- Update SSL mode
- View certificate status

## Cache Management

- Purge all cached content for a domain
- Purge specific URLs
- Purge by cache tags
- Purge by hostname

## Firewall Rules

- List firewall rules
- Create block/challenge/allow rules
- Update rule expressions
- Delete rules

## Workers (requires Account permissions)

- List deployed workers
- Deploy worker scripts
- Delete workers
- View worker routes

## KV Storage (requires Account permissions)

- List KV namespaces
- Create namespaces
- Read/write key-value pairs
- Delete keys and namespaces

## R2 Object Storage (requires Account permissions)

- List R2 buckets
- Create and delete buckets
- Upload files to buckets
- Download files from buckets
- List objects in buckets
- Delete objects

## D1 SQLite Databases (requires Account permissions)

- List D1 databases
- Create and delete databases
- Run SQL queries
- Execute SQL files (schema migrations)
- List tables in a database

## Pages (Static Site Hosting)

- List Pages projects
- Create and delete projects
- List deployments
- Rollback to previous deployments
- List custom domains

## Queues (Async Messaging)

- List queues
- Create and delete queues
- Manage queue consumers
- Configure batch size and retry settings

## Analytics

- Get dashboard overview (requests, bandwidth, threats)
- Get request analytics by country, status code
- Get bandwidth analytics by content type
- Get threat analytics
- Get performance metrics (cache ratio, SSL percentage)

## Email Routing

- Enable/disable email routing for a zone
- List email routing rules
- Create forwarding rules (address or catch-all)
- Update and delete rules
- List verified destination addresses

## Turnstile (CAPTCHA)

- List Turnstile widgets
- Create widgets (managed, non-interactive, invisible modes)
- Get widget details
- Rotate secret keys
- Delete widgets

## Waiting Room (Traffic Management)

- List waiting rooms for a zone
- Create waiting rooms with capacity limits
- Configure session duration and queue settings
- Get real-time queue status
- Manage waiting room events

## Images (Image Hosting)

- List images
- Upload images with metadata
- Create image variants (resize, crop, etc.)
- Get image details and URLs
- Delete images

## Stream (Video Hosting)

- List videos
- Upload videos (resumable)
- Get embed codes
- Create clips from videos
- Get storage statistics

## Domain Registration (Registrar)

- List domains registered with Cloudflare
- Get domain registration details
- Update auto-renew and lock settings
- Manage WHOIS contacts
- Initiate domain transfers to Cloudflare
- Check transfer status

## Domain Availability (RDAP)

- Check if a domain is available for registration
- Bulk check multiple domains at once
- Suggest available domains across popular TLDs
- List all 1,194 supported TLDs
- Uses official ICANN RDAP protocol (free, no account needed)

Note: Some TLDs (like .io, .co, .me) don't yet support RDAP.

## Cloudflare Domain Search (with Pricing)

- Search a name across all 85+ Cloudflare-supported TLDs
- See Cloudflare wholesale prices for each TLD
- Filter by maximum price (e.g., only TLDs under $10/yr)
- Results sorted by price (cheapest first)
- List all Cloudflare TLDs with their prices

Example: `node scripts/domain-check.js cloudflare myapp --max-price 15`

Note: Pricing data stored locally in `data/cloudflare-tlds.json`. Update periodically as registries adjust prices.

## Limitations

- Rate limit: 1,200 requests per 5 minutes
- Some features require paid plans (e.g., advanced firewall, Waiting Room)
- Workers/KV/R2/D1/Pages/Queues require Account-level token permissions
- Page Rules limited to 3 on free plan
- R2 free tier: 10 GB storage, unlimited egress
- D1 free tier: 5 GB storage, 5M reads/day
- Images and Stream are paid products
- Turnstile free tier: 1M verifications/month
- Bulk operations may require multiple API calls
