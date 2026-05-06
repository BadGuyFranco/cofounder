# Content Harvester Request Schema

The harvest request is a JSON object supplied by a consuming project or tool.

## Required Fields

```json
{
  "name": "weekly-roundup",
  "consumer": "Example Consumer",
  "timebox": {
    "from": "2026-05-01T00:00:00-06:00",
    "to": "2026-05-06T10:00:00-06:00"
  },
  "topics": [
    "topic one",
    "topic two"
  ],
  "sources": [],
  "output": {
    "directory": "generated_output/weekly-roundup"
  }
}
```

| Field | Type | Purpose |
|-------|------|---------|
| `name` | string | Stable run/profile name used in output paths |
| `consumer` | string | Project or workflow requesting the harvest |
| `timebox.from` | ISO date string | Earliest acceptable publication date |
| `timebox.to` | ISO date string | Latest acceptable publication date |
| `topics` | string array | Subject targets used for relevance scoring |
| `sources` | object array | Source requests to collect |
| `output.directory` | string | Output directory, relative to request file unless absolute |

## Source Objects

### RSS, Substack RSS, Reddit RSS

```json
{
  "type": "rss",
  "url": "https://example.com/feed.xml",
  "source": "Example Feed",
  "role": "independent_reporting",
  "topics": ["optional source-specific topic"]
}
```

Use `substack_rss` or `reddit_rss` when the source needs platform-specific labeling.

### Single URL

```json
{
  "type": "url",
  "url": "https://example.com/article",
  "source": "Example Site",
  "role": "primary"
}
```

### Manual URL List

```json
{
  "type": "manual_urls",
  "source": "Curated URLs",
  "role": "curated",
  "urls": [
    "https://example.com/article-one",
    "https://example.com/article-two"
  ]
}
```

### Connector Source

```json
{
  "type": "connector",
  "connector": "xcom",
  "command": "node scripts/search.js recent --query \"AI agents\" --limit 25 --json",
  "source": "X.com",
  "role": "social_signal",
  "topics": ["AI agents"]
}
```

Connector commands run from `/cofounder/connectors/<connector>/`. The command must print JSON or the adapter will record an error.

### Search Source

```json
{
  "type": "search",
  "query": "AI agents news this week",
  "source": "Web search",
  "role": "discovery"
}
```

Search sources are currently recorded as planned work in run status. Use connector sources for configured search APIs until a native search adapter is added.

## Optional Filters

```json
{
  "filters": {
    "include_terms": ["agent", "workflow"],
    "exclude_terms": ["webinar", "coupon", "sponsored"],
    "max_items_per_source": 20,
    "min_score": 0
  }
}
```

| Filter | Type | Behavior |
|--------|------|----------|
| `include_terms` | string array | Candidate must match at least one term in title, summary, content, or URL |
| `exclude_terms` | string array | Candidate is rejected if any term matches |
| `max_items_per_source` | number | Caps accepted candidates per source |
| `min_score` | number | Rejects candidates below the generic relevance score |

## Output Options

```json
{
  "output": {
    "directory": "generated_output/example",
    "markdown": true,
    "json": true
  }
}
```

`markdown` and `json` default to `true`.

## Contract

The request defines collection and filtering only. It must not ask Content Harvester to verify claims, write conclusions, produce a script, publish output, or use private content without a configured authorized connector.
