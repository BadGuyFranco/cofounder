# Framework Integration

Load when building complex multi-framework outputs: funnels, presentation paths, multi-asset campaigns.

## Framework Hierarchy

### Always Load (Foundational)
**Core Principles** (`Core/Core-Principles.md`) - The four foundations

### Load Based on Task

| Task Type | Primary Framework | Supporting Frameworks |
|-----------|-------------------|----------------------|
| Build a funnel | Funnels/[type].md | Persuasion/*, Sequences/* |
| Write copy | Persuasion/* | Psychology/* |
| Create presentation | Persuasion/Conversion-Experiences.md | Psychology/Belief-Mechanics.md |
| Email sequences | Sequences/[type].md | Persuasion/* |
| Traffic strategy | Growth-Engines/[type].md | Platforms/* |
| Optimize/diagnose | Measurement/* | Diagnostics/* |
| Production playbook | Playbooks/[name]/AGENTS.md | (playbook manages its own framework loading) |

### Load Based on Depth

| Need | Load |
|------|------|
| Psychological depth | Psychology/* |
| Offer construction | Persuasion/Offer-Design.md |
| Story/narrative | Persuasion/Story-Engineering.md |
| Platform-specific | Platforms/[platform].md |

## Layering Rules

### Order of Application

1. **Start with Core Principles** - Define prime prospect, map ascension position, identify beliefs to shift
2. **Apply Format-Specific Framework** - Funnel, Presentation, Emails, etc.
3. **Layer Supporting Frameworks** - Psychology, Offer Design, Platform guidance
4. **Apply Persuasion Structure to Every Asset** - Hook → Story → Offer is universal
5. **Run Quality Checks** - Load `Core/Quality-Checks.md` before delivery

### Priority When Frameworks Overlap

**General:** Core Principles > Format-Specific > Supporting

| Situation | Resolution |
|-----------|------------|
| Format doesn't mention Hook-Story-Offer | Apply it anyway; Core Principles always apply |
| Format specifies timing | Format defines timing; Core Principles define content |
| Offer framework suggests conflicting price | Ascension Architecture overrides |
| Traffic framework conflicts with prime prospect | Prime prospect definition overrides |
| Platform conflicts with conversion structure | Persuasion structure takes priority |

## Integration Patterns

### Complete Funnel
```
Core Principles → Funnels/[type].md → Persuasion/* → Sequences/* → Growth-Engines/* → Quality-Checks.md
```

### Presentation Path
```
Core Principles → Conversion-Experiences.md → Belief-Mechanics.md → Offer-Design.md → Launch-Campaigns.md → Quality-Checks.md
```

### Sales Page
```
Core Principles → Hook-Architecture.md → Story-Engineering.md → Offer-Design.md → Quality-Checks.md
```

### Email Campaign
```
Core Principles → Sequences/[type].md → Persuasion/* → Quality-Checks.md
```

### Playbook (Production System)
```
Playbooks/[name]/AGENTS.md → (playbook owns orchestration) → calls Marketing System frameworks + other tools as needed
```

Playbooks are self-contained production systems with their own AGENTS.md and multi-step pipeline. They differ from framework integration patterns because the playbook orchestrator controls the workflow. Marketing System frameworks serve as inputs that playbooks reference, not the other way around.

## Conflict Resolution

| Conflict | Resolution |
|----------|------------|
| "3 secrets" vs "3 belief barriers" | Same thing. Each secret breaks one barrier. |
| Sequence length vs ascension timing | Ascension informs strategy. Adjust sequence or add tier-ups. |
| Platform "keep it short" vs story depth | Use platform for discovery (short); drive to owned asset for full story. |
| Growth engine doesn't match resources | Resources constrain strategy. Recommend alternative. |

## Key Principle

**Frameworks layer; they don't replace each other.** All integrated, not in conflict.
