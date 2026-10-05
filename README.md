# Git Commit Test Graph

Deterministic semantic Git repository graph, test graph, change-impact engine and GUI-first software-engineering workbench.

## Principles

- Historical truth comes from `git show <commit>:path`.
- Graph identity is deterministic and commit-aware.
- TypeScript Compiler API is used for semantic analysis.
- Package and workspace boundaries are explicit.
- Test projects, files and cases are first-class graph nodes.
- Configuration, fixture and schema artifacts are modeled separately.
- AI is optional and outside the core graph engine.
- Static test-gap analysis is not runtime code coverage.
- Test-impact analysis maps changed symbols to impacted tests and runnable commands.
- Workflow and execution-plan projections remain deterministic.
- GUI is an adapter over application/query capabilities; it does not own domain logic.
- MCP is an adapter over the same application capabilities; it does not own feature logic.

## CLI

```text
gctg status
gctg commits [limit]
gctg branches
gctg branch-review <base> [head]
gctg index [commit]
gctg graph [commit] [nodeType]
gctg diff <fromCommit> <toCommit>
gctg impact <commit> <nodeId> [nodeId...]
gctg tests [commit]
gctg test-gaps [commit] [--package <name-or-id>]
gctg test-impact [commit] [--package <name-or-id>]
gctg workflow [commit]
gctg execution-plan [commit] [--format json|yaml|md|mermaid]
gctg run-plan [commit]
gctg execution-feedback [commit]
gctg run <executable> [args...]
gctg serve [port]
```

## GUI

Run `gctg serve [port]` and open the local address printed by the CLI.

The GUI provides:
- Repository status and recent commit explorer.
- Historical commit selection.
- Focused Git → Code → Test graph.
- Changed versus affected symbol visualization.
- Node inspector with incoming/outgoing edges.
- Static test-impact visibility.
- Visual execution-plan panel showing impacted test commands and dependency order.
- Explicit "Run impacted tests" action with persisted runtime feedback.
- Per-step execution status and last-run result visibility.
- Branch base/head selectors and Branch Intelligence review cockpit.
- Branch merge-base, commit range, changed-symbol, removed-symbol, affected-symbol and review-risk visibility.
- Branch commit-level evidence and uncertainty visibility.
- Query endpoints for test gaps, execution plans and runtime feedback.

The graph canvas intentionally shows the change-impact neighborhood instead of every node in a large repository. This keeps the UI useful for repositories with thousands of graph nodes.

The execution panel uses the same deterministic execution-plan and runtime-feedback capabilities exposed by MCP as execution_plan, run_execution_plan and execution_feedback. Branch review uses the same BranchChangeSetService and BranchReviewService exposed through MCP as branches and branch_review. GUI and MCP therefore share application/domain behavior rather than duplicating it.

## Architecture

```
Git Repository
      |
      +--> Branch ChangeSet / Review
      |
      v
Semantic Graph
      |
      +--> Impact / Test Analysis
      |
      +--> GUI HTTP Query Boundary
      |
      +--> MCP Adapter
      |
      +--> CLI Adapter
```

Feature development order is:

```
Feature
  ↓
Application / Domain implementation
  ↓
Tests + acceptance
  ↓
GUI representation
  ↓
MCP exposure
  ↓
CLI / automation when needed
  ↓
Complete feature release
```

## MCP Agent Server

The package exposes an MCP server for software-engineering agents. MCP is intentionally kept as an adapter boundary. The agent task protocol provides explicit policy, evidence, uncertainty, execution approval and runtime decision semantics.

For local MCP hosts, configure the command: `gctg-mcp`.

The MCP server uses stdio. Protocol traffic is written to stdout; diagnostics are written to stderr.

## Persistence

Snapshots are stored under `.gctg/graph`. Semantic artifacts are content-addressed under `.gctg/cache/semantic`. CLI and server indexing use an atomic repository lock.

## Development

```text
npm install
npm run typecheck
npm run build
npm test
npm run check
```

Node.js 20 or newer is required.

## Release discipline

Every publish must ship a complete feature or maintenance change, complete documentation and a changelog entry. Versioning follows `docs/VERSIONING.md`. The release gate is mandatory; a minor release must not represent a partial feature.
