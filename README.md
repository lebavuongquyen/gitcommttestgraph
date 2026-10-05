# Git Commit Test Graph

Deterministic semantic Git repository graph and change-impact engine for TypeScript and JavaScript repositories.

## Principles

- Historical truth comes from `git show <commit>:path`.
- Graph identity is deterministic and commit-aware.
- TypeScript Compiler API is used for semantic analysis.
- Package and workspace boundaries are explicit.
- Test projects, files and cases are first-class graph nodes.
- Configuration, fixture and schema artifacts are modeled separately.
- AI is optional and outside the core graph engine.
- Static test-gap analysis identifies symbols without direct or dependency-based test evidence; it is not runtime code coverage.
- Test execution is opt-in and uses structured process arguments without a shell.
- Semantic incremental indexing reanalyzes changed files plus reverse semantic dependents and reuses unaffected symbol subgraphs.

## CLI

```text
gctg status
gctg commits [limit]
gctg index [commit]
gctg graph [commit] [nodeType]
gctg diff <fromCommit> <toCommit>
gctg impact <commit> <nodeId> [nodeId...]
gctg tests [commit]
gctg test-gaps [commit] [--package <name-or-id>]
gctg run <executable> [args...]
gctg serve [port]
```

## Supported source

TypeScript, TSX, JavaScript, JSX, MJS and CJS.

Semantic relationships include imports, exports, calls, inheritance, implementation and workspace package dependencies when deterministically resolvable.

## Test adapters

Vitest, Jest, Node test, Playwright and generic package scripts.

## Persistence

Snapshots are stored under `.gctg/graph`. Semantic artifacts are content-addressed under `.gctg/cache/semantic` using source-content hashes plus analyzer and resolution fingerprints, allowing identical source graphs to be reused across different commits. Snapshot reuse is exact for the repository, commit, analyzer version and configuration fingerprint. Semantic incremental indexing uses the parent graph as a dependency index, analyzes only impacted source paths, reuses unaffected semantic nodes and edges, and is verified against a clean full-index graph in the test suite. CLI indexing uses an atomic repository lock with timeout and stale-lock recovery so concurrent indexers cannot corrupt the same repository index.

## HTTP API

`gctg serve` exposes local JSON endpoints for status, commits, graph, tests, diff and impact.

## Development

```text
npm install
npm run typecheck
npm run build
npm test
```

Node.js 20 or newer is required.
