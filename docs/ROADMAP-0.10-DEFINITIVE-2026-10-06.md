# Definitive Roadmap — 0.10 Architecture Completion

Date: 2026-10-06
Repository: lebavuongquyen/gitcommttestgraph
Baseline: v0.9.8 / e050caf
Status: FINAL — based on whole-code audit
Audit: docs/AUDIT-0.10-WHOLE-CODE-2026-10-06.md

## 1. Mission

0.10 is the architecture-completion release line.

It must not become another uncontrolled feature-accumulation cycle. The objective is to make the existing graph, impact, test, workflow, history, CI, diagnostics and review capabilities operate on one coherent runtime, storage and operational architecture.

The end state is a credible 1.0 foundation.

## 2. Non-negotiable development workflow

Every task follows:

Domain
→ Application
→ executable tests
→ GUI
→ MCP
→ CLI/HTTP
→ Public API when applicable
→ cross-surface conformance
→ documentation
→ quality gate
→ changelog
→ release evidence

No Surface Without Gate remains mandatory.

Every published milestone must contain complete documentation and changelog evidence.

No feature is complete merely because a service works.

## 3. Architecture rules

1. Domain contains deterministic business concepts only.
2. Application contains use cases and orchestration.
3. Infrastructure implements ports and owns physical resources.
4. Surfaces are adapters only.
5. Public SDK exports contracts, not infrastructure.
6. One application runtime owns shared dependencies.
7. MCP is a surface adapter, never a second application layer.
8. GUI is a surface adapter, never a second business layer.
9. Git history is read-only from GCTG maintenance operations.
10. Destructive GCTG storage operations require deterministic preview/proof.
11. Unknown or corrupt evidence fails closed for destructive decisions.
12. Resource budgets are explicit.
13. All persisted artifacts are versioned and migratable.
14. Every operational mutation is observable and recoverable.

## 4. Milestone map

### 0.10.0 — Runtime, Public Boundary and Storage Foundation

Goal: establish the architecture on which every later milestone depends.

#### R01 — Public package boundary
- Split internal barrel exports from stable SDK exports.
- Make `./api` the canonical SDK surface.
- Decide root-entry compatibility policy explicitly.
- Add package export-map tests.
- Prove infrastructure symbols cannot appear in the supported SDK.

Acceptance:
- clean package install exposes only approved public symbols;
- public contract tests pass;
- internal adapter refactors do not change SDK surface accidentally.

#### R02 — Application runtime
- Introduce RepositoryRuntime/ApplicationRuntime.
- Centralize Git, configuration, graph store, semantic cache, indexer, lock and operation services.
- Provide factory/composition root.
- Inject runtime into CLI, HTTP, MCP and GUI adapters.
- Remove duplicate feature orchestration.

Acceptance:
- CLI, HTTP and MCP produce equivalent semantics from the same runtime.
- Runtime ownership/lifecycle is documented.
- No surface constructs its own repository graph stack.

#### R03 — Capability registry/conformance foundation
- Define a capability descriptor containing identity, application handler and applicable surfaces.
- Add conformance checks for CLI/HTTP/MCP/GUI exposure.
- Do not generate unnecessary code; registry exists to detect drift.
- Add a test that would have caught the 0.9.8 `test_gaps` MCP omission.

Acceptance:
- missing surface registration fails the feature gate.
- surface semantics are compared, not merely names.

#### R04 — Storage abstraction
- Introduce logical snapshot identity.
- Separate metadata/index from physical JSON object.
- Introduce lifecycle state.
- Preserve existing .gctg snapshot readability.
- Add corruption metadata.
- Keep atomic writes and locking.

Acceptance:
- all existing snapshots remain readable;
- malformed state is explicit;
- storage tests pass under concurrent access.

#### R05 — GUI architecture foundation
- Split `src/gui/app.ts` into feature views/state/action modules.
- Define GUI state model.
- Keep HTML/CSS/JS delivery local and dependency-light.
- Preserve current user flows.
- Add real interaction-oriented HTTP/browser workflow tests.

Acceptance:
- current graph/review/configuration/execution workflows remain functional;
- GUI gate tests actions and resulting states;
- no business logic is introduced into GUI code.

#### 0.10.0 gates
- Runtime gate
- Public boundary gate
- Storage foundation gate
- GUI foundation gate
- MCP/CLI/HTTP parity gate
- Regression
- Reproducibility
- Security
- Release

---

### 0.10.1 — Configuration and History Lifecycle

Goal: turn policy fields into executable, explainable lifecycle behavior.

#### C01 — Configuration migration framework
- Migration registry.
- schema v1 → future schema mechanism.
- deterministic upgrade.
- backup-before-migration.
- migration result evidence.

#### C02 — Sensitive configuration boundary
- classify sensitive values;
- prohibit secrets from normal diagnostics;
- define secret-provider port;
- avoid storing secret material in ordinary configuration JSON.

#### C03 — Effective configuration explanation
- explain default/repository/runtime origin per key;
- deterministic effective-value output;
- configuration diff.

#### C04 — Configuration audit history and reload
- append-only configuration change evidence;
- operation ID and timestamp;
- explicit reload policy;
- runtime sees consistent configuration snapshot during an operation.

#### H01 — Branch lifecycle model
- observe branch creation/deletion/recreation;
- distinguish current refs, historical refs and deleted branches;
- record lifecycle evidence without modifying Git.

#### H02 — Reachability analyzer
- determine snapshot protection/reachability from commits, branches, tags, releases, PR evidence and audit evidence;
- absence of proof means protected.

#### H03 — Retention planner
- evaluate grace periods, retention policy and quotas;
- produce deterministic candidate list;
- explain every candidate and every protected item.

#### H04 — Cleanup preview/apply
- preview is pure;
- apply consumes an exact preview;
- idempotent execution;
- no Git history mutation;
- interruption-safe.

#### H05 — Snapshot quota and compaction
- max count and max size;
- accounting;
- deterministic compaction;
- preserve protected evidence.

#### 0.10.1 gates
- Configuration domain/application/surface gates
- Migration compatibility gate
- History lifecycle gate
- Retention safety gate
- Cleanup interruption gate
- Cross-surface parity
- Regression/security/reproducibility
- Release

---

### 0.10.2 — Operations, Observability and Recovery

Goal: make GCTG safe to operate continuously.

#### O01 — Operation model
- operation ID;
- lifecycle states: queued/running/succeeded/failed/cancelled/recovered;
- parent/child operations;
- correlation across GUI/CLI/HTTP/MCP.

#### O02 — Progress model
- named stages;
- completed/total where measurable;
- indeterminate state where not measurable;
- deterministic progress events.

#### O03 — Health model
- repository health;
- storage health;
- configuration health;
- index health;
- last failure;
- degraded state.

#### O04 — Operation history
- persistent bounded operation history;
- retention policy;
- query/filter;
- no secret leakage.

#### O05 — Failure taxonomy
- validation;
- Git;
- analysis;
- storage;
- corruption;
- resource;
- execution;
- external provider;
- recovery.

#### O06 — Diagnostic bundle
- machine-readable bundle;
- operation evidence;
- health;
- configuration provenance without secrets;
- storage/index summary;
- reproducibility metadata.

#### RCV01 — Consistency checker
- manifest/index/object consistency;
- dangling references;
- duplicate identity;
- corrupt snapshot;
- incomplete cleanup.

#### RCV02 — Backup/restore
- backup GCTG-owned state only;
- manifest/index/config/results/cache policy explicit;
- checksums;
- atomic restore;
- compatibility validation.

#### RCV03 — Repair/rehydration
- rebuild derived index from physical snapshots;
- rehydrate missing derived data from Git when safe;
- never fabricate semantic evidence.

#### RCV04 — Interrupted-operation recovery
- recovery journal/state;
- resume or rollback;
- idempotence;
- simulated process termination tests.

#### 0.10.2 gates
- Operations gate
- Observability gate
- Recovery gate
- Corruption gate
- Backup/restore gate
- Interrupted-operation gate
- Surface parity
- Regression/security/reproducibility
- Release

---

### 0.10.3 — Scale and Resource Platform

Goal: replace small synthetic evidence with reproducible capacity evidence.

#### S01 — Scale fixture suite
Minimum scenarios:
- 1k, 5k and 10k commits;
- 100, 500 and 1k branches;
- 1k, 10k and 50k snapshots;
- deleted-branch populations;
- large monorepo;
- large GitHub PR history.

Exact limits are evidence targets, not arbitrary promises.

#### S02 — Resource accounting
Track:
- CPU time;
- wall time;
- heap/RSS;
- disk bytes;
- snapshot count;
- cache size;
- active workers.

#### S03 — Resource budgets
- configurable worker limits;
- memory-aware concurrency;
- disk quota enforcement;
- operation cancellation/defer behavior.

#### S04 — Adaptive/deferred indexing
- prioritize requested commit;
- defer low-value historical work;
- preserve deterministic final state;
- expose progress and deferred work.

#### S05 — Concurrent workload safety
Test:
- index + query;
- index + diagnostics;
- query + maintenance preview;
- cleanup + read;
- multiple clients;
- cold/warm cache.

#### S06 — Scale regression gate
Record reproducible baseline and budget envelopes.
No arbitrary claim such as “always under N ms” unless supported by evidence.

#### 0.10.3 gates
- Scale gate
- Resource gate
- Concurrency gate
- Persistence gate
- Performance regression gate
- Security
- Reproducibility
- Cross-surface
- Release

---

### 0.10.4 — Architecture Readiness and 1.0 Preparation

Goal: attack the completed 0.10 architecture before RC.

#### A01 — Whole-system self-attack
Review:
- domain boundaries;
- runtime composition;
- public exports;
- persistence;
- configuration;
- history;
- operations;
- recovery;
- security;
- GUI;
- CLI;
- HTTP;
- MCP;
- resource budgets.

#### A02 — Surface parity audit
For every capability:
- Domain
- Application
- GUI
- MCP
- CLI
- HTTP
- Public API where applicable
- Cross-surface semantics

#### A03 — Persistence compatibility audit
- v0.9 snapshots;
- v0.9 configuration;
- results;
- caches;
- migration/repair;
- clean upgrade path.

#### A04 — Security re-audit
No broad security rewrite unless evidence requires it.

#### A05 — Scale evidence audit
Confirm documented reproducibility and budgets.

#### A06 — Public SDK audit
Confirm no internal infrastructure leakage and additive compatibility.

#### A07 — Remaining-debt classification
- P0: blocks release immediately.
- P1: must close before 1.0 RC.
- P2: documented and consciously accepted.

#### A08 — 1.0 RC readiness document
Produce:
`docs/AUDIT-0.10-ARCHITECTURE-READINESS-YYYY-MM-DD.md`

0.10.4 cannot release while a known P0/P1 stable-path issue remains.

## 5. Dependency graph

```
0.10.0
  R01 ─────┐
  R02 ─────┼──> R03
  R04 ─────┤
  R05 ─────┘

0.10.1 depends on:
  R02 + R04
  C01 -> C02 -> C03 -> C04
  H01 -> H02 -> H03 -> H04
  R04 -> H05

0.10.2 depends on:
  R02 + R04
  O01 -> O02 -> O03 -> O04/O05/O06
  RCV01 -> RCV02 -> RCV03
  O01 -> RCV04

0.10.3 depends on:
  R02 + R04 + O01
  S01 -> S02 -> S03
  S03 -> S04
  S02/S03 -> S05 -> S06

0.10.4 depends on:
  all previous milestones
```

## 6. Parallelization policy

Within a milestone, independent Domain/Application tasks may proceed in parallel.

Surface implementation starts only after the application contract is stable.

GUI and MCP are not allowed to invent independent semantics.

Release documentation is maintained during implementation, not reconstructed after coding.

## 7. Definition of Done

A task is done only when:
- implementation exists;
- domain/application tests pass;
- applicable GUI workflow passes;
- MCP contract passes;
- CLI/HTTP contract passes where exposed;
- public API contract passes where exposed;
- cross-surface semantics match;
- security behavior is tested;
- persistence/recovery behavior is tested when relevant;
- documentation is complete;
- changelog entry exists;
- quality gate passes;
- no unexplained regression remains.

## 8. Version policy

- 0.10.0: architecture foundation.
- 0.10.1: lifecycle.
- 0.10.2: operations/recovery.
- 0.10.3: scale/resources.
- 0.10.4: readiness.
- 1.0.0-rc.1 only after 0.10.4 acceptance.
- 1.0.0 only after RC acceptance.

Bug fixes inside an unfinished milestone remain milestone work unless a separately released compatibility fix is genuinely required.

## 9. Explicit non-goals for 0.10

Do not add:
- LLM-dependent correctness;
- hosted control plane;
- replacement of deterministic graph inference with probabilistic inference;
- Git history mutation;
- arbitrary provider-specific workflow generation;
- unrelated language expansion unless required by scale/architecture evidence;
- public API major redesign.

## 10. Required documentation set

Before each milestone release:
- milestone audit;
- architecture/design note;
- API/MCP/CLI/HTTP/GUI contract updates where applicable;
- migration note where persistence/config changes;
- release note;
- changelog;
- acceptance evidence.

## 11. 1.0 gate

1.0 RC is blocked until:
- P0 = 0;
- P1 = 0;
- runtime composition is shared;
- SDK boundary is clean;
- storage is indexed, accounted, corruption-aware and recoverable;
- configuration is migratable and explainable;
- retention/cleanup is deterministic and safe;
- operations are observable;
- recovery is proven;
- scale/resource evidence is reproducible;
- GUI/CLI/HTTP/MCP parity gates pass;
- public API 1.0.0 compatibility remains intact;
- clean-clone release gate passes.

## 12. Final roadmap decision

This document supersedes:
- the provisional 0.10 roadmap;
- earlier 0.9→0.10 architecture planning documents.

The implementation starting point is 0.10.0 / R01.

No coding task is considered started merely by approving this roadmap.
