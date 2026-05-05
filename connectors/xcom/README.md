# X.com Connector

Connect to X.com (formerly Twitter) via API v2.

## Status

**Active** - Full implementation with all major endpoints.

## Features

- Post tweets (text, images, videos, threads)
- Engage with content (likes, retweets, bookmarks)
- Manage relationships (follows, mutes, blocks)
- Direct messages
- Search and discovery
- Pay-per-use Post consumption checks
- List management
- Multi-account support

## Setup

See `SETUP.md` for configuration instructions.

## Usage

See `AGENTS.md` for AI agent instructions.

## API Reference

https://developer.x.com/en/docs/twitter-api

## Important: API Costs

X.com API uses credit-based pay-per-use pricing. Reads are charged per resource returned; writes/actions are charged per request. Use `node scripts/usage.js posts` to monitor Post consumption against the project cap. Credit balance and exact dollar spend are managed in the X Developer Console.
