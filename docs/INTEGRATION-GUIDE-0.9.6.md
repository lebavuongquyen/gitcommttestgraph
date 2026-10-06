# Integration Guide — 0.9.6 Preview

## Generic CI

Use exit code plus an artifact:

`gctg ci COMMIT HEAD --format json > gctg-ci.json`

For SARIF:

`gctg ci BRANCH main HEAD --format sarif > gctg.sarif`

Exit codes: 0 = PASS, 1 = FAIL, 2 = UNKNOWN.

## HTTP

Start `gctg serve 3717`, then consume `/api/change-intelligence`, `/api/ci`, `/api/diagnostics`, `/api/monorepo` and `/api/historical-intelligence`.

## MCP

Use the MCP server when an agent needs structured repository intelligence. Prefer read-only tools; execution tools require explicit approval.

## SDK preview

Import only from `git-commit-test-graph/api`. Do not import `dist/*`, adapters, infrastructure or internal application modules.
