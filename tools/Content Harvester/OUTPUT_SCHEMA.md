# Content Harvester Output Schema

Each run writes three artifacts unless disabled by the request.

## `harvest-candidates.json`

```json
{
  "schema_version": 1,
  "run": {
    "id": "2026-05-06T15-31-00",
    "name": "weekly-roundup",
    "consumer": "Example Consumer",
    "timebox": {
      "from": "2026-05-01T00:00:00-06:00",
      "to": "2026-05-06T10:00:00-06:00"
    },
    "topics": ["topic one"]
  },
  "candidates": [],
  "clusters": [],
  "rejected": [],
  "errors": []
}
```

## Candidate Item

```json
{
  "id": "sha256-prefix",
  "title": "Article title",
  "url": "https://example.com/article",
  "canonical_url": "https://example.com/article",
  "source": "Example",
  "source_type": "rss",
  "source_role": "independent_reporting",
  "author": "Author Name",
  "published_at": "2026-05-06T12:00:00.000Z",
  "discovered_at": "2026-05-06T15:31:00.000Z",
  "summary": "Short source-provided summary",
  "content": "Extracted content if available",
  "topics": ["topic one"],
  "matched_topics": ["topic one"],
  "score": 72,
  "score_reasons": ["recent", "topic_match", "source_role:independent_reporting"],
  "discovered_by": {
    "type": "rss",
    "source": "Example",
    "url": "https://example.com/feed.xml"
  },
  "raw": {}
}
```

## Cluster Item

```json
{
  "cluster_id": "cluster-sha",
  "title": "Representative title",
  "item_ids": ["candidate-one", "candidate-two"],
  "urls": ["https://example.com/article"],
  "sources": ["Example"],
  "top_score": 72
}
```

Clusters are lightweight in v1. They group exact canonical URL matches and near-identical normalized titles.

## Rejected Item

```json
{
  "reason": "outside_timebox",
  "title": "Old article",
  "url": "https://example.com/old",
  "source": "Example",
  "source_type": "rss"
}
```

Common reasons:

- `outside_timebox`
- `excluded_term`
- `missing_url`
- `duplicate`
- `below_min_score`
- `source_cap_reached`
- `unsupported_source_type`

## Error Item

```json
{
  "source": "Example",
  "source_type": "rss",
  "message": "Fetch failed: 404",
  "retryable": false
}
```

## `harvest-run-status.json`

```json
{
  "ok": true,
  "reason": "completed",
  "started_at": "2026-05-06T15:31:00.000Z",
  "finished_at": "2026-05-06T15:31:02.000Z",
  "sources_requested": 3,
  "sources_completed": 2,
  "sources_failed": 1,
  "candidate_count": 12,
  "rejected_count": 5,
  "error_count": 1,
  "output_directory": "generated_output/example/2026-05-06T15-31-00"
}
```

`ok` means the run completed with enough information to inspect. It can still contain source errors. A failed run sets `ok: false` only when request validation or output writing fails.

## `harvest-summary.md`

Human-readable summary with:

- Run metadata
- Source health
- Top candidates by score
- Clusters
- Rejected count by reason
- Errors
- Downstream handoff notes

The Markdown summary is for review. The JSON file is the contract for automation.
