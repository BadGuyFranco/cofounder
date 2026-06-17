# Microsoft Clarity Connector

Connect to Microsoft Clarity via its Data Export API.

## Status

Active. Clarity is free and unlimited; the Data Export API needs a project-admin token but costs nothing. Returns aggregated behavior insights only (no session recordings or heatmap images via API).

## Features

- Friction signals: dead clicks, rage clicks, quick backs, excessive scroll, script errors, error clicks
- Engagement and traffic: sessions, distinct users, pages per session, scroll depth, engagement time
- Per-page breakdown (`--by URL`) and up to 3 dimensions at once
- `signals` digest tuned for the Conversion Expert; `insights` for raw dashboard data
- Token connectivity check

## Setup

See `SETUP.md` for configuration instructions. Credentials live at `/memory/connectors/clarity/.env` as `CLARITY_API_TOKEN`.

## Quota

10 API requests per project per day; data window is the last 1 to 3 days only. Plan calls deliberately.

## Pairs with

GA4 (`connectors/google/`, `analytics.js`) for the quantitative "what," under the `tools/Conversion Expert/` umbrella.
