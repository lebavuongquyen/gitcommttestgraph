# Preliminary Roadmap — 0.10.x Architecture Completion

Date: 2026-10-06
Repository: git-commit-test-graph
Status: PRELIMINARY / PROVISIONAL
Baseline intent: architecture completion before 1.0.0

## 1. Purpose

0.10.x is reserved as an architecture-completion and production-readiness phase between the 0.9.x production engineering work and the 1.0.0 stable product contract.

This document is intentionally provisional. It defines capability areas, not a frozen implementation plan.

After 0.9.x, a mandatory architecture re-audit will determine which areas are confirmed, merged, deferred, removed, or newly discovered.

## 2. Planning rule

The lifecycle is:

0.9.x implementation
  -> 0.9-to-0.10 architecture re-audit
  -> update this roadmap
  -> commit 0.10.x scope
  -> implement
  -> 0.10 architecture readiness audit
  -> 1.0.0 RC

No 0.10 feature is considered committed until supported by audit evidence.

## 3. Provisional capability map

### A. Configuration Platform

Establish configuration as a first-class platform subsystem.

Candidate capabilities:
- configuration domain model;
- schema and typed definitions;
- built-in defaults;
- global/repository/runtime sources;
- precedence and merge rules;
- validation;
- resolved configuration;
- configuration explainability;
- persistence;
- migration/versioning;
- sensitive-value handling;
- GUI management;
- CLI/HTTP/MCP parity;
- configuration tests and quality gates.

### B. History Lifecycle Platform

Manage large and long-lived repositories without sacrificing historical correctness.

Candidate capabilities:
- branch lifecycle tracking;
- reachability analysis;
- protected history;
- retention policy;
- deleted-branch grace periods;
- snapshot lifecycle;
- compaction;
- deterministic cleanup planning;
- preview/apply workflow;
- interruption-safe cleanup;
- recovery;
- lifecycle audit evidence.

Never mutate Git history as part of GCTG cleanup.

### C. Storage and Resource Management

Make resource consumption explicit and controllable.

Candidate capabilities:
- storage accounting;
- snapshot/index budgets;
- worker/concurrency budgets;
- memory/resource diagnostics;
- quotas;
- cleanup recommendations;
- capacity reporting;
- resource-aware scheduling.

### D. Observability and Diagnostics

Make system behavior explainable in production.

Candidate capabilities:
- health model;
- operation history;
- structured diagnostics;
- performance metrics;
- indexing progress;
- failure classification;
- diagnostic bundles/reports;
- GUI health view;
- CLI/API/MCP diagnostic access.

### E. Security and Governance

Harden configuration, integrations, and operational boundaries.

Candidate capabilities:
- secret isolation;
- sensitive configuration policy;
- permission boundaries;
- Git/GitHub credential handling;
- audit events;
- safe logging;
- security configuration;
- security quality gate.

### F. Operations and Recovery

Support long-running product operation safely.

Candidate capabilities:
- background jobs;
- maintenance operations;
- migration framework;
- backup/restore of GCTG-owned state;
- interrupted-operation recovery;
- consistency checks;
- repair/rehydration;
- operational GUI.

### G. Scale and Production Readiness

Validate architecture against realistic repository sizes and failure modes.

Candidate scenarios:
- thousands/hundreds of thousands of commits;
- hundreds/thousands of branches;
- long-lived deleted branches;
- large snapshot stores;
- concurrent indexing/query/maintenance;
- force-push and branch recreation;
- interrupted cleanup;
- large GitHub histories;
- cold-start and warm-cache behavior.

The scale targets must be evidence-driven after the 0.9.x audit.

## 4. Cross-cutting architecture requirements

Every confirmed 0.10 capability follows the project quality lifecycle:

Domain
  -> Application
  -> Tests
  -> GUI
  -> MCP
  -> CLI/HTTP where applicable
  -> Documentation
  -> Quality gate
  -> Changelog
  -> Release evidence

No Surface Without Gate remains mandatory.

## 5. Provisional milestone shape

The exact milestone numbers are intentionally not frozen.

A likely shape is:

- 0.10.0 — architecture/platform foundations;
- 0.10.1 — configuration and operational hardening;
- 0.10.2 — lifecycle/storage hardening;
- 0.10.3 — observability/security hardening;
- 0.10.4+ — scale, recovery, and discovered gaps.

These numbers are placeholders and must be reconsidered after the 0.9.x re-audit.

## 6. Required 0.9-to-0.10 re-audit

Before committing the final 0.10 roadmap, audit:

- architecture boundaries;
- configuration sprawl;
- persistence/state ownership;
- API/CLI/MCP/GUI parity;
- adapter boundaries;
- indexing lifecycle;
- snapshot lifecycle;
- resource consumption;
- security boundaries;
- observability;
- operational recovery;
- scalability evidence;
- test coverage and release gates;
- technical debt introduced during 0.9.x.

Each finding must be classified:

- CONFIRMED — keep in 0.10;
- MERGED — combine with another capability;
- DEFERRED — move to post-1.0;
- REMOVED — no longer needed;
- NEW — newly discovered architectural requirement.

## 7. 1.0 readiness relationship

0.10.x is complete only when the final architecture audit demonstrates that the stable 1.0 contract can be frozen without known P0/P1 architectural gaps on stable paths.

1.0 remains the stable public-contract release, not the place where missing platform foundations are first introduced.

## 8. Governance

This roadmap must not silently replace the master 0.8-to-1.0 roadmap.

It is a provisional extension that will be reconciled after 0.9.x.

Historical release tags remain immutable.

## 9. Initial execution order

Current status:

- Roadmap created: COMPLETE.
- Configuration architecture audit: COMPLETE.
- Configuration Foundation first vertical slice: COMPLETE.
- History Lifecycle implementation: NOT STARTED; blocked intentionally until configuration policy ownership is established.
- 0.9-to-0.10 re-audit: REQUIRED after 0.9.x.

The first work after this roadmap is created:

1. Configuration architecture audit.
2. Configuration Foundation design.
3. Configuration Foundation implementation.
4. First GUI/CLI/HTTP/MCP vertical slice.
5. Configuration quality gate.
6. Re-evaluate History Lifecycle against the new configuration subsystem.
7. Continue remaining 0.9.x roadmap work.
8. Perform mandatory 0.9-to-0.10 re-audit before finalizing 0.10 scope.
