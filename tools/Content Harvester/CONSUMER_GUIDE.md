# Content Harvester Consumer Guide

Content Harvester is reusable intake infrastructure. Consuming projects own their own taste, source strategy, and editorial criteria.

## Consumer Responsibilities

A consumer must define:

- Timebox rules
- Target topics or subject lanes
- Source list
- Source roles and trust assumptions
- Include and exclude filters
- Ranking interpretation
- Handoff destination
- What happens after candidates are selected

Content Harvester does not decide what is true, important, or publishable.

## Recommended Project Files

```text
project/
  research/
    AGENTS.md
    content-harvester/
      weekly.harvest.json
      source-notes.md
```

The request file can live in the consumer project. Run it with:

```bash
node "/cofounder/tools/Content Harvester/scripts/harvest.js" run --request "research/content-harvester/weekly.harvest.json"
```

Resolve `/cofounder/` from the workspace paths before running.

## Handoff Pattern

1. Run Content Harvester.
2. Review `harvest-summary.md`.
3. Select candidates for the consumer workflow.
4. Send selected candidates to Researcher if factual verification is needed.
5. Send verified source material to Content Author or a project-specific writer.

## Source Role Guidance

Use source roles to make ranking more transparent:

| Role | Use For |
|------|---------|
| `primary` | Official docs, papers, product pages, filings |
| `independent_reporting` | Publications with reporting standards |
| `expert_analysis` | Named expert commentary |
| `community` | Reddit, forums, comments, community feeds |
| `social_signal` | X.com, LinkedIn, Bluesky, social posts |
| `curated` | Human-provided URL lists |
| `discovery` | Search results or exploratory source lists |

Roles are signals, not truth labels. Researcher still verifies claims.

## Connector Sources

Connector sources must be explicit. Example:

```json
{
  "type": "connector",
  "connector": "xcom",
  "command": "node scripts/search.js recent --query \"AI agents\" --limit 25 --json",
  "source": "X.com",
  "role": "social_signal"
}
```

If the connector is not configured or returns an error, Content Harvester records the failure and continues with the rest of the request.

## What Not To Put In The Tool

Do not put consumer-specific rules in Content Harvester:

- Episode segment format
- Brand voice
- Audience persona
- Editorial exclusions that only apply to one show
- Project-specific Notion, Obsidian, or publishing behavior

Those belong in the consuming project.
