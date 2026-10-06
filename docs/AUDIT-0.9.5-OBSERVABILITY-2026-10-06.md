# Audit 0.9.5 — Observability

## Objective

Add structured diagnostics to repository operations without leaking secrets or creating a second execution path.

## Findings

- Index operations had no stable operation identifier.
- Cache reuse and incremental behavior were not exposed as structured diagnostics.
- Graph size and indexing duration were not available through a common contract.
- Parser/resolver identity and uncertainty counts were not exposed.
- GUI, CLI, HTTP and MCP had no unified diagnostics surface.

## Resolution

Added DiagnosticsService and OperationDiagnostics.

Each diagnostic result contains:

- operation ID;
- operation name;
- repository and commit;
- analyzer version;
- duration;
- cache hit/miss;
- incremental flag;
- node/edge counts;
- parser and resolver identity;
- uncertainty count;
- safe indexing metadata.

The diagnostic result is deterministic except for the intentionally unique operation ID and measured duration. No environment variables, credentials or command output are copied into the diagnostic payload.

## Surfaces

- GUI: diagnostics card
- CLI: gctg diagnostics
- HTTP: /api/diagnostics
- MCP: diagnostics
- Public contract: diagnostics

## Self-attack

- TypeScript unknown metadata boundary
- deterministic schema validation
- secret-safe serialization
- CLI invocation
- HTTP invocation
- MCP invocation
- GUI discovery

Dedicated 0.9.5 tests: 6/6 PASS.
