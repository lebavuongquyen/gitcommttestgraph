# Changelog

All notable changes to `git-commit-test-graph` are documented here.

## [0.4.0] - 2026-10-05

### Added
- GUI-first local application served by `gctg serve`.
- Repository status and recent commit explorer.
- Commit selection with historical indexing.
- Focused graph canvas for changed symbols, affected symbols and impacted tests.
- Node inspector with incoming/outgoing graph evidence.
- Static test-impact panel.
- HTTP endpoints for GUI overview, focused graph, node inspection, test gaps, test impact, execution plan and execution feedback.
- Release documentation and publish checklist.

### Changed
- Replaced the previous minimal inline graph page with a usable visual workbench.
- GUI consumes application-level HTTP query capabilities instead of accessing persistence directly.
- Kept MCP as an adapter boundary; GUI feature logic is not implemented inside MCP.
- Server indexing now uses the same incremental indexing and semantic cache infrastructure as the CLI.

### Quality
- GUI foundation is deterministic and project-agnostic.
- The visual graph intentionally focuses on the change-impact neighborhood instead of rendering thousands of repository nodes at once.
- No source repository is modified by the GUI.

## [0.3.8] - 2026-10-04

See Git history for the previous release.
