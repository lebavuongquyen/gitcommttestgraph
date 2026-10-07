# 0.9 Revalidation Audit — 2026-10-06

## Scope

This audit revalidates the complete 0.9 line after repeated interruptions during development. It checks the tagged releases from 0.9.0 through 0.9.7, the current main branch, regression coverage, release gates, public surface consistency and MCP exposure.

## Baseline

- Current branch: main
- Pre-fix baseline: 30d62a7
- Existing releases: v0.9.0 through v0.9.7
- Public API version: 1.0.0
- Full regression before corrective work: 148/148 PASS
- Release Gate v2 before corrective work: PASS

## Findings

### F-01 — Test-gap intelligence was not exposed through MCP

Severity: P1 functional surface gap.

The CLI exposed `test-gaps`, the application/domain implementation and GUI/HTTP workflow existed, but the MCP server did not register a `test_gaps` tool. This violated the project's feature-first requirement that agent-facing capabilities be exposed through the existing MCP surface.

Impact:

- human/CLI users could use test-gap intelligence;
- MCP agents could not discover or invoke the capability;
- compatibility tests did not detect this because the compatibility gate checked the CLI command but not MCP surface parity.

Disposition: FIXED in 0.9.8.

### F-02 — Runtime composition remains duplicated across CLI, HTTP and MCP

Severity: P2 architecture debt.

Repository discovery, Git adapter, graph store, semantic cache, configuration resolution and indexing composition are still constructed independently in multiple entry points.

Impact:

- future behavior can drift between surfaces;
- fixes may need to be repeated;
- lifecycle/locking policy is easier to diverge.

Disposition: retained for 0.10 architecture work. No broad refactor is made in the compatibility-fix release because changing composition at this stage would unnecessarily increase regression risk.

### F-03 — Existing release gate was strong but surface-parity coverage was incomplete

Severity: P2 quality-process gap.

Release Gate v2 correctly validated build, clean clone, install, 148-test regression, performance, reliability, security, compatibility and package contents. However, the compatibility gate did not assert MCP parity for every feature surface.

Disposition: FIXED for the identified 0.9.8 gap by adding an explicit `test_gaps` MCP compatibility assertion and callable MCP contract test.

## Validation

The baseline remains green:

- 148/148 regression tests PASS.
- Performance gate PASS.
- Reliability gate PASS.
- Security gate PASS.
- Compatibility gate PASS.
- Release Gate v2 PASS before the corrective change.

The corrective change is intentionally additive and preserves the public API contract version 1.0.0.

## 0.9.8 Corrective Scope

- expose `test_gaps` through MCP;
- add MCP discovery assertion;
- add MCP callable contract test;
- bump package release to 0.9.8;
- document the revalidation and corrective release.

## Release Decision

0.9 should not be declared frozen at 0.9.7 after this audit. 0.9.8 is warranted as a small compatibility/surface-parity correction.

After 0.9.8 passes the complete Release Gate v2 from a clean checkout, the 0.9 line can be treated as revalidated and frozen, with the remaining runtime-composition debt carried into 0.10.
