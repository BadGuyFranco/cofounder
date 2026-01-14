# [Tool Name]

[One-line description: what this tool does across all backends]

## Quick Start

```bash
cd "/cofounder/tools/[Tool Name]/[default-sub-tool]"
npm install
node scripts/[main-script].js "input"
```

Expected output:
```
[what success looks like]
```

**If the command fails,** see Troubleshooting section below.

## XML Boundaries

When processing requests, use XML tags to separate user content:

<user_request>
{What the user asked for}
</user_request>

<source_material>
{Any files, data, or content provided by user}
</source_material>

## Routing Logic

```
Request for [tool domain]
    │
    ├─ User explicitly requests [Backend 1]?
    │   └─ YES → Check if configured
    │             • Configured → Use [backend-1]/
    │             • Not configured → Guide to setup
    │
    ├─ User explicitly requests [Backend 2]?
    │   └─ YES → Use [backend-2]/
    │
    └─ Default request
          └─ Use [default-backend]/
```

**Key principle:** [State the default behavior and when to deviate]

## Configuration

### [Default Sub-tool] (No configuration required)

Works immediately after `npm install`.

### [Optional Sub-tool] (Requires setup)

**Credentials location:** `/memory/tools/[Tool Name]/[config-file]`

**Setup required:** See `[sub-tool]/SETUP.md` for configuration.

## Sub-tools

### [Default Sub-tool]

**Location:** `[default-sub-tool]/`

**Setup:**
```bash
cd [default-sub-tool] && npm install
```

| Capability | Supported |
|------------|-----------|
| [Capability 1] | Yes |
| [Capability 2] | Yes |

See `[default-sub-tool]/AGENTS.md` for complete usage.

### [Optional Sub-tool]

**Location:** `[optional-sub-tool]/`

**Setup:**
```bash
cd [optional-sub-tool] && npm install
# Additional setup steps if needed
```

| Capability | Supported |
|------------|-----------|
| [Capability 1] | Yes |
| [Capability 2] | Yes |

See `[optional-sub-tool]/AGENTS.md` for complete usage.

### [Future Sub-tool] (Future)

**Location:** `[future-sub-tool]/`

**Status:** Stubbed, not implemented.

## Output

**[Default Sub-tool]:** [Where output goes]

**[Optional Sub-tool]:** [Where output goes]

## Troubleshooting

### [Default Sub-tool] Issues

**"Cannot find module" errors:**
```bash
cd [default-sub-tool] && npm install
```

**[Common error]:**
[How to fix]

### [Optional Sub-tool] Issues

**Not set up:**
Point user to `[optional-sub-tool]/SETUP.md`

**[Common error]:**
[How to fix]

## What [Tool Name] Does NOT Handle

- [Out of scope item 1]
- [Out of scope item 2]
