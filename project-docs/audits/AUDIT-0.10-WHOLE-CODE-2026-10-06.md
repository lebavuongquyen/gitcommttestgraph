# Whole-Code Audit — 0.10 Roadmap Baseline

Date: 2026-10-06
Repository: lebavuongquyen/gitcommttestgraph
Workspace: C:\Temp\gitcommttestgraph-0.7.0
Audited baseline: v0.9.8 (e050caf)
Branch: main
Status: COMPLETE — DEFINITIVE 0.10 INPUT

## 1. Audit method

This audit is evidence-first against the actual repository, not against previous roadmap claims.

Reviewed:
- Git history, tags, branches, working-tree state and untagged commits.
- Complete source tree under `src/`.
- Complete test tree under `tests/`.
- Release scripts and quality gates.
- Public API, CLI, HTTP, MCP and GUI surfaces.
- Architecture and release documentation.
- Persistence, configuration, indexing, workflow execution and security boundaries.
- Current build, typecheck, regression, contract, performance, reliability, security and compatibility gates.

Repository facts at audit time:
- `v0.9.8` is HEAD and `origin/main`.
- Working tree is clean.
- 149/149 regression tests pass.
- 75/75 contract tests pass.
- Performance gate passes.
- Reliability gate passes 20/20.
- Security gate passes 7/7 unit + 4/4 contract checks.
- Compatibility gate passes.
- Public API version remains 1.0.0.

## 2. Executive decision

0.9.8 is a valid frozen engineering baseline. No additional 0.9.x feature release is justified by this audit.

0.10 should NOT be another feature accumulation cycle. Its purpose is to turn the current collection of working capabilities into a coherent product architecture with:

1. one application runtime/composition boundary;
2. explicit storage/index lifecycle;
3. executable configuration lifecycle;
4. safe history retention and cleanup;
5. operational observability and recovery;
6. resource/scale controls;
7. real GUI workflow architecture and cross-surface conformance;
8. a clean public SDK boundary.

The most important newly confirmed issue is the public package-boundary leak: the package root `.` currently resolves to `dist/index.js`, while `src/index.ts` exports infrastructure, adapters, HTTP server and persistence implementations. This contradicts the documented rule that infrastructure must not leak into the public SDK.

## 3. Findings

### P0 — none

No P0 failure was found on the currently stable product path.

### P1 — must be resolved in 0.10

#### P1-01 — Public SDK boundary leaks internal infrastructure

Evidence:
- `package.json` maps `main` and export `.` to `./dist/index.js`.
- `src/index.ts` exports Git adapters, JSON persistence, HTTP server, process runner, locks, semantic cache and other infrastructure.
- `./api` is a narrower public entry, but the root package entry still exposes internals.

Impact:
- Consumers can couple to implementation details.
- Internal refactors become accidental breaking changes.
- The documented SDK boundary is weaker than the actual package boundary.

0.10 action:
- Split internal composition exports from public SDK exports.
- Make `./api` the explicit stable SDK contract.
- Keep root compatibility only if it can be made safe without exposing infrastructure.
- Add package-boundary tests that fail when infrastructure symbols become public.

#### P1-02 — Runtime composition is duplicated across HTTP, MCP and CLI

Evidence:
- HTTP `startServer()` constructs Git, graph store, semantic cache, indexer, configuration service, lock and orchestration closures.
- MCP creates equivalent runtime/context/indexing dependencies and repeatedly instantiates feature services.
- CLI contains its own command orchestration.
- Source scan found repeated construction of `CliGit`, `JsonGraphStore`, `JsonSemanticCache`, `ConfigurationService` and feature analyzers.

Impact:
- Surface drift can return even when semantic capability is shared.
- Lifecycle ownership is unclear.
- Resource configuration is hard to centralize.
- Future maintenance/recovery features will otherwise be implemented three or four times.

0.10 action:
- Introduce a single application runtime/composition package.
- Surfaces become thin adapters.
- Runtime owns dependency lifecycle, repository context, configuration, indexing and stores.

#### P1-03 — Storage query strategy is not scalable or operationally truthful

Evidence:
- `JsonGraphStore.query()` scans every manifest entry and loads each snapshot.
- `getNode()` does the same.
- Query-style reads silently swallow malformed/unreadable entries.
- Manifest is currently an ordered list rather than a query-oriented index.

Impact:
- Query cost grows with snapshot count.
- Corruption can become invisible.
- Maintenance cannot explain what state exists, what is corrupt, or what can safely be removed.

0.10 action:
- Introduce storage metadata/index abstraction.
- Separate logical snapshot identity, physical object, manifest/index and lifecycle state.
- Return explicit corruption information.
- Add query complexity and large-store benchmarks.

#### P1-04 — GUI is functional but not architecturally GUI-first

Evidence:
- `src/gui/app.ts` is a 216-line monolithic server-rendered HTML/CSS/JavaScript artifact.
- The GUI contract currently verifies page reachability and string/path presence.
- The current GUI does not have a modular view/state/action architecture.
- Critical controls are not comprehensively exercised as real user workflows.

Impact:
- 0.10 operational features would create another monolithic UI.
- GUI behavior can drift from API semantics.
- Real interaction regressions may escape the current smoke gate.

0.10 action:
- Establish a GUI application/view-model boundary.
- Keep browser code modular by feature.
- Define explicit GUI states: loading, ready, empty, error, stale, running, blocked and completed.
- Add real browser-like HTTP workflow tests for critical controls.
- GUI remains an adapter over application capabilities, never a second business layer.

### P2 — planned architecture debt

#### P2-01 — Configuration is versioned only as a fixed schema number

Current schema is version 1 and unknown keys are rejected. There is no migration framework, change history, sensitive-value classification or reload policy.

0.10 action:
- Migration registry.
- Versioned upgrade path.
- Sensitive configuration metadata and secret-provider port.
- Effective-value explanation.
- Change audit record.
- Explicit reload semantics.

#### P2-02 — History retention policy exists only as configuration

The configuration model contains retention/cleanup fields, but there is no executable reachability analyzer, retention planner, compactor or cleanup executor.

0.10 action:
- Branch lifecycle evidence.
- Reachability.
- Protected evidence.
- Retention planning.
- Preview/apply.
- Interrupted cleanup recovery.
- Never mutate Git history.

#### P2-03 — Snapshot lifecycle lacks accounting and compaction

Atomic writes and locking are present and tested, but there is no storage accounting, quota enforcement, compaction or lifecycle state.

0.10 action:
- Size/count accounting.
- Quota evaluation.
- Deterministic compaction plan.
- Safe physical deletion only after a proof-based plan.

#### P2-04 — Observability is event evidence, not yet an operational model

Diagnostics currently provides operation ID, duration, cache state, graph counts, parser/resolver information and uncertainty. It does not persist a full operation lifecycle.

0.10 action:
- Health.
- Operation state.
- Progress.
- Operation history.
- Failure taxonomy.
- Resource diagnostics.
- Diagnostic bundle.

#### P2-05 — Recovery is partial

Stale index-lock recovery exists. Backup/restore, consistency checking, repair/rehydration and interrupted maintenance recovery do not.

0.10 action:
- Consistency checker.
- Recovery journal/state.
- Backup/restore of GCTG-owned state.
- Repair/rehydration.
- Safe maintenance runner.

#### P2-06 — Scale evidence is too small

Current evidence covers synthetic 30/120/300-file scenarios and short histories. It does not establish thousands of commits, hundreds/thousands of branches, large snapshot stores or concurrent maintenance/query workloads.

0.10 action:
- Scale fixtures.
- Resource budgets.
- Memory/disk accounting.
- Concurrent workload tests.
- Large-history and large-store regression gates.

#### P2-07 — Surface registration remains manual

The 0.9.8 `test_gaps` MCP gap demonstrated that a capability can exist in application/CLI/HTTP but be forgotten in MCP.

0.10 action:
- Define a capability manifest/registration model where it reduces manual parity risk.
- Generate or validate surface conformance.
- Keep MCP as an adapter over application capabilities.

#### P2-08 — CLI and HTTP entrypoints are still too large

`bin/gctg.mjs` is 353 lines and HTTP server is 378 lines. Both contain substantial routing/orchestration logic.

0.10 action:
- Extract command handlers and route handlers.
- Centralize request validation/serialization.
- Preserve thin adapters.

## 4. Confirmed strengths to preserve

- Deterministic semantic graph and evidence model.
- Historical commit-aware analysis.
- Semantic project analysis and workspace/package resolution.
- Incremental indexing and semantic cache.
- Atomic graph persistence and stale-lock recovery.
- Test graph, test-gap and test-impact analysis.
- Execution approval boundary.
- Structured diagnostics.
- Branch and pull-request intelligence.
- Configuration precedence and strict validation.
- Security input validation, redaction and process environment controls.
- Public API version 1.0.0 and additive compatibility policy.
- Strong release/quality-gate discipline.

0.10 must improve architecture without replacing these foundations unnecessarily.

## 5. Architecture target

The target runtime should become:

```
                    Public SDK / CLI / HTTP / MCP / GUI
                                  |
                                  v
                         Surface Adapters
                                  |
                                  v
                       Application Runtime
                  +---------------+----------------+
                  |               |                |
             Use Cases       Repository       Operations
                  |            Runtime            |
                  |               |                |
                  +-------+-------+--------+-------+
                          |                |
                     Domain Model      Ports
                          |                |
                   +------+-------+--------+------+
                   |              |               |
                 Git          Storage          Process
                   |              |               |
                 Git          Graph/Index      Test tools
```

Storage should become:

```
Logical Snapshot ID
        |
        +-- Metadata / Index
        |
        +-- Physical Object
        |
        +-- Lifecycle State
        |      +-- active
        |      +-- protected
        |      +-- eligible
        |      +-- corrupt
        |      +-- deleted
        |
        +-- Accounting
```

## 6. 0.10 priority order

P1-01 Public boundary
P1-02 Runtime composition
P1-03 Storage/index abstraction
P1-04 GUI architecture

then:

P2-01 Configuration lifecycle
P2-02/P2-03 History + storage lifecycle
P2-04/P2-05 Operations + recovery
P2-06 Scale/resources
P2-07 Surface conformance
P2-08 adapter extraction

## 7. 1.0 exit criteria

0.10 is complete only when:
- public SDK cannot accidentally expose internal infrastructure;
- CLI/HTTP/MCP/GUI share the same application runtime;
- storage lifecycle is queryable, accounted, corruption-aware and recoverable;
- configuration migrations and sensitive-value boundaries exist;
- retention/cleanup is deterministic, previewable and interruption-safe;
- operational state and recovery are observable;
- scale/resource evidence is reproducible;
- every applicable surface has executable gates;
- all stable-path P0/P1 issues are closed;
- release gate passes from a clean clone.

## 8. Audit conclusion

No 0.9.x patch release is required by this audit.

The existing provisional 0.10 documents are superseded by the definitive roadmap produced from this whole-code audit.
