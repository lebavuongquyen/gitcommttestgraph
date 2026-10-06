# Changelog

All notable changes to `git-commit-test-graph` are documented here.

## [0.7.0] - 2026-10-06

### Added
- Pull Request Intelligence as a first-class change source.
- PullRequestChangeSetService with deterministic merge-base, commit range and commit-level evidence.
- Provider boundary and GitHub REST metadata adapter.
- Pull request review/check state, mergeability and deterministic risk decision.
- Semantic changed-symbol, removed-symbol, downstream-impact, test-gap, test-impact and execution-plan integration.
- MCP tool `pull_request_review`.
- HTTP endpoint `/api/pull-request-review`.
- GUI Pull Request Intelligence cockpit.
- CLI command `gctg pr-review <owner/repo> <number>`.
- Unit and GUI acceptance coverage.
- 0.7.0 roadmap and release documentation.

### Changed
- TypeScript and Node typings are consistently classified as development dependencies for reproducible installation and builds.
- README and MCP architecture documentation now describe Pull Request Intelligence.

### Quality
- Full typecheck, build and 53-test suite pass.
- GitHub provider metadata mapping is covered by tests.
- GUI PR review controls are covered by acceptance assertions.
- Release gate and diff checks are required.

## [0.6.1] - 2026-10-06

### Fixed
- Hardened branch graph diffing for semantic edge-only changes.
- Distinguished true deleted symbols from line-shifted symbol identities.
- Prevented local variable churn from escalating branch review risk.
- Preserved backward compatibility for existing ChangeSet and BranchReview consumers by making new evidence fields optional.

### Added
- Per-commit ChangeSet evidence.
- Removed-symbol review evidence.
- GUI display for merge-base, removed symbols and commit evidence.
- Regression tests for edge changes, deleted symbols and line shifts.

### Quality
- Full typecheck, build and 48-test suite pass.
- HTTP and CLI branch-review smoke tests pass.
- Release gate is required and documented.

## [0.6.0] - 2026-10-06

### Added
- Branch Intelligence ChangeSet model with deterministic merge-base and branch commit range.
- Branch review engine producing decision, risk, reasons and uncertainty.
- Aggregated changed-symbol, downstream-impact, test-gap, test-impact and execution-plan analysis for branches.
- GUI branch base/head selectors and Branch Intelligence review cockpit.
- HTTP endpoints for branch listing and branch review.
- MCP tools `branches` and `branch_review`.
- CLI commands `branches` and `branch-review`.

### Changed
- Git repository port now exposes branch metadata and ancestry operations.
- GUI, MCP and CLI reuse the same branch application/domain services.

### Quality
- Added branch ancestry, ChangeSet and review tests.
- Full typecheck, build and 44-test suite pass.
- Branch Intelligence is released as a complete capability rather than a partial feature slice.

## [0.5.0] - 2026-10-05

### Added
- GUI execution panel for deterministic impacted-test plans.
- Explicit GUI action to run impacted tests after user confirmation.
- Persisted execution feedback and per-step runtime status in the GUI.
- HTTP execution endpoint backed by the same execution-plan runner used by MCP.

### Changed
- GUI now visualizes the execution boundary from static impact analysis through runtime feedback.
- Analyzer version is derived from the package version instead of a duplicated hard-coded value.
- GUI execution reuses the existing MCP/application execution semantics instead of introducing GUI-only test execution logic.

### Quality
- Added GUI acceptance assertions for execution-plan loading and explicit execution controls.
- Full typecheck, build and 41-test suite pass.

## [0.4.0] - 2026-10-05

### Added
- GUI-first local application served by `gctg serve`.
- Repository status and recent commit explorer.
- Commit selection with historical indexing.
- Focused graph canvas for changed symbols, affected symbols and impacted tests.
- Node inspector with incoming/outgoing graph evidence.
- Static test-impact panel.
- HTTP endpoints for GUI overview, focused graph, node inspection, test gaps, test impact, execution plan and execution feedback.
- Release documentation and publish checklist.

### Changed
- Replaced the previous minimal inline graph page with a usable visual workbench.
- GUI consumes application-level HTTP query capabilities instead of accessing persistence directly.
- Kept MCP as an adapter boundary; GUI feature logic is not implemented inside MCP.
- Server indexing now uses the same incremental indexing and semantic cache infrastructure as the CLI.

### Quality
- GUI foundation is deterministic and project-agnostic.
- The visual graph intentionally focuses on the change-impact neighborhood instead of rendering thousands of graph nodes at once.
- No source repository is modified by the GUI.

## [0.3.8] - 2026-10-04

See Git history for the previous release.
