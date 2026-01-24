# Memory Templates

Templates for files created in `/memory/` during first-run setup.

## Files

| Template | Creates | Purpose |
|----------|---------|---------|
| `memory-root-AGENTS.md` | `/memory/AGENTS.md` | Workspace instructions for /memory/ |
| `my-connectors-AGENTS.md` | `/memory/my connectors/AGENTS.md` | Routing for custom connectors |
| `my-tools-AGENTS.md` | `/memory/my tools/AGENTS.md` | Routing for custom tools |

## Usage

During setup (Continue Install.md), copy these templates to `/memory/`:

```
/memory/
├── AGENTS.md          <- from memory-root-AGENTS.md
├── my connectors/
│   └── AGENTS.md      <- from my-connectors-AGENTS.md
└── my tools/
    └── AGENTS.md      <- from my-tools-AGENTS.md
```

No modifications needed; use as-is.
