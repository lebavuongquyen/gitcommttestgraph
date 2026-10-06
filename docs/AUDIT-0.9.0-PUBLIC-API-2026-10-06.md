# 0.9.0 Public API Audit

Date: 2026-10-06
Baseline: v0.8.4

## Objective

Freeze the first supported programmatic API boundary without prematurely splitting the repository into multiple packages.

## Findings

### API-001 — Public entrypoint was not explicitly separated

The package root exported many internal domain, application and adapter classes directly. Consumers could therefore accidentally depend on implementation details.

Severity: P0.

Resolution: add src/public/index.ts as the supported public API entrypoint and expose it through the package export map.

### API-002 — Public schema versions were implicit or inconsistent

Core graph, change intelligence and workflow models use internal schemaVersion: 1, but there was no single public API contract version.

Severity: P1.

Resolution: introduce PUBLIC_API_VERSION = 1.0.0 and a public contract registry.

### API-003 — Runtime validation was incomplete

TypeScript declarations alone cannot protect JavaScript consumers or persisted JSON integrations.

Severity: P1.

Resolution: add Zod-backed runtime public contract validation.

### API-004 — Error contract was not frozen

HTTP/MCP consumers could receive surface-specific error shapes.

Severity: P1.

Resolution: define the stable public error envelope { error: { code, message, details? } }. Surface-specific migration is retained until the next compatibility pass.

### API-005 — Premature package splitting would increase compatibility risk

The roadmap proposes potential package namespaces but explicitly says the exact split must follow dependency analysis.

Severity: P1.

Resolution: keep one package in 0.9.0 and expose a stable ./api subpath. Revisit package extraction after 1.0.

## Compatibility policy

- Additive fields are allowed.
- Existing required fields and their meanings are stable within public API version 1.
- Removing or renaming a public field requires a public API major version.
- schemaVersion is mandatory for versioned artifacts.
- Unsupported future schema versions fail closed.
- Internal source modules are not part of the compatibility promise.
- The ./api entrypoint is the supported programmatic entrypoint.
- The package root remains backward-compatible for existing 0.8 consumers during 0.9.

## Definition of Done

- [x] public entrypoint
- [x] explicit public API version
- [x] graph snapshot contract
- [x] change intelligence contract
- [x] impact contract
- [x] test impact contract
- [x] execution plan contract
- [x] evidence contract
- [x] error contract
- [x] runtime validation
- [x] compatibility tests
- [x] package export map
- [x] documentation
- [ ] full 0.9.0 release gate
- [ ] release tag
