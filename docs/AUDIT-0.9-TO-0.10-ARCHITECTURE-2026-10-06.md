# Mandatory 0.9 → 0.10 Architecture Re-audit

Date: 2026-10-06
Baseline: v0.9.7
Status: COMPLETE

## Executive result

The 0.9 line is suitable as a public production-engineering foundation, but it is not yet a 1.0 architecture freeze.

The audit confirms that the core Domain → Application → Adapter/Infrastructure separation is healthy on the stable paths. Public API, GUI, CLI, HTTP and MCP are now established as surfaces over shared application capabilities.

The remaining architecture work is concentrated in lifecycle, storage/resource ownership, operational runtime composition, configuration evolution, and scale evidence.

## Classification summary

| ID | Finding | Classification | 0.10 action |
| --- | --- | --- | --- |
| A01 | Configuration platform exists but lacks migration/version lifecycle and sensitive-value policy | CONFIRMED | Complete configuration lifecycle |
| A02 | History retention and cleanup model is designed but not implemented | CONFIRMED | Implement history lifecycle platform |
| A03 | Snapshot storage has atomic writes and manifest locking but no quota/accounting/compaction lifecycle | MERGED | Merge into storage + history lifecycle |
| A04 | Diagnostics exists but health/progress/operation-history model is incomplete | MERGED | Expand observability platform |
| A05 | Security boundaries are strong on current stable paths | DEFERRED | Continue maintenance; no broad redesign required |
| A06 | Operational recovery is partial: stale index locks recover, but repair/rehydration/backup/restore are absent | CONFIRMED | Add operations and recovery |
| A07 | HTTP composition root owns repository/config/indexing wiring and duplicates orchestration | NEW | Introduce application runtime/composition boundary |
| A08 | JSON graph queries scan manifest snapshots and silently ignore corrupt entries | NEW | Add storage index/query strategy and explicit corruption reporting |
| A09 | Scale evidence is limited to synthetic 30/120/300-file scenarios | CONFIRMED | Add repository-scale evidence and budgets |
| A10 | Public surface parity is broadly established, but some capability additions still rely on manual surface wiring | MERGED | Add capability registration/conformance mechanism where justified |
| A11 | Test/release gates are strong; parallel test execution has an observed MCP EPERM flake | DEFERRED | Track as test-harness reliability debt unless reproduced in product runtime |
| A12 | 0.9 public contract is stable and suitable for freeze | REMOVED | No additional public-contract redesign in 0.10 |

## Architecture boundary review

### Domain

Strong. Domain models exist for graph, evidence, change intelligence, CI, diagnostics, historical intelligence, configuration, security, workflow, package and test concepts.

### Application

Strong but growing. Services remain the main feature boundary. Indexing orchestration and HTTP composition still deserve a clearer application runtime boundary.

### Adapters / Infrastructure

Healthy separation is present for Git, GitHub, language analysis, package managers, test frameworks, persistence, HTTP and process execution.

### Public API

Frozen at public API version 1.0.0. Internal infrastructure is not part of the supported SDK preview.

### GUI / MCP / CLI / HTTP

They consume shared application capabilities on the major 0.9 surfaces. The remaining risk is manual wiring drift rather than duplicated domain logic.

## Configuration findings

Current configuration supports DEFAULT → REPOSITORY → RUNTIME precedence, validation, persistence, cleanup policy and storage/performance policy fields.

Missing architecture:

- schema migration/version upgrades;
- sensitive-value classification and secure secret-provider boundary;
- configuration change audit history;
- stronger explanation of effective values per key;
- operational configuration reload policy.

These are 0.10 foundations, not 1.0 application features by themselves.

## History and storage findings

The current graph store uses atomic snapshot writes, a manifest and locking. However, there is no implemented retention planner, reachability analyzer, compactor or cleanup executor.

Additionally, `JsonGraphStore.query()` walks every manifest entry and loads every snapshot. This is acceptable for current test sizes but is not a credible large-repository storage strategy.

Corrupt/unreadable snapshot entries are currently skipped by query-style reads. This protects availability but weakens operational truthfulness because corruption can become invisible.

0.10 should establish a storage abstraction that separates:

- logical snapshot identity;
- physical storage;
- manifest/index;
- lifecycle state;
- corruption/repair state;
- resource accounting.

## Operational runtime finding

`startServer()` currently constructs Git, stores, caches, indexers, configuration and orchestration closures itself. This works but makes the HTTP server a de facto composition root and increases future surface-drift risk.

0.10 should introduce an explicit application runtime/composition boundary that can be reused by CLI, HTTP, MCP and GUI adapters.

## Observability finding

0.9.5 introduced useful structured diagnostics: operation ID, duration, cache state, graph counts, parser/resolver and uncertainty.

The next level is not more log fields. It is an operational model:

- health state;
- active operation state;
- progress stages;
- operation history;
- failure classification;
- resource usage;
- diagnostic bundle/export.

## Security finding

Security gates are mature for current stable paths: input validation, credential redaction, bounded HTTP bodies, approval-gated execution and safe diagnostics are established.

No broad security rewrite is justified. 0.10 should instead add sensitive configuration handling and operational audit evidence.

## Scale finding

Current performance evidence demonstrates excellent batched Git reads and reasonable 30/120/300-file semantic workloads. It does not yet establish behavior for repositories with thousands of commits, hundreds/thousands of branches, large snapshot stores or concurrent maintenance/query workloads.

0.10 scale work must be evidence-driven and resource-budget based.

## Final 0.10 architecture map

### 0.10-A — Configuration Lifecycle Platform

- migrations;
- sensitive-value boundary;
- effective-value explainability;
- configuration audit/version history;
- reload semantics.

### 0.10-B — History + Storage Lifecycle Platform

- reachability;
- branch lifecycle;
- retention planner;
- protected evidence;
- snapshot quotas;
- compaction;
- cleanup preview/apply;
- corruption reporting and repair metadata.

### 0.10-C — Application Runtime / Composition Platform

- shared composition root;
- capability registry where useful;
- common repository runtime;
- eliminate adapter-specific orchestration duplication.

### 0.10-D — Operational Observability Platform

- health;
- progress;
- operation history;
- failure taxonomy;
- resource diagnostics;
- diagnostic bundle.

### 0.10-E — Recovery Platform

- interrupted operation recovery;
- backup/restore of GCTG-owned state;
- consistency check;
- repair/rehydration;
- safe maintenance execution.

### 0.10-F — Scale and Resource Platform

- storage accounting;
- worker/memory budgets;
- large-history benchmarks;
- large-snapshot benchmarks;
- concurrent workload evidence;
- adaptive/deferred indexing.

## 0.10 sequencing decision

1. 0.10.0 — runtime/composition + storage foundations
2. 0.10.1 — configuration lifecycle + history lifecycle
3. 0.10.2 — observability + recovery
4. 0.10.3 — scale/resource hardening
5. 0.10.4 — discovered gaps and architecture readiness audit
6. 1.0.0 RC

This replaces the provisional milestone numbering. It is now evidence-backed by the 0.9 re-audit.

## 1.0 readiness rule

1.0 may begin only when 0.10 readiness audit shows no known P0/P1 gap on stable product paths, storage lifecycle is explainable/recoverable, runtime composition is shared, and scale evidence is documented.

## Governance

No 0.10 implementation is implied by this audit alone. The finalized roadmap is the planning artifact; each 0.10 milestone must still follow No Surface Without Gate and publish complete documentation/change evidence.
