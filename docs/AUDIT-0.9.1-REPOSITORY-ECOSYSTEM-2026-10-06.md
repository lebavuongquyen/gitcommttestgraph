# 0.9.1 Repository Ecosystem Audit

Date: 2026-10-06
Baseline: v0.9.0

## Objective

Make repository ecosystem detection explicit, evidence-based and surface-complete for JavaScript/TypeScript repositories.

## Scope

Verified adapters:

- npm
- pnpm
- yarn
- bun
- TypeScript
- JavaScript
- Node test
- Jest
- Vitest
- Playwright
- generic test scripts

## Findings

### ECO-001 — Package manager detection existed but had no public ecosystem result

Package metadata was already indexed, but consumers had to infer ecosystem support from graph internals.

Resolution: add RepositoryEcosystem application service and expose it through GUI, CLI, HTTP and MCP.

### ECO-002 — Unsupported ecosystems could be mistaken for absent support

Resolution: every detected unknown/unsupported manager or framework is represented explicitly with UNKNOWN support and an evidence/reason field. Empty evidence is also UNKNOWN.

### ECO-003 — Test framework adapters did not expose ecosystem capability semantics

Resolution: aggregate detected TestProject nodes into a versioned ecosystem result without changing existing test graph behavior.

### ECO-004 — Cross-surface parity was missing

Resolution: permanent 0.9.1 contract coverage verifies CLI, HTTP, MCP and GUI exposure.

## Safety rule

Unsupported environments must never become positive impact intelligence.

A consumer receiving UNKNOWN must treat the result as uncertainty, not as proof that no tests or dependencies exist.

## Definition of Done

- [x] ecosystem application contract
- [x] package manager support classification
- [x] language support classification
- [x] test framework support classification
- [x] explicit UNKNOWN behavior
- [x] deterministic result
- [x] GUI surface
- [x] CLI surface
- [x] HTTP surface
- [x] MCP surface
- [x] contract tests
- [x] changelog
- [x] release documentation
- [x] full regression
- [x] release gate
