# Changelog

All notable changes to git-commit-test-graph are documented here.

## [0.10.0] - Unreleased
### RCV04 - Interrupted-operation Recovery - 2026-10-07

- Added persistent recovery journal with explicit operation phases.
- Added resume and rollback paths with idempotent deterministic re-indexing.
- Added GUI, HTTP /api/recovery/interrupted and MCP recovery_interrupted surfaces.
- Added simulated-interruption and journal persistence tests plus RCV04 documentation.

### RCV03 - Repair / Rehydration - 2026-10-07

- Added evidence-backed repair planning with explicit preview/apply separation.
- Added physical-snapshot manifest rebuild for orphan-only evidence.
- Added deterministic Git-backed HEAD rehydration through the normal indexer.
- Added fail-closed blocking for manifest, duplicate, missing-object and corrupt-object evidence.
- Exposed repair through GUI, HTTP /api/recovery/repair and MCP recovery_repair.
- Added focused RCV03 tests and docs/0.10.2-RCV03-REPAIR-REHYDRATION.md.

### RCV02 - Backup / Restore - 2026-10-07

- Added checksum-protected portable backups for GCTG-owned state.
- Made backup policy explicit for config, history, graph, results and semantic cache while excluding lock and temporary artifacts.
- Added atomic staged restore with pre-restore checksum validation and no Git history mutation.
- Exposed backup/inspect/restore through the GUI, HTTP `/api/recovery` and MCP `backup_restore`.
- Added focused unit coverage and `docs/0.10.2-RCV02-BACKUP-RESTORE.md`.


### C01 - Configuration Migration Framework - 2026-10-06

- Added a small configuration migration registry for future schema upgrades.
- Added deterministic schema-version handling and fail-closed rejection of unsupported future versions.
- Added backup-before-write behavior for migrated repository configuration.
- Added migration evidence to resolved configuration results.
- Added unit coverage for current, future, migrated and backup scenarios.
### R10 - GUI State and Workflow Hardening - 2026-10-06

- Added a typed GUI state boundary covering load, stale/error and execution lifecycle states.
- Added deterministic state-transition contract tests and browser-safe state delivery.
- Updated the browser controller to consume explicit GUI state transitions for loading, selection and execution.
- Corrected known mojibake presentation strings in the GUI controller.
- Preserved the existing capability catalog, view-model and HTTP contracts.

### R09 - GUI Capability Routing Single Source of Truth - 2026-10-06

- Made the typed GUI capability catalog the single source of truth for browser capability routing.
- Added explicit browser keys to GUI capability descriptors and generated the browser route map from those descriptors.
- Added R09 contract coverage for unique browser keys and rejection of hard-coded GUI API route catalogs.
- Updated GUI architecture contracts to validate catalog-driven routing rather than raw route literals.

### R08 - Complete GUI Capability Catalog - 2026-10-06

- Completed the typed GUI catalog for all 20 browser API capabilities.
- Added secondary GUI presentation ViewModel target contracts for the remaining intelligence panels.
- Added catalog completeness and duplicate-id/path contract coverage.

### R07 - GUI View Models - 2026-10-06

- Added pure GUI view-model adapters for status, commits, graph, execution, and change intelligence.
- Reused a browser-safe view-model script from the same module to keep client normalization aligned with the typed presentation contract.
- Added R07 GUI view-model contract coverage while preserving existing HTTP and visual contracts.


### R01 — Public Package Boundary
- Made `git-commit-test-graph` and `git-commit-test-graph/api` resolve to the supported public SDK entrypoint.
- Kept internal composition exports outside the package export map.
- Added package-boundary contract tests that reject known infrastructure symbols from the public root.

### R02 — Shared Application Runtime
- Added a single application runtime owning repository discovery, configuration, Git, graph storage, semantic cache, indexing and locking.
- Routed CLI, HTTP and MCP indexing/configuration through the shared runtime.
- Added runtime composition conformance tests to prevent surface-level dependency-stack duplication.

### R03 — Capability Surface Conformance
- Added a capability registry describing application handlers and applicable GUI, MCP, CLI, HTTP and public-API surfaces.
- Added executable conformance checks that detect surface drift.
- The new gate caught the missing GUI test-gap surface; the GUI now exposes test-gap analysis.
- Preserved existing GUI contract behavior while adding the test-gap view.

### R04 — Storage Capability Boundaries
- Split graph storage into snapshot and node/query application capabilities while retaining the existing GraphStore compatibility contract.
- Added explicit graph storage capability composition for infrastructure adapters.
- Split semantic cache into reader and writer capabilities.
- Added storage capability contract tests for the JSON adapters.

### R05 — GUI Architecture Foundation
- Separated the server-rendered GUI document shell from the browser controller.
- Kept GUI behavior and HTTP routes compatible while moving API orchestration into a dedicated GUI client module.
- Added GUI architecture contracts preventing direct application, domain and infrastructure dependencies in GUI code.

### R06 — Typed GUI Capability Boundary
- Added typed GUI capability descriptors and initial GUI view-model contracts.
- Centralized GUI HTTP capability routing and query construction in the browser controller.
- Added contracts preventing GUI capability drift from the application capability registry.

## [0.9.8] - 2026-10-06

### 0.9 Revalidation and MCP Surface Parity
- Revalidated the complete 0.9 line after repeated development interruptions.
- Exposed the existing test-gap intelligence through MCP as `test_gaps`.
- Added MCP discovery and callable contract coverage.
- Preserved public API compatibility at 1.0.0.
- Recorded remaining runtime-composition architecture debt for 0.10.

## [0.9.7] - 2026-10-06

### Compatibility Freeze
- Froze the 0.9 public API compatibility surface.
- Kept public API version at 1.0.0.
- Added compatibility verification for contract registry, CLI commands and public exports.
- Integrated compatibility verification into Release Gate v2.
- Marked the mandatory 0.9 to 0.10 architecture re-audit as the next milestone.

## [0.9.6] - 2026-10-06

### Documentation and SDK Preview
- Added API, MCP and CLI references.
- Added integration, troubleshooting, performance and security guides.
- Added extension guide and SDK preview guide.
- Added README documentation index.
- Exported CI Analysis and Diagnostics types from the public API.
- Added 3 documentation/SDK contract tests.

## [0.9.5] - 2026-10-06

### Observability
- Added structured OperationDiagnostics.
- Added operation IDs, duration, cache/incremental state, graph counts and uncertainty counts.
- Added secret-safe parser/resolver and indexing metadata.
- Added GUI diagnostics card.
- Added CLI gctg diagnostics.
- Added HTTP /api/diagnostics.
- Added MCP diagnostics.
- Added public diagnostics contract.

### Quality
- Added 6 dedicated 0.9.5 diagnostics tests.


## [0.9.4] - 2026-10-06

### CI Integration
- Added deterministic CI analysis over Change Intelligence.
- Added PASS/FAIL/UNKNOWN status and exit codes 0/1/2.
- Added JSON, SARIF 2.1.0 and summary formats.
- Added GUI CI status surface.
- Added CLI gctg ci.
- Added HTTP /api/ci.
- Added MCP ci_analysis.
- Added public ciAnalysis contract.

### Quality
- Added 7 dedicated 0.9.4 application/surface contract tests.

## [0.9.3] - 2026-10-06

### Historical Intelligence
- Added deterministic multi-commit historical analysis over commit-scoped graph snapshots.
- Added symbol, dependency and test-impact transition models.
- Added canonical short/full Git reference normalization.
- Added bounded historical windows with fail-closed behavior.
- Added explicit merge-commit uncertainty evidence.
- Added deterministic evidence ordering and deduplication.

### Surfaces
- Added CLI command gctg historical-intelligence.
- Added HTTP endpoint /api/historical-intelligence.
- Added MCP tool historical_intelligence.
- Added GUI Historical Intelligence panel.
- Added public API historicalIntelligence contract.

### Quality
- Added 3 application historical contract tests.
- Added 4 CLI/HTTP/MCP/GUI surface contract tests.
- Dedicated 0.9.3 contracts: 7/7 PASS.

## [0.9.2] - 2026-10-06

### Monorepo Intelligence
- Added unified monorepo analysis for workspace boundaries and package topology.
- Added package dependency and reverse-dependent reporting.
- Added package source ownership and package-specific test-project reporting.
- Added package-level impact propagation through verified dependency edges.
- Added GUI, CLI, HTTP and MCP surfaces.
- Added permanent 0.9.2 contract coverage.

## [0.9.1] - 2026-10-06

### Repository Ecosystem
- Added explicit repository ecosystem analysis for npm, pnpm, yarn, bun, TypeScript, JavaScript, Node test, Jest, Vitest, Playwright and generic scripts.
- Added explicit UNKNOWN handling for unsupported or unverified ecosystems.
- Added GUI, CLI, HTTP and MCP surfaces for ecosystem analysis.
- Added permanent ecosystem contract coverage.

### Documentation
- Added docs/AUDIT-0.9.1-REPOSITORY-ECOSYSTEM-2026-10-06.md.
- Added docs/releases/0.9.1.md.

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
### C02 - Configuration Safety Boundary - 2026-10-06

- Added protected-value classification and recursive diagnostic redaction.
- Added a secure value provider application port.
- Prevented classified configuration fields from being accepted by ordinary configuration validation.
- Added unit coverage for classification, nested redaction and validation safety.

### C03 - Effective Configuration Explanation - 2026-10-06

- Added a small explanation model for effective configuration values.
- Made configuration precedence explicit: DEFAULT, REPOSITORY, then RUNTIME.
- Added winning-source attribution and source locations for nested configuration values.
- Added targeted tests and Fresher/Junior-oriented documentation without changing resolution behavior.

### C04 - Configuration History and Reload - 2026-10-07

- Added append-only configuration change evidence with operation ID and timestamp.
- Added explicit runtime configuration reload.
- Added configuration history access through the application runtime.
- Exposed history and reload operations through the existing MCP configuration tool.
- Added persistence tests and Fresher/Junior-oriented documentation.

### H01 - Branch Lifecycle Model - 2026-10-07

- Added read-only branch lifecycle evidence based on current refs and available reflog data.
- Added deleted and recreated branch evidence classification.
- Exposed branch lifecycle analysis through HTTP and MCP.
- Added focused tests and Fresher/Junior-oriented documentation.

### H02 - Reachability Analyzer - 2026-10-07

- Added deterministic commit reachability analysis against current branch refs.
- Added explicit protected-commit evidence support.
- Preserved uncertainty when Git evidence is unavailable.
- Exposed reachability through HTTP and MCP.
- Added focused tests and documentation.

### H03 - Retention Planner - 2026-10-07

- Added deterministic retention planning from policy, protection evidence and deleted-branch grace periods.
- Added quota-pressure evaluation without allowing protected evidence to be silently selected.
- Exposed retention planning through HTTP and MCP.
- Added focused tests and documentation.

### H04 - Cleanup Preview and Apply - 2026-10-07

- Added exact, deterministic cleanup previews for GCTG-owned snapshots.
- Added proof-checked cleanup apply with stale-preview rejection.
- Added idempotent repeated apply behavior and manifest locking.
- Exposed cleanup preview/apply through HTTP and MCP.
- Added focused tests and documentation.

### H05 - Snapshot Accounting and Compaction - 2026-10-07

- Added snapshot count and size accounting.
- Added deterministic quota-pressure compaction planning.
- Protected snapshot paths are excluded from compaction candidates.
- Exposed accounting and compaction planning through HTTP and MCP.
- Added focused tests and documentation.

### O01 - Operation Model - 2026-10-07

- Added explicit queued/running/succeeded/failed/cancelled/recovered operation states.
- Added parent operation linkage and operation metadata.
- Integrated indexing lifecycle with the shared runtime operation tracker.
- Exposed operation inspection through HTTP and MCP.
- Added focused tests and documentation.

### O02 - Progress Stages - 2026-10-07

- Added explicit progress stage model for runtime operations.
- Integrated indexing with lock/analyze/complete progress stages.
- Exposed progress through HTTP and MCP.
- Added focused tests and documentation.

### RCV01 - Consistency Checker - 2026-10-07

- Added read-only consistency checking for manifest, snapshot objects and incomplete temporary artifacts.
- Detects duplicate identities, missing objects, corrupt objects and orphan objects.
- Exposed consistency checking through HTTP /api/consistency-check and MCP consistency_check.
- Added focused storage, unit and cross-surface contract coverage.
- Added docs/0.10.2-RCV01-CONSISTENCY-CHECKER.md.

### O06 - Diagnostic Bundle - 2026-10-07

- Added a machine-readable diagnostic bundle combining health, bounded operation history, configuration provenance, storage accounting and reproducibility metadata.
- Exposed the bundle through HTTP /api/diagnostic-bundle and MCP diagnostic_bundle.
- Preserved the existing secret-safe boundaries.
- Added focused unit and cross-surface contract coverage.
- Added docs/0.10.2-O06-DIAGNOSTIC-BUNDLE.md.

### O05 - Failure Taxonomy - 2026-10-07

- Added deterministic validation, Git, analysis, storage, corruption, resource, execution, external-provider and recovery failure categories.
- Added failureCategory to failed operation records.
- Added conservative retryability classification without automatic retries.
- Preserved secret-safe error messages.
- Added focused unit coverage and documentation.

### O04 - Persistent Operation History - 2026-10-07

- Persisted bounded runtime operation history in repository-owned .gctg/operations.json.
- Restored operation history when the shared application runtime starts.
- Added deterministic name/state/limit filtering.
- Added secret-safe metadata and error redaction.
- Exposed operation history through HTTP /api/operations and MCP operations.
- Added focused unit and cross-surface contract coverage.
- Added docs/0.10.2-O04-OPERATION-HISTORY.md.

### O03 - Health Aggregation - 2026-10-07

- Added read-only health aggregation for Git, snapshot storage and failed runtime operations.
- Added HEALTHY, DEGRADED and UNHEALTHY statuses.
- Exposed health through HTTP and MCP.
- Added focused tests and documentation.
