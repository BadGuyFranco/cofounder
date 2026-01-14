# My Tools

User-created custom tools. Build tools not included in `/cofounder/tools/`, or customize existing ones.

## Tool Routing

| Need | Tool |
|------|------|
| (Add your custom tools here) | `my tools/[Tool Name]/` |

## Creating a Tool

1. Create directory: `/memory/my tools/[Tool Name]/`
2. Add `AGENTS.md` with instructions
3. Add to routing table above
4. Add any scripts or supporting files

### Templates

Use `/cofounder/system/templates/` as patterns:

| Template | Use When |
|----------|----------|
| Behavior Tool | Instructions/methodology only (no scripts) |
| Script Tool | Node/Python scripts with dependencies |
| Composite Tool | Routes to multiple sub-tools |

### Tool Structure

At minimum, each tool needs:

```
/memory/my tools/[Tool Name]/
├── AGENTS.md      ← Required: AI instructions
├── README.md      ← Optional: Human overview
└── [other files]  ← As needed
```

## Overriding Built-in Tools

To customize a built-in tool:

1. Copy from `/cofounder/tools/[Tool]/` to `/memory/my tools/[Tool]/`
2. Modify as needed
3. Your version takes priority (routing checks here first)

Note: Most customization happens in `/memory/tools/[Tool Name]/` (configuration) rather than creating a full tool override. Only create a tool override if you need to change the tool's behavior, not just its settings.
