# Roadmap — 0.10.x Architecture Completion

Date: 2026-10-06
Repository: git-commit-test-graph
Status: FINALIZED AFTER 0.9 RE-AUDIT
Baseline: v0.9.7

## 1. Purpose

0.10.x is the architecture-completion and production-readiness phase between the frozen 0.9 public engineering line and 1.0.0 stable.

This roadmap replaces the provisional 0.10 roadmap after the mandatory 0.9 → 0.10 architecture re-audit.

Audit evidence: `docs/AUDIT-0.9-TO-0.10-ARCHITECTURE-2026-10-06.md`.

## 2. Non-negotiable workflow

Every capability follows:

Domain → Application → Tests → GUI → MCP → CLI/HTTP where applicable → Public API where applicable → Documentation → Quality Gate → Changelog → Release Evidence

No Surface Without Gate remains mandatory.

No 0.10 feature is complete because its core service works. All applicable surfaces must be implemented and gated.

## 3. Architecture targets

### 0.10.0 — Runtime and Storage Foundations

Objective: establish the architecture required for the rest of 0.10.

Tasks:

- introduce a shared application runtime/composition root;
- remove HTTP-owned orchestration duplication;
- define reusable repository runtime dependencies for CLI/HTTP/MCP/GUI;
- separate logical snapshot identity from physical storage;
- establish storage index/manifest abstraction;
- define corruption state and repair metadata;
- add storage accounting primitives;
- preserve backward compatibility with existing `.gctg` state.

Acceptance:

- CLI, HTTP and MCP use the shared runtime;
- storage operations remain deterministic;
- existing snapshots remain readable;
- dedicated runtime/storage surface gates pass.

### 0.10.1 — Configuration and History Lifecycle

Objective: make repository lifecycle policies executable and explainable.

Configuration:

- schema migration/versioning;
- sensitive-value boundary;
- effective-value explainability;
- configuration audit/version history;
- reload semantics.

History/storage lifecycle:

- branch lifecycle tracker;
- reachability analyzer;
- protected-history model;
- retention planner;
- deleted-branch grace period;
- snapshot quotas;
- deterministic compaction planning;
- cleanup preview/apply;
- never mutate Git history;
- interruption-safe cleanup.

Acceptance:

- preview is deterministic;
- protected evidence is never selected for deletion;
- absence of proof means no deletion;
- GUI/CLI/HTTP/MCP expose the same policy/result semantics;
- lifecycle gate passes.

### 0.10.2 — Observability and Recovery

Objective: operate GCTG safely as a long-running product.

Observability:

- health model;
- active operation state;
- progress stages;
- operation history;
- failure taxonomy;
- resource diagnostics;
- diagnostic bundle/export.

Recovery:

- interrupted-operation recovery;
- GCTG-owned state backup/restore;
- consistency checker;
- repair/rehydration;
- safe maintenance operations;
- audit evidence.

Acceptance:

- simulated interruption is recoverable;
- corruption is detectable and explainable;
- recovery does not mutate Git history;
- all applicable surfaces are gated.

### 0.10.3 — Scale and Resource Hardening

Objective: prove behavior beyond the current synthetic workload range.

Evidence scenarios:

- thousands of commits;
- hundreds/thousands of branches;
- large snapshot stores;
- deleted-branch retention populations;
- concurrent index/query/maintenance operations;
- force-push and branch recreation;
- large GitHub histories;
- cold/warm cache;
- memory and disk budgets.

Capabilities:

- storage accounting;
- worker/memory budgets;
- adaptive/deferred indexing;
- resource-aware scheduling;
- capacity reporting;
- scale regression gate.

Acceptance is evidence-based, not a fixed arbitrary speed target.

### 0.10.4 — Architecture Readiness and Discovered Gaps

Objective: close gaps discovered during implementation.

Required actions:

- rerun architecture self-attack;
- verify all surface parity;
- verify persistence compatibility;
- verify security boundaries;
- verify resource budgets;
- classify remaining debt as P0/P1/P2;
- resolve all P0/P1 stable-path gaps.

Then produce:

`docs/AUDIT-0.10-ARCHITECTURE-READINESS-YYYY-MM-DD.md`

## 4. Explicitly deferred

The following are not 0.10 requirements unless implementation evidence changes the decision:

- broad security redesign;
- new public API major version;
- AI/LLM-dependent correctness;
- hosted cloud control plane;
- arbitrary CI-provider-specific workflow generation;
- changing Git history;
- replacing the deterministic graph engine with probabilistic inference.

## 5. Architecture principles

- deterministic evidence before inference;
- fail closed when history/evidence is unavailable;
- shared application capability before surface exposure;
- infrastructure never leaks into the public SDK;
- GCTG cleanup never mutates Git history;
- preview before destructive maintenance;
- protected evidence wins over retention pressure;
- resource limits are explicit;
- interruption must be recoverable;
- every release carries its evidence.

## 6. Release sequence

0.9.7 COMPLETE
→ 0.10.0 Runtime/Storage Foundations
→ 0.10.1 Configuration/History Lifecycle
→ 0.10.2 Observability/Recovery
→ 0.10.3 Scale/Resource Hardening
→ 0.10.4 Architecture Readiness
→ 1.0.0 RC
→ 1.0.0 Stable
→ Product Extraction / New Product 1.x

## 7. 1.0 gate

1.0.0 RC is blocked until:

- no known P0/P1 architecture gaps remain on stable paths;
- runtime composition is shared;
- storage lifecycle is explainable and recoverable;
- configuration lifecycle is versioned;
- retention/cleanup is deterministic and safe;
- operational recovery is proven;
- scale/resource evidence is documented;
- public API compatibility remains frozen;
- GUI/CLI/HTTP/MCP parity gates pass;
- release gate passes from a clean clone.

## 8. Historical governance

v0.9.x tags remain immutable. This roadmap does not alter released behavior. All future changes are additive until a deliberate 1.0 compatibility decision is made.
