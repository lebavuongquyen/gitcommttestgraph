# SDK Preview — 0.9.6

Status: PREVIEW — not a 1.0 compatibility guarantee.

## Supported import

`git-commit-test-graph/api`

## Supported contract families

Graph Snapshot, Change Intelligence, Impact, Test Impact, Execution Plan, Historical Intelligence, CI Analysis, Diagnostics, Evidence and Public Error.

## Compatibility policy

The public API contract version remains 1.0.0. The SDK preview is additive and fail-closed on incompatible schema versions.

Consumers should pin the package version during the preview period and avoid internal module paths.

## 1.0 transition

The SDK preview becomes eligible for stable support only after the 0.9.7 compatibility freeze and the mandatory 0.9 → 0.10 architecture re-audit.
