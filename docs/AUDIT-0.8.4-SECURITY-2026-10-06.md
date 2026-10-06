# 0.8.4 Security Hardening Audit

Date: 2026-10-06
Repository: git-commit-test-graph
Baseline: v0.8.3
Status: Implementation baseline

## Objective

Harden all trust boundaries introduced by repository input, Git command execution, GitHub metadata, local HTTP/GUI, MCP, CLI, filesystem persistence, configuration, and test execution.

Security rule:

> Untrusted repository metadata must never become trusted process arguments, filesystem paths, network destinations, credentials, or executable behavior without an explicit validation boundary.

## Confirmed findings

### SEC-001 — Git error messages can expose sensitive command material
Severity: P1

Git failures currently include the full argument vector in error messages. Most arguments are safe today, but future repository URLs or ref-like values can contain credentials or sensitive material.

Required:
- central command-error sanitization;
- redact credential-bearing URLs and authorization material;
- tests proving secrets never reach thrown messages.

### SEC-002 — GitHub API base URL is environment-controlled without trust validation
Severity: P1

GITHUB_API_URL is concatenated directly with API paths. An inherited environment can redirect GitHub metadata and bearer credentials to an unintended endpoint.

Required:
- default official endpoint;
- allowlist only HTTPS GitHub API origins;
- controlled injectable provider for tests rather than arbitrary environment routing.

### SEC-003 — GitHub owner/repository validation is incomplete
Severity: P1

ownerRepo validation permits characters that can alter URL semantics.

Required:
- strict owner/repository grammar;
- reject query, fragment, percent-encoded path separators, control characters and whitespace.

### SEC-004 — Repository-root confinement is implicit rather than enforced
Severity: P1

Configuration and persistence paths are built from repositoryRoot without an explicit canonical confinement boundary.

Required:
- canonical repository root;
- repository-owned path resolver;
- confinement checks for .gctg and repository file reads;
- traversal and boundary regression tests.

### SEC-005 — HTTP request bodies have no size limit
Severity: P1

/api/config POST buffers the complete request body before parsing.

Required:
- bounded body reader;
- deterministic 413 behavior;
- malformed JSON returns 400;
- oversized payload regression.

### SEC-006 — HTTP error responses leak internal exception messages
Severity: P1

The HTTP catch-all returns error.message directly. Git paths, filesystem locations and external-provider details may become externally visible.

Required:
- stable public error envelope;
- safe message for internal failures;
- detailed diagnostics only in controlled logs.

### SEC-007 — Configuration update accepts ambiguous unknown fields
Severity: P1

Configuration validation should explicitly reject unknown keys and bounded malformed structures rather than relying on reconstruction of known fields.

Required:
- reject unknown keys;
- bounded JSON depth/size;
- schema version validation.

### SEC-008 — Process environment is broadly inherited
Severity: P1

runProcess inherits process.env and therefore child test processes can receive GITHUB_TOKEN and other secrets by default.

Required:
- execution environment policy;
- strip known credential variables by default;
- explicit allowlist/opt-in for required environment variables;
- regression test proving token isolation.

### SEC-009 — Test execution is a side-effect boundary without explicit repository trust state
Severity: P1

Execution is exposed through GUI, HTTP, CLI and MCP. Structured arguments prevent shell injection, but repository-provided test commands are still executable code.

Required:
- explicit trust policy;
- read-only analysis remains default;
- execution requires explicit authorization;
- visible security state in GUI;
- MCP/HTTP/CLI behavior aligned.

### SEC-010 — CLI run is an unrestricted arbitrary process launcher
Severity: P1

The CLI run command accepts an arbitrary executable and arguments.

Required:
- classify as privileged execution surface;
- explicit opt-in/trust flag;
- deny dangerous shell-like executables unless authorized;
- preserve structured spawn with shell=false;
- contract tests.

### SEC-011 — CLI numeric arguments can become NaN/unsafe values
Severity: P2

commits limit and serve port use Number() without strict validation.

Required:
- strict finite integer/range validation;
- deterministic usage errors.

### SEC-012 — MCP revision and resource inputs need boundary validation
Severity: P1

MCP tools accept commit/ref strings and graph resource URIs. Git command execution is structured, but security depends on rejecting ambiguous revisions and path-like resource inputs.

Required:
- Git revision validation policy;
- reject control characters and option-like values where appropriate;
- resource URI validation.

### SEC-013 — No permanent executable security gate
Severity: P1

There is no security:gate covering the above trust boundaries.

Required:
- adversarial regression suite;
- source-level security checks where useful;
- npm script;
- release-check integration for >=0.8.4.

## Threat model

Trust boundaries:

1. CLI arguments -> application
2. MCP input -> application
3. HTTP input -> application
4. repository files/metadata -> analyzers
5. Git refs/paths -> Git CLI
6. GitHub API response -> application
7. environment -> credentials/network configuration
8. test plan -> process execution
9. filesystem paths -> .gctg persistence
10. GUI -> HTTP API

## Required security gates

- secret isolation
- command injection resistance
- path traversal resistance
- Git revision validation
- GitHub URL/origin validation
- HTTP body limits
- safe error envelope
- strict configuration schema
- execution authorization
- CLI validation
- MCP contract security
- malicious repository fixture
- regression suite

## No Surface Without Gate

0.8.4 is complete only when the security capability is represented consistently across applicable surfaces:

Domain/Application -> unit/security tests -> GUI security state -> MCP security contract -> CLI/HTTP security contracts -> documentation -> security gate -> changelog -> release evidence

## Definition of Done

- [ ] all P1 findings closed or explicitly accepted
- [ ] adversarial tests permanent
- [ ] security gate executable
- [ ] configuration security hardened
- [ ] Git/GitHub trust boundaries hardened
- [ ] process execution isolated
- [ ] HTTP error/body handling hardened
- [ ] CLI/MCP validation hardened
- [ ] GUI execution security state visible
- [ ] docs updated
- [ ] changelog updated
- [ ] release gate integration
- [ ] typecheck/build/tests/contracts pass
- [ ] v0.8.4 release evidence complete
