# Roadmap 0.7.1 — Pull Request Intelligence Hardening

## Goal

Make the 0.7.0 Pull Request Intelligence capability correct and trustworthy for real GitHub pull requests, especially fork PRs, stale approvals, large review histories and deleted-symbol analysis.

## Mandatory fixes

| ID | Fix | Status |
|---|---|---|
| H01 | Immutable base/head SHA analysis | DONE |
| H02 | Fork head repository support | DONE |
| H03 | Latest effective review state per reviewer | DONE |
| H04 | Review commit SHA freshness | DONE |
| H05 | Review/check pagination | DONE |
| H06 | Removed-symbol downstream impact from base graph | DONE |
| H07 | Conservative merge-readiness semantics | DONE |
| H08 | GitHub input validation | DONE |
| H09 | Private fork Git fetch authentication boundary | DONE |
| H10 | Regression coverage | DONE |
| H11 | Release documentation/version/gate | DONE |

## Invariants

1. Semantic PR analysis must use immutable commit identities.
2. A fork PR must never silently fall back to a same-named local branch.
3. A historical approval must not be treated as approval of a newer head.
4. A reviewer’s older state must not override their latest state.
5. Removed symbols must be analyzed against the graph where they still exist.
6. Missing GitHub branch-protection information must be represented as uncertainty.
7. GitHub pagination must be bounded.
8. GUI, MCP and HTTP must share the same application analysis path.

## Validation

- 56/56 tests pass.
- Typecheck passes.
- Build passes.
- Release check passes.
- Diff check passes.

## Exit criteria

0.7.1 is complete when the release commit, tag and documentation are published.

## Next

0.8.0 Unified Change Intelligence will unify commit, branch and pull-request change sources on the hardened analysis foundation.
