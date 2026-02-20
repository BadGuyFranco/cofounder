# Bing Webmaster Tools - Capabilities

## What This Connector Does

Connects to the Bing Webmaster Tools API to manage sites, sitemaps, and indexing on Bing Search.

## Site Management

- List all verified sites in your Bing Webmaster account
- Check verification status of each property

## Sitemap Management

- List all submitted sitemaps for a site with processing status and page counts
- Submit new sitemaps to Bing
- Remove outdated or incorrect sitemaps

## Crawl Data

- Get daily crawl statistics: pages crawled, crawl errors, blocked pages (last 30 days)
- Get detailed crawl issue list grouped by error type (404s, timeouts, blocked by robots.txt, etc.)

## URL Submission

- Submit a single URL for Bing indexing (for new or updated pages)
- Submit up to 10 URLs in a single batch call
- Useful after publishing new content to accelerate Bing discovery

## Keyword Data

- Monthly impression and click data for any search query
- CTR trends over time
- Useful for comparing Bing organic visibility alongside Google Search Console data

## Limitations

- Site must be verified in Bing Webmaster Tools before any data is accessible
- Crawl stats and issues are only available for verified properties
- Keyword stats are available for Bing searches only (not Google)
- Batch URL submission is limited to 10 URLs per call
- Bing Webmaster Tools does not provide backlink data or domain authority scores
- No rank tracking (use Semrush, Ahrefs, or manual SERP checks for rankings)

## Prerequisites

- A Microsoft account (free)
- Sites verified in Bing Webmaster Tools at https://www.bing.com/webmasters/
- An API key generated from the Bing Webmaster Tools dashboard
