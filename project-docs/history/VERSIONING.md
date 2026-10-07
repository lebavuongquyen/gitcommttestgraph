# Versioning Policy

`git-commit-test-graph` follows Semantic Versioning with a feature-completion release policy.

## Rules

- The patch component (`0.5.x`) is for bug fixes, regressions, maintenance, performance improvements, UX refinement and improvements to an existing capability that do not constitute a new completed product capability.
- The minor component (`0.x.0`) is reserved for a new completed feature capability with its implementation, tests, GUI representation when applicable, MCP exposure when applicable, documentation and acceptance criteria complete.
- The major component (`x.0.0`) is reserved for breaking public API, package, protocol or architectural changes that require a major-version boundary.
- A feature may have many commits and remain on the current version while it is being implemented.
- A feature in progress must not trigger a version bump merely to mark development progress.
- A release is published only after the feature or maintenance change represented by that version is complete and the release gate passes.
- Patch releases may be published independently after the corresponding fix or improvement is complete.
- Minor releases must not be used for partial slices of a larger feature initiative.

## Examples

```text
0.5.0  Visual Test Execution Workflow
0.5.1  Fix execution status regression
0.5.2  Improve execution-panel UX
0.5.3  Improve MCP execution feedback
0.6.0  Branch Intelligence (complete feature)
0.6.1  Branch Intelligence bug fix
0.7.0  Pull Request Intelligence (complete feature)
```

## Feature Release Lifecycle

```text
PLANNED
  -> IN_PROGRESS
  -> IMPLEMENTED
  -> GUI_COMPLETE
  -> MCP_COMPLETE
  -> TESTED
  -> DOCUMENTED
  -> ACCEPTED
  -> RELEASED
```

Only `ACCEPTED` may become `RELEASED`.

## Release Gate

Before publishing a new version:

1. The release document exists at `docs/releases/<version>.md`.
2. The release document states that the represented feature or maintenance change is complete.
3. Acceptance criteria are complete.
4. Package and source versions agree.
5. The changelog contains the version.
6. The full typecheck, build and test suite passes.
7. `git diff --check` passes.
8. The working tree and release tag are verified before publishing.

The automated documentation gate is `npm run release:check`.
