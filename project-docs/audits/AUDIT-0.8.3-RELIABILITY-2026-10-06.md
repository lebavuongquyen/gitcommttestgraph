# 0.8.3 Reliability Hardening Audit

Date: 2026-10-06
Repository: git-commit-test-graph
Baseline: v0.8.2

## Objective

Attack the reliability boundary of indexing, persistence, Git history handling, and GitHub pull-request metadata.

Scenarios reviewed:

- interrupted indexing and partial persistence;
- stale lock recovery;
- concurrent writers;
- corrupt snapshots;
- missing Git objects;
- detached HEAD;
- shallow history;
- deleted branch;
- force-pushed pull-request heads;
- GitHub API/network failure;
- pagination boundaries.

## Findings

### R-001 — Stale-lock ownership race

Severity: P1
Status: FIXED

A stale lock could be removed and replaced by another writer while the original writer still held its release callback. The original callback could then delete the replacement lock.

Fix:

- every lock acquisition receives an owner UUID;
- release verifies ownership before deleting;
- stale takeover uses atomic rename to a unique stale path before deletion;
- takeover cannot remove a newly-created replacement lock.

Regression:

- `tests/unit/persistence-hardening.test.mjs`

### R-002 — Manifest concurrent-update race

Severity: P1
Status: FIXED

Graph snapshots were written atomically, but manifest updates from independent store instances could perform read-modify-write concurrently and lose one manifest entry.

Fix:

- manifest updates are serialized through the existing atomic ownership-aware index lock;
- manifest cache is invalidated before each locked read-modify-write.

Regression:

- `tests/unit/persistence-hardening.test.mjs`

### R-003 — GitHub pagination exact-boundary failure

Severity: P1
Status: FIXED

The review paginator rejected exactly 10,000 valid records because the previous implementation stopped after page 100 and treated the safety boundary as an error.

Fix:

- allow a boundary probe page;
- accept exactly 10,000 records when the following page is empty;
- reject data beyond the safety limit;
- reject malformed non-array pagination responses.

Regression:

- `tests/unit/pull-request.test.mjs`

### R-004 — GitHub transport and JSON failures lacked stable error classification

Severity: P1
Status: FIXED

Network failures and malformed JSON escaped as generic runtime errors, making the public failure surface less deterministic.

Fix:

- normalize transport, HTTP, and JSON failures to `GitOperationError`;
- preserve the original error as the cause where available.

Regression:

- `tests/unit/pull-request.test.mjs`

### R-005 — Check-run pagination could silently truncate at page 100

Severity: P1
Status: FIXED

The check-run loop stopped at page 100 without distinguishing a legitimate boundary from additional data.

Fix:

- boundary probe through page 101;
- explicit invalid-response validation;
- explicit safety-limit failure.

Regression:

- `tests/unit/pull-request.test.mjs`

### R-006 — Missing historical Git objects

Severity: P1
Status: VERIFIED

Historical reads already fail through the typed Git operation error path rather than inventing content.

Regression:

- `tests/unit/git.test.mjs`

### R-007 — Detached HEAD

Severity: P1
Status: VERIFIED

The Git adapter reports an empty current branch rather than inventing a branch name. Branch analysis rejects a branch operation without a branch head.

Regression:

- `tests/unit/git.test.mjs`

### R-008 — Shallow-history ancestry

Severity: P1
Status: ACCEPTED EXPLICIT FAILURE

The current Git adapter does not fabricate ancestry when required history is unavailable. Merge-base failures propagate as Git operation failures.

Future hardening may add explicit repository-history diagnostics, but no false historical result is permitted.

## Reliability Gate

The permanent gate introduced by this release is:

`npm run reliability:gate`

It executes:

- build;
- persistence hardening tests;
- Git adapter reliability tests;
- GitHub pull-request reliability tests;
- incremental-index tests;
- test-result persistence tests.

Release checks for versions >= 0.8.3 execute this gate from a clean clone.

## Design Rule

Reliability failures must be converted into deterministic behavior and permanent regression tests.

A failure that can silently produce incorrect historical evidence is treated as more severe than a failure that stops the operation explicitly.
