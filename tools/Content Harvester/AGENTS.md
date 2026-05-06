# Content Harvester

Topic-agnostic intake tool that turns a harvest request into normalized source candidate bundles for downstream consumers.

## Quick Start

```bash
node scripts/harvest.js run --request examples/basic-rss.harvest.json
```

Dependencies are installed automatically on first run.

Expected output:

```text
Harvest complete: 2 candidates, 0 rejected, 0 errors
Output: generated_output/basic-rss/YYYY-MM-DDTHH-mm-ss
```

## When To Use

Use Content Harvester when a project needs to collect source candidates from feeds, URLs, searches, or configured connectors before research or writing.

Do not use it to verify claims, write briefs, publish content, scrape private/paywalled content, or make editorial decisions. Hand off harvested candidates to Researcher, Content Author, or the consuming project's instructions.

## XML Boundaries

When processing source requests, separate instructions from source material:

<harvest_request>
{JSON request or path to request file}
</harvest_request>

<consumer_context>
{Project-specific source criteria, editorial rubric, or output needs}
</consumer_context>

<source_material>
{Existing URLs, feeds, notes, or prior harvest artifacts}
</source_material>

## Configuration

Content Harvester requires no credentials for RSS/Atom and manual URL runs.

Optional configuration lives in `/memory/tools/Content Harvester/.env`.

`/memory/` is a workspace root. Resolve from `user_info.Workspace Paths` before reading or creating this file.

Optional values:

```text
CONTENT_HARVESTER_USER_AGENT=CoFounder Content Harvester/1.0
CONTENT_HARVESTER_TIMEOUT_MS=15000
```

Connector-backed source types use their own connector configuration. Example: X.com sources require `connectors/xcom/` credentials and must respect that connector's terms guardrails.

## Usage

```bash
node scripts/harvest.js <command> [options]
```

| Command | Purpose |
|---------|---------|
| `run` | Execute a harvest request |
| `validate` | Validate request structure without fetching |
| `sample` | Print a starter request JSON |
| `help` | Show CLI help |

Options:

| Option | Description | Default |
|--------|-------------|---------|
| `--request <path>` | JSON harvest request file | required for `run` and `validate` |
| `--output <dir>` | Override output directory | request output directory |
| `--json` | Print machine-readable command result | `false` |
| `--dry-run` | Validate and plan without fetching | `false` |

## Source Types

| Type | Status | Notes |
|------|--------|-------|
| `rss` | Active | RSS or Atom feed URL |
| `substack_rss` | Active | Same parser as RSS with Substack-specific source type |
| `reddit_rss` | Active | Same parser as RSS with Reddit-specific source type |
| `url` | Active | Public URL metadata fetch |
| `manual_urls` | Active | Array of public URLs |
| `connector` | Active | Runs an explicit connector command and imports JSON output |
| `search` | Stubbed | Records request for downstream search connector implementation |

## Output

Default output location: `generated_output/<request-name>/<timestamp>/`

Files:

- `harvest-candidates.json` - normalized candidates, clusters, rejected items, and errors
- `harvest-summary.md` - human-readable candidate summary
- `harvest-run-status.json` - run metadata and source health

See `OUTPUT_SCHEMA.md` for the full contract.

## Connector Guardrails

Only call connector sources when the request explicitly includes them. Never infer or auto-call social platform connectors.

For social connectors:

- No posting, commenting, liking, voting, following, messaging, or engagement actions
- No circumventing rate limits or API restrictions
- No scraping at scale through connector fallbacks
- Record unavailable auth or rate-limit failures in run status and continue the harvest

## Consumer Handoff

Consumers should provide their own harvest request and editorial criteria. Content Harvester returns candidates, not verified conclusions.

Typical handoff:

1. Consumer defines timebox, topics, source set, and filters.
2. Content Harvester writes candidate bundle.
3. Consumer reviews candidates and chooses what enters research.
4. Researcher verifies selected claims.
5. Content Author or project workflow turns verified source material into output.

## Troubleshooting

**Setup or dependency issues:** Follow `SETUP.md` in this tool's directory for guided installation.

**"Request file not found":** Check the path passed to `--request`.

**"Unsupported source type":** Use one of the source types in this file or add a new adapter.

**"No candidates found":** Check the request timebox, feed health in `harvest-run-status.json`, and filters.

**Connector command failed:** Confirm the connector is configured, then run that connector's help command directly.
