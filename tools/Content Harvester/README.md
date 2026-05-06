# Content Harvester

Topic-agnostic content intake for collecting, normalizing, deduplicating, ranking, and exporting source candidate bundles.

## Documentation

- **AGENTS.md** - Complete instructions for AI agents
- **REQUEST_SCHEMA.md** - Harvest request contract
- **OUTPUT_SCHEMA.md** - Candidate bundle and run status schema
- **CONSUMER_GUIDE.md** - How projects and tools call Content Harvester
- **SETUP.md** - Dependency checks and troubleshooting

## Key Features

- **Topic-agnostic intake** - Works for roundups, market scans, competitor watch, research queues, and content pipelines.
- **Modular collectors** - Starts with RSS/Atom, Reddit RSS, Substack RSS, manual URLs, and connector command adapters.
- **Structured handoff** - Produces JSON and Markdown bundles for Researcher, Content Author, and project-specific workflows.

## Common Use Cases

Use Content Harvester when a project needs a repeatable source intake run over a timebox and topic set. It gathers candidates, records what failed, and leaves verification, editorial judgment, and writing to downstream consumers.
