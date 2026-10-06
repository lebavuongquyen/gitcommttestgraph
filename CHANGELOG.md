# Changelog

All notable changes to `git-commit-test-graph` are documented here.

## [0.9.0] - 2026-10-06

### Stable Public API
- Added supported programmatic entrypoint at `git-commit-test-graph/api`.
- Added explicit public API version `1.0.0`.
- Added runtime Zod validation for graph snapshot, change intelligence, impact, test impact, execution plan, evidence and public error contracts.
- Added additive compatibility policy and fail-closed schema versioning.
- Kept the package as a single distribution; package splitting remains deferred until post-1.0 product extraction.

### Documentation
- Added `docs/AUDIT-0.9.0-PUBLIC-API-2026-10-06.md`.
- Added `docs/releases/0.9.0.md`.
- Added permanent 0.9.0 public API contract coverage.

## [0.8.4] - 2026-10-06

### Security
- Hardened Git revision and Git path validation.
- Restricted GitHub repository identifiers and API endpoint selection.
- Sanitized Git/GitHub errors and isolated credential environment variables.
- Confined configuration persistence to the repository-owned .gctg directory.
- Rejected unknown configuration keys.
- Bounded HTTP JSON bodies and hardened HTTP error responses.
- Added explicit approval boundaries for HTTP and MCP test execution.
- Required --allow-execution for the CLI arbitrary process runner.

### Added
- Permanent security regression suite.
- HTTP security contract coverage.
- scripts/security-gate.mjs and npm run security:gate.
- docs/AUDIT-0.8.4-SECURITY-2026-10-06.md.
- docs/releases/0.8.4.md.

### Quality
- Security gate covers build, typecheck, security unit tests and HTTP security contracts.
- Release Gate v2 runs the security gate for versions >= 0.8.4.

## [0.8.3] - 2026-10-06

### Fixed
- Made index-lock release ownership-safe so a stale owner cannot delete a replacement lock.
- Made stale lock takeover atomic through unique rename-before-delete recovery.
- Serialized graph manifest updates across concurrent store writers.
- Normalized GitHub network, HTTP and invalid-JSON failures to the typed Git operation error boundary.
- Hardened GitHub review pagination at the exact 10,000-record safety boundary.
- Hardened GitHub check-run pagination with explicit response validation and safety limits.

### Added
- Reliability regression coverage for stale-lock replacement races and concurrent manifest writers.
- Missing historical Git-object regression coverage.
- Detached-HEAD regression coverage.
- GitHub pagination-boundary and network-failure regression coverage.
- scripts/reliability-gate.mjs and npm run reliability:gate.

### Quality
- Reliability gate: 20/20 tests passed.
- Typecheck and build passed.
- Release Gate v2 now runs the reliability gate for versions >= 0.8.3.

### Documentation
- Added docs/AUDIT-0.8.3-RELIABILITY-2026-10-06.md.
- Added docs/releases/0.8.3.md.
- Updated the 0.8–1.0 roadmap with completed reliability hardening.

## [0.8.2] - 2026-10-06

### Performance
- Added a reproducible 0.8.2 performance gate covering small, medium and large synthetic repositories.
- Added cold-index, warm-index, repeated historical query and large-history measurements.
- Added a real Git batch-read benchmark for 300 historical source files.
- Added batched historical file loading through Git `cat-file --batch`.
- Repository indexing now uses the batched source-read capability when the Git adapter provides it, with a safe fallback to individual reads.

### Quality
- Git batch historical reads preserve exact path/content mapping.
- 300-file real Git benchmark improved historical source reads from approximately 9.9s sequentially to approximately 0.1s batched on the release environment, about 94x faster.
- 0.8.2 performance gate passed.
- Typecheck and build passed.
- Full regression suite remains required by Release Gate v2.

### Documentation
- Added `docs/releases/0.8.2.md`.
- Updated the 0.8–1.0 roadmap with completed performance hardening.

## [0.8.1] - 2026-10-06

### Added
- Public contract hardening for Change Intelligence across CLI, HTTP, MCP and GUI.
- Explicit CLI usage validation and usage exit code 2 for invalid Change Intelligence source selection.
- HTTP 400 validation for invalid Change Intelligence source values.
- MCP contract coverage for the `change_intelligence` source enum and deterministic envelope.
- Determinism regression coverage for repeated CLI Change Intelligence queries.
- GUI contract coverage for the real Change Intelligence fetch path.

### Fixed
- GUI Change Intelligence loading now captures the sixth API result instead of silently discarding it.
- GUI commit loading now exposes API failures in the visible status and inspector state.

### Quality
- 7/7 dedicated 0.8.1 public-contract gates passed.
- CLI, HTTP, MCP and GUI gates passed.
- Full contract suite passed after the hardening changes.
- Typecheck and build passed.

### Documentation
- Added `docs/releases/0.8.1.md`.
- Updated the 0.8–1.0 roadmap with 0.8.1 contract-hardening acceptance.

## [0.8.0] - 2026-10-06

### Added
- Unified Change Intelligence domain and application model.
- Deterministic commit and branch change normalization.
- Unified changed-path, changed-symbol, removed-symbol and downstream-impact analysis.
- Explicit risk, reasons, uncertainty and evidence in the unified result.
- Unified test-gap, test-impact and execution-plan result.
- CLI command gctg change-intelligence.
- HTTP endpoint /api/change-intelligence.
- MCP tool change_intelligence.
- GUI Change Intelligence cockpit.
- Public contract test framework and executable M04 Quality Gate.
- Mandatory No Surface Without Gate development standard.

### Quality
- 5/5 M04 contract gates passed.
- CLI, HTTP, MCP and GUI gates passed.
- Cross-surface semantic equivalence passed.
- Full regression suite: 68/68 tests passed.
- Typecheck and build passed.

### Documentation
- Added docs/QUALITY-GATES.md.
- Added docs/releases/0.8.0.md.
- Updated the 0.8–1.0 roadmap with M01/M02 completion and M04 gate requirements.

## [0.7.1] - 2026-10-06

### Fixed
- PR analysis now uses immutable GitHub base/head SHAs.
- Fork PRs resolve exact head repositories and commits.
- Review state now uses the latest review per reviewer.
- Approval evidence is tied to the reviewed commit SHA.
- Review and check-run pagination is bounded and supported.
- Removed-symbol downstream impact is analyzed from the base graph.
- Merge-readiness is conservative when GitHub branch-protection information is unavailable.
- GitHub repository identifier validation is stricter.
- Private GitHub fetches can use GITHUB_TOKEN without putting the token in command arguments.

### Tests
- Added regression tests for fork/SHA metadata, review pagination, stale approval, invalid repository identifiers and removed-symbol downstream impact.
- Full suite: 56/56 tests passed.

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

[executed on device: QuyenLe (f538f86d-fbfa-478e-a5df-d3f9a375cbf0)]

[executed on device: QuyenLe (f538f86d-fbfa-478e-a5df-d3f9a375cbf0)]