# Audit — 0.9.3 Historical Intelligence

Date: 2026-10-06
Repository: git-commit-test-graph
Baseline: v0.9.2
Status: IMPLEMENTATION AUDIT

## Objective

Introduce deterministic historical intelligence without creating a parallel history subsystem. Historical answers must be derived from verified Git commits and graph snapshots.

## Current architecture findings

### HIST-001 — Snapshot-per-commit foundation exists
Status: CONFIRMED / REUSE

RepositoryIndexer already builds GraphSnapshot for an exact commit. Git reads use commit-qualified paths and the Git port exposes commit diffs.

Decision: reuse the existing snapshot/index architecture.

### HIST-002 — Graph diff is useful but not a historical model
Status: CONFIRMED / GAP

GraphDiff reports added/removed/changed nodes and edges between two snapshots, but it does not model semantic evolution, symbol lineage, dependency transitions, or test-impact transitions.

Decision: build one application-level Historical Intelligence model on top of GraphDiff and snapshots.

### HIST-003 — Symbol identity is not stable enough for naive lineage
Status: P1

Current symbol IDs can change when file ownership/path changes. Existing removed-symbol detection uses file + name + kind identity and therefore cannot reliably establish rename/move lineage.

Decision: historical lineage must distinguish:
- exact identity;
- same semantic symbol candidate;
- removed/added without proven lineage.

Never claim a rename unless evidence is deterministic.

### HIST-004 — Test impact is snapshot-relative
Status: CONFIRMED

TestImpactAnalyzer can answer impact for a single snapshot. There is no historical transition model showing when a test became impacted or ceased being impacted.

Decision: evaluate test impact at selected historical snapshots and report transitions with evidence.

### HIST-005 — Dependency history is implicit in graph edges
Status: CONFIRMED

IMPORTS/DEPENDS_ON/etc. exist per snapshot, but there is no historical transition query.

Decision: derive dependency additions/removals from canonical edge identity across snapshots.

### HIST-006 — Git history traversal exists but merge semantics need explicit policy
Status: P1

GitRepositoryPort supports commits-between and commit metadata. Multi-parent commits exist in the model.

Decision:
- linear history uses first-parent progression for default commit-to-commit evolution;
- arbitrary A→B analysis uses an explicit snapshot sequence;
- merge commits remain represented with all parents;
- no fabricated single-parent semantic history for merges.

### HIST-007 — Rewritten/shallow history must fail closed
Status: P1

Existing reliability hardening covers missing objects and shallow history. Historical Intelligence must not silently fill missing snapshots or infer unavailable ancestry.

Decision: return explicit unavailable/uncertain evidence when required commits cannot be resolved.

### HIST-008 — Resource cost can grow with history length
Status: P1

Analyzing every commit independently can be expensive.

Decision:
- bounded query window;
- deterministic sampling is not acceptable for exact historical claims;
- only required snapshots are materialized;
- future retention/cache policy remains a later lifecycle concern.

### HIST-009 — Public API is frozen at 0.9.0
Status: P1

A new public contract family requires explicit compatibility review.

Decision: expose Historical Intelligence through the public API only with a versioned additive contract and dedicated contract tests.

### HIST-010 — Surface parity is mandatory
Status: P0 PROCESS

Historical Intelligence must follow No Surface Without Gate:
Application -> GUI -> MCP -> CLI/HTTP where useful -> contracts -> docs -> release evidence.

## Self-attack scenarios

Required regression coverage:
1. one commit A→B;
2. multiple commits A→B;
3. added/removed/changed symbols;
4. dependency add/remove;
5. test becomes impacted;
6. test ceases to be impacted;
7. file rename with unchanged symbol;
8. symbol removed and recreated;
9. merge commit;
10. shallow/missing historical object;
11. rewritten history / unavailable commit;
12. deterministic repeated query;
13. empty window;
14. large history bounded by query limits.

## Canonical 0.9.3 model

HistoricalAnalysis:
- schemaVersion
- repository
- fromCommit
- toCommit
- commits
- symbolTransitions
- dependencyTransitions
- testImpactTransitions
- evidence
- uncertainty
- deterministic

Transition kinds must be explicit:
ADDED, REMOVED, CHANGED, UNCHANGED, BECAME_IMPACTED, CEASED_IMPACTED.

Lineage confidence must never exceed the underlying evidence.

## Implementation order

1. Historical domain/application model.
2. Snapshot-sequence/history service.
3. Symbol/dependency/test transition analyzers.
4. Dedicated application tests.
5. GUI historical cockpit.
6. MCP adapter.
7. CLI/HTTP adapters.
8. Public API contract.
9. Surface contract tests.
10. Documentation/changelog/release gate.

## Acceptance

A 0.9.3 release is accepted only when:
- historical results are deterministic;
- no unavailable commit is silently substituted;
- merge/rename/removal behavior is explicit;
- test-impact transitions are evidence-backed;
- all applicable surfaces pass contract gates;
- typecheck/build/full regression/release gate pass;
- release documentation and changelog are complete.
