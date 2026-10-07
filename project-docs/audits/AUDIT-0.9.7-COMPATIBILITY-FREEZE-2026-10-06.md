# Audit 0.9.7 — Compatibility Freeze

## Objective

Freeze the supported 0.9.x compatibility surface before the mandatory 0.9 → 0.10 architecture re-audit.

## Frozen boundaries

- Public API version remains 1.0.0.
- Supported package import is `git-commit-test-graph/api`.
- Existing public contract families remain registered.
- Existing CLI capability names remain available.
- Historical Intelligence, Monorepo Intelligence, CI Analysis and Diagnostics remain public capabilities.
- MCP remains an adapter over application services.
- Execution approval boundaries remain unchanged.

## Compatibility policy

0.9.x accepts additive changes only. Existing public fields, command names, contract families and security boundaries must not be silently reinterpreted.

Breaking architectural changes are deferred to the 0.10 planning boundary after re-audit.

## Self-attack

The compatibility gate verifies package version, public API version, contract registry, CLI command presence, and public exports. It is intentionally independent from implementation internals.

## Acceptance

- Compatibility gate is part of Release Gate v2 from 0.9.7 onward.
- Dedicated compatibility checks cover the frozen surface.
- No 0.10 architecture changes are introduced by this milestone.
