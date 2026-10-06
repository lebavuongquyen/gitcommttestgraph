# Audit 0.9.4 — CI Integration

## Objective

Expose one deterministic CI contract across GUI, CLI, HTTP and MCP without duplicating change-analysis logic.

## Findings

- CI consumers had to assemble multiple commands themselves.
- Exit-code semantics were not centralized.
- JSON existed as individual command output, but no CI result contract existed.
- SARIF was absent.
- GUI had no explicit CI status surface.
- No CI adapter could consume the stable Change Intelligence result directly.

## Resolution

Added CiAnalysisService as the single application adapter over ChangeIntelligenceResult.

Status policy:

- PASS → exit code 0
- FAIL for high risk → exit code 1
- UNKNOWN → exit code 2

Formats:

- JSON
- SARIF 2.1.0
- human-readable summary

The service is deterministic and sorts reasons/uncertainty evidence.

## Surface gate

- GUI: /api/ci + CI inspector card
- CLI: gctg ci
- HTTP: /api/ci
- MCP: ci_analysis
- Public contract: ciAnalysis

## Self-attack

- high-risk mapping
- deterministic serialization
- SARIF generation
- CLI invocation
- HTTP invocation
- MCP invocation
- GUI discovery

All dedicated 0.9.4 tests passed: 7/7.

## CI usage

Generic CI can consume:

gctg ci COMMIT HEAD --format json

gctg ci BRANCH main HEAD --format sarif

The process exit code is the CI gate. Standard shell redirection can persist JSON/SARIF artifacts.

## GitHub Actions

The same CLI contract is provider-neutral and can be invoked directly from a GitHub Actions step. No hosted GCTG service is required.

## Deferred

A repository-installed .github/workflows template is deferred because the engine contract is provider-neutral and workflow ownership belongs to consuming repositories.
