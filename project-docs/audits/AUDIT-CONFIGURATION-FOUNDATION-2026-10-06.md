# Configuration Architecture Audit — 2026-10-06

Repository: git-commit-test-graph
Baseline: v0.8.3
Status: Initial 0.10.x architecture discovery

## Executive summary

The architecture had a configuration concept but not a configuration subsystem.

Existing code passed configuration as an untyped `unknown` value into snapshots and indexers, while public surfaces instantiated an empty `{}` configuration independently. This preserved fingerprinting but provided no centralized source management, validation, precedence, explainability, persistence, or public management contract.

The first 0.10.x implementation therefore establishes a small Configuration Foundation before History Lifecycle/Retention work is expanded.

## Findings

### CONFIG-001 — P0/P1 architectural gap: no centralized configuration subsystem

Status: FIXED IN FOUNDATION

Evidence:
- `RepositoryIndexer.IndexOptions.configuration` was untyped.
- HTTP server used a module-level empty configuration.
- MCP server used a separate empty configuration.
- CLI used another empty configuration.
- `GraphSnapshot` stored only a configuration fingerprint.

Impact:
- configuration behavior could diverge by surface;
- feature-specific configuration had no stable ownership;
- retention/resource policies would otherwise become scattered options.

Action:
- added `ConfigurationService`;
- added typed `GctgConfiguration`;
- added configuration store port and JSON repository store;
- all current indexing surfaces resolve the same repository configuration.

### CONFIG-002 — No source precedence model

Status: FIXED IN FOUNDATION

Implemented precedence:

```
RUNTIME > REPOSITORY > DEFAULT
```

The resolved result records its sources so a setting can be explained.

Future provisional source layers such as global user configuration and environment variables remain intentionally open for the 0.9-to-0.10 re-audit.

### CONFIG-003 — No configuration validation boundary

Status: FIXED IN FOUNDATION

Configuration is validated before persistence and after resolution.

Invalid cleanup modes, invalid integer ranges, missing required typed sections, and unsupported schema versions fail explicitly.

### CONFIG-004 — No repository configuration persistence

Status: FIXED IN FOUNDATION

Repository configuration is persisted atomically to:

```
.gctg/config.json
```

The store writes a temporary file and renames it into place.

### CONFIG-005 — No public configuration surface

Status: FIXED IN FOUNDATION

Initial vertical slice now exists across:
- GUI: configuration panel with resolved values and JSON editor;
- CLI: `gctg config`;
- HTTP: `GET /api/config` and validated `POST /api/config`;
- MCP: `configuration` tool.

All are backed by the same application service.

### CONFIG-006 — Configuration had no quality gate

Status: FIXED IN FOUNDATION

Added:
- `scripts/configuration-gate.mjs`
- `npm run configuration:gate`

The gate executes build plus configuration unit and public-surface contract tests.

## Remaining provisional gaps

These are deliberately not silently implemented yet:

1. Global/user configuration.
2. Environment-variable source mapping.
3. Configuration migration/version upgrade framework.
4. Secret-aware configuration fields.
5. Configuration audit/event history.
6. Schema-generated GUI forms.
7. Fine-grained per-setting documentation metadata.
8. Configuration change authorization.
9. Cross-process configuration locking.
10. Configuration diff/preview/rollback.
11. Integration with every future 0.9.x subsystem.

These belong to the 0.9-to-0.10 re-audit and should be added only when supported by evidence.

## Architectural decision

Configuration is now treated as a platform subsystem, not a utility module.

Target flow:

```
Configuration Sources
        |
        v
Configuration Service
        |
        +--> validation
        +--> merge / precedence
        +--> resolved configuration
        +--> explainable sources
        |
        v
Application Services
        |
        +--> indexing
        +--> retention
        +--> performance
        +--> storage
        +--> security
        |
        v
CLI / HTTP / MCP / GUI
```

## Next step

Do not implement automatic history cleanup directly.

First use this Configuration Foundation as the policy input for the History Lifecycle design, then add deterministic retention planning with preview-before-apply semantics.
