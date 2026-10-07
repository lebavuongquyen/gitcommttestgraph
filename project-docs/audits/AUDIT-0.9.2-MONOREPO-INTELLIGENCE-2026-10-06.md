# 0.9.2 Monorepo Intelligence Audit

Date: 2026-10-06
Baseline: v0.9.1

## Objective

Expose deterministic monorepo intelligence from the existing package-aware graph without creating a parallel dependency model.

## Findings

### MONO-001 — Package boundaries existed but lacked a unified read model

The indexer already creates package nodes, package-file ownership and workspace dependency edges. Consumers had no single contract for workspace/package topology.

Resolution: `analyzeMonorepo()` provides a versioned application-level read model.

### MONO-002 — Package dependency direction was available only as graph edges

Resolution: package dependencies and reverse dependents are now explicit in the monorepo result.

### MONO-003 — Package-level impact was not directly queryable

Resolution: changed file/package IDs propagate through reverse `DEPENDS_ON` edges. Only verified graph relationships participate.

### MONO-004 — Package test ownership needed a single query surface

Resolution: package results include associated test-project IDs and source-file counts.

### MONO-005 — Cross-package false positives are a critical risk

Resolution: the service never invents dependencies. No `DEPENDS_ON` edge means no dependency relationship.

## Surfaces

- GUI: Monorepo Intelligence panel
- CLI: `gctg monorepo [commit] [changedNodeId...]`
- HTTP: `/api/monorepo`
- MCP: `monorepo_intelligence`
- Public API: `analyzeMonorepo()`

## Quality gates

- [x] deterministic core contract
- [x] package dependency/dependent model
- [x] workspace model
- [x] package test ownership
- [x] package impact propagation
- [x] no invented cross-package dependencies
- [x] GUI gate
- [x] CLI gate
- [x] HTTP gate
- [x] MCP gate
- [x] public API surface
- [x] full regression
- [x] documentation
- [x] release gate
