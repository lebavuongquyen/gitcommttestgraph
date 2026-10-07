# Quality Gate Standard

Status: Mandatory development standard
Effective from: 0.8.x
Repository: git-commit-test-graph

## Principle

A capability is not complete when its domain logic merely works.

Every externally exposed surface must have an executable quality gate.

> No Surface Without Gate.

## Required gates

A feature uses the gates for every surface it exposes:

1. Domain gate
2. Application gate
3. CLI gate
4. HTTP/API gate
5. MCP gate
6. GUI gate
7. Cross-surface consistency gate
8. Regression gate
9. Reproducibility gate
10. Release gate

CLI, HTTP/API, MCP and GUI gates are mandatory when those surfaces expose the capability.

## Gate hierarchy

```
Feature
  |
  +-- Domain Gate
  |
  +-- Application Gate
  |
  +-- Public Surface Gates
  |     +-- CLI
  |     +-- HTTP/API
  |     +-- MCP
  |     +-- GUI
  |
  +-- Cross-Surface Gate
  |
  +-- Regression Gate
  |
  +-- Reproducibility Gate
  |
  +-- Release Gate
```

## Public-surface requirements

### CLI

The gate verifies command behavior, invalid-input exit codes, machine-readable output, diagnostics, deterministic ordering and schema metadata where required.

### HTTP/API

The gate verifies endpoint availability, request validation, success/error status, content type, response schema, deterministic serialization and public-boundary isolation.

### MCP

The gate verifies initialization, tool discovery, name/schema, invocation, result/error shape, side-effect boundaries and deterministic application semantics.

### GUI

The gate verifies the real HTTP path:

```
Browser -> GUI -> HTTP/API -> Application -> Domain
```

Rendering a template/string alone is insufficient. Critical controls, API reachability, states and user workflow must be exercised.

## Cross-surface consistency

When a capability is exposed through multiple surfaces, semantic results must remain equivalent. Serialization may differ, meaning must not.

## Definition of Done

A feature cannot be marked complete until all applicable gates pass.

A failed surface gate blocks feature acceptance.

A release gate is not a substitute for a feature gate.

## Contract test framework

Reusable helpers live in:

```
tests/contracts/helpers.mjs
```

Baseline suites:

```
tests/contracts/cli.contract.test.mjs
tests/contracts/http.contract.test.mjs
tests/contracts/mcp.contract.test.mjs
tests/contracts/gui-http.contract.test.mjs
```

Run:

```
npm run contract:check
```

The framework provides CLI process execution, real HTTP smoke testing, MCP JSON-RPC process testing, canonicalization and cross-surface comparison helpers.

## Feature-specific gates

Each major feature must define a gate matrix in its roadmap or acceptance document.

M04 minimum:

- M04-DOMAIN
- M04-APPLICATION
- M04-CLI
- M04-HTTP
- M04-MCP
- M04-GUI
- M04-CROSS-SURFACE
- M04-REGRESSION
- M04-REPRODUCIBILITY
- M04-SECURITY

## Release relationship

Feature gates prove capability correctness.

Release Gate v2 proves repository releasability.

Both are required.

```
Feature Quality Gates
        |
        v
Feature Accepted
        |
        v
Release Gate v2
        |
        v
Release
```
