# Tools Dependency Architecture Policy

Date: 2026-02-14
Status: Phase 0 policy, report-only enforcement

## Purpose

Define how npm dependencies are managed for `/cofounder/tools/` while keeping repository root clean.

## Dependency Layers

- Shared tool layer: `/cofounder/tools/package.json`
- Local tool layer: `/cofounder/tools/[Tool Name]/package.json`
- Shared utility source code: `/cofounder/system/shared/` (not an npm install target)

## Rules

1. Dependencies used by multiple tools should live in the shared tool layer.
2. Tool-specific dependencies may remain local to the tool package.
3. Root-level dependency installs are not part of this architecture.
4. `system/shared` is for reusable code only, not `node_modules`.
5. New tools should default to shared layer dependencies unless there is a clear local-only reason.

## Automation Contract

Phase 0 checker:
- `node system/quality/check-dependency-architecture.js`

Current mode:
- report-only. violations are surfaced but do not fail execution.

Later mode:
- fail-on-violation after migration stabilizes.

## Canonical Shared Dependency List

Source of truth:
- `/cofounder/tools/shared-tools-deps.json`

Notes:
- this file defines shared candidates and policy checks.
- updates must include a short rationale in `zDeveloper` history.
