# Connectors Dependency Architecture Policy

Date: 2026-02-14
Status: Phase 0 policy, report-only enforcement

## Purpose

Define npm dependency management for `/cofounder/connectors/` with clean root and predictable connector behavior.

## Dependency Layers

- Shared connector layer: `/cofounder/connectors/package.json`
- Local connector layer: `/cofounder/connectors/[Connector Name]/package.json`
- Shared utility source code: `/cofounder/system/shared/` (not an npm install target)

## Rules

1. Dependencies used broadly across connectors should move to the shared connector layer.
2. Connector-specific dependencies can remain local where justified.
3. Connector scripts should use `ensureDeps(import.meta.url)` with layer-aware policy as refactor phases progress.
4. Root-level dependency installs are outside this architecture.
5. `system/shared` remains source utilities only.

## Automation Contract

The dependency architecture checker reports connector-layer drift in Phase 0 and can enforce later.

Command:
- `node system/quality/check-dependency-architecture.js`

## Migration Principle

Migrate gradually:
- inventory first
- pilot connectors second
- batch cleanup after validation
