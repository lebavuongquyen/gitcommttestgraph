# git-commit-test-graph — Target Architecture v2

Status: Proposed architecture baseline
Date: 2026-10-05
Repository: lebavuongquyen/gitcommttestgraph

## 1. Purpose

git-commit-test-graph (GCTG) is a standalone, project-agnostic npm package for building a deterministic, versioned semantic graph of a Git repository and using that graph to answer code-dependency, change-impact, and test-impact questions.

The package is the product.

vangioi.com is a Golden Acceptance / real-world consumer project used to validate correctness, performance, and usefulness. It must never become a package implementation dependency or a source of repository-specific rules.

Primary principle:

> Graph-first, deterministic, project-agnostic, AI-optional.

The core graph and impact engine must work without an LLM or external AI service. AI is an optional consumer of graph facts, evidence, history, and impact results.

## 2. Problem Definition

The current prototype is changed-file-centric and relies heavily on regular expressions and current-working-tree scans. This creates false positives and historical inaccuracies.

Known prototype failures include:

- historical commits may be analyzed against current source code;
- dependency resolution is based on filenames/import text rather than a semantic resolver;
- aliases, barrels, workspace packages, package exports, and extension substitution are not resolved reliably;
- tests are discovered primarily by filenames and text similarity;
- test execution, test discovery, source parsing, output parsing, and result state are coupled;
- framework detection is simplistic;
- custom script-based tests are poorly modeled;
- repository-specific ignored directories are hardcoded;
- configuration changes are classified too coarsely;
- no persistent graph/index exists;
- each graph request can rescan the repository;
- test cases are treated as output details rather than graph entities;
- there is no durable evidence model explaining why an edge or impact decision exists.

Architecture v2 replaces these heuristics with explicit domain models, adapters, deterministic analysis, versioned snapshots, evidence, and incremental indexing.

## 3. Scope

GCTG v2 includes:

1. Git repository discovery and history.
2. Repository/package/workspace discovery.
3. Semantic source analysis.
4. Dependency and symbol graph construction.
5. Test-project and test-case discovery.
6. Deterministic change-to-impact analysis.
7. Versioned graph snapshots.
8. Commit-to-commit graph diffs.
9. Test selection and execution integration.
10. Evidence and confidence for graph relationships.
11. CLI and programmatic APIs.
12. Local visualization/API support.
13. Optional AI consumption APIs.

## 4. Non-Goals

GCTG is not:

- an AI coding agent;
- an LLM-generated metadata authoring system;
- a replacement for Git;
- a replacement for TypeScript/Javascript compilers;
- a universal test runner;
- a replacement for every language's native build system;
- a repository-specific architecture rule engine;
- a mandatory hosted service;
- a requirement to manually maintain YAML/JSON graph metadata.

Static analysis must create the graph automatically. Configuration is allowed to refine behavior, not to manually describe every relationship.

## 5. High-Level Architecture

```text
                         Git Repository
                               |
                               v
                      Repository Discovery
                               |
             +-----------------+-----------------+
             |                                   |
             v                                   v
      Git History Adapter                 Project Discovery
             |                                   |
             v                                   v
      Commit / Diff Data              Packages / Config / Tests
             |                                   |
             +-----------------+-----------------+
                               |
                               v
                       Semantic Indexer
                               |
              +----------------+----------------+
              |                |                |
              v                v                v
          Symbols         Dependencies        Tests
              |                |                |
              +----------------+----------------+
                               |
                               v
                         Code Graph
                               |
                 +-------------+-------------+
                 |                           |
                 v                           v
            Graph Diff                 Impact Engine
                                             |
                              +--------------+--------------+
                              |              |              |
                              v              v              v
                       Dependency       Test Impact     Blast Radius
                       Projection       Projection
                              |              |
                              +------+-------+
                                     |
                                     v
                               Evidence Model
                                     |
                    +----------------+----------------+
                    |                                 |
                    v                                 v
               Public API                         Visual UI
                    |
                    v
                AI Consumer
```

## 6. Core Design Rules

### 6.1 Graph is the source of truth

The package should answer impact questions from an indexed semantic graph rather than repeatedly scanning files.

### 6.2 Git state is immutable

A graph snapshot for commit X must describe the repository content at commit X.

Never analyze an old commit using the current working tree.

### 6.3 Determinism first

The same repository state, analyzer version, and configuration should produce the same graph.

### 6.4 Evidence over guesses

Every non-trivial relationship should retain evidence sufficient to explain how it was discovered.

### 6.5 Confidence is explicit

An uncertain relationship must be marked uncertain rather than silently presented as fact.

### 6.6 Adapters isolate ecosystem differences

Language, package-manager, test-framework, and repository conventions belong behind adapters.

### 6.7 Incremental by default

A commit should update only affected graph artifacts where possible.

### 6.8 AI is optional

No core graph operation may require an LLM.

## 7. Package Boundary

The standalone repository should evolve toward:

```text
gitcommttestgraph/
├── src/
│   ├── domain/
│   │   ├── graph/
│   │   ├── git/
│   │   ├── repository/
│   │   ├── package/
│   │   ├── symbol/
│   │   ├── test/
│   │   ├── impact/
│   │   └── evidence/
│   ├── application/
│   │   ├── indexing/
│   │   ├── analysis/
│   │   ├── impact/
│   │   ├── tests/
│   │   └── queries/
│   ├── adapters/
│   │   ├── git/
│   │   ├── languages/
│   │   │   ├── typescript/
│   │   │   └── javascript/
│   │   ├── package-managers/
│   │   │   ├── pnpm/
│   │   │   ├── npm/
│   │   │   ├── yarn/
│   │   │   └── bun/
│   │   └── test-frameworks/
│   │       ├── vitest/
│   │       ├── jest/
│   │       ├── node-test/
│   │       ├── playwright/
│   │       └── generic-script/
│   ├── infrastructure/
│   │   ├── filesystem/
│   │   ├── process/
│   │   ├── persistence/
│   │   └── logging/
│   ├── api/
│   ├── cli/
│   └── index.ts
├── bin/
├── web/
├── tests/
│   ├── unit/
│   ├── integration/
│   ├── fixtures/
│   ├── golden/
│   └── acceptance/
├── docs/
├── package.json
├── tsconfig.json
└── README.md
```

The exact folder names may evolve, but dependency direction must remain:

```text
domain
  ^
application
  ^
adapters / infrastructure
  ^
api / cli / web
```

Domain code must not import HTTP, CLI, filesystem, shell, or concrete test-framework implementations.

## 8. Domain Model

### 8.1 Repository

```ts
Repository {
  id
  root
  vcs: "git"
  defaultBranch?
  analyzerVersion
  configurationFingerprint
}
```

### 8.2 Commit

```ts
Commit {
  hash
  parents[]
  author
  committer
  timestamp
  message
}
```

### 8.3 Package

A package/workspace is a first-class node.

```ts
Package {
  id
  name
  rootPath
  manager
  manifestPath
  packageType
}
```

This is required for monorepos such as pnpm workspaces.

### 8.4 File

```ts
File {
  id
  path
  packageId?
  kind
  contentHash
  language?
  size
}
```

Supported semantic file kinds:

- SOURCE
- TEST
- CONFIG
- PACKAGE_METADATA
- WORKSPACE_CONFIG
- LANGUAGE_CONFIG
- BUILD_CONFIG
- TEST_CONFIG
- RUNTIME_CONFIG
- SCHEMA
- FIXTURE
- RUNTIME_DATA
- GENERATED
- DOCUMENTATION
- ASSET
- UNKNOWN

Classification must be based on path, filename, package metadata, parser support, and repository configuration. Extension alone is insufficient.

### 8.5 Symbol

```ts
Symbol {
  id
  fileId
  kind
  name
  qualifiedName?
  exported
  startLine
  endLine
  signature?
}
```

Symbol kinds include function, method, class, interface, type, enum, variable, property, namespace, module, and other adapter-defined kinds.

### 8.6 Test Project

A repository can contain multiple independent test projects.

```ts
TestProject {
  id
  packageId?
  framework
  rootPath
  configurationFiles[]
  commandResolverId
}
```

### 8.7 Test File

```ts
TestFile {
  id
  fileId
  testProjectId
}
```

### 8.8 Test Case

Test cases are graph entities, not merely parsed runner output.

```ts
TestCase {
  id
  testFileId
  title
  qualifiedTitle?
  startLine
  endLine
  frameworkMetadata?
}
```

### 8.9 Fixture / Schema

Fixtures and schemas can be explicit nodes:

```text
TestCase --USES_FIXTURE--> Fixture
TestCase --USES_SCHEMA--> Schema
```

This allows fixture changes to affect the correct tests without treating every JSON file as globally relevant.

## 9. Graph Schema

### 9.1 Node types

Minimum node types:

- Repository
- Commit
- Package
- File
- Symbol
- TestProject
- TestFile
- TestCase
- Config
- Fixture
- Schema

Generated artifacts and assets may be added when meaningful.

### 9.2 Edge types

Minimum edge types:

- CONTAINS
- IMPORTS
- EXPORTS
- CALLS
- EXTENDS
- IMPLEMENTS
- DEPENDS_ON
- CONFIGURES
- TESTS
- USES_FIXTURE
- USES_SCHEMA
- GENERATES

### 9.3 Edge structure

```ts
GraphEdge {
  id
  source
  target
  type
  confidence
  evidence[]
  sourceCommit
}
```

Edges must not exist without a stable identity and provenance.

## 10. Evidence Model

Evidence is mandatory for relationships that influence impact.

```ts
Evidence {
  kind
  filePath?
  startLine?
  endLine?
  text?
  resolver?
  details?
}
```

Examples:

- an import declaration at line 12;
- TypeScript compiler resolution from an alias;
- a call expression from symbol A to symbol B;
- a package dependency declared in package.json;
- a test case importing a changed module;
- a fixture path referenced by a test.

Evidence enables explainable APIs such as:

```text
Why is test X affected?

Test X
 -> imports test helper Y
 -> helper Y imports module Z
 -> module Z calls changed symbol A
 -> A changed in commit C
```

## 11. Confidence Model

Confidence is not a substitute for correctness.

Recommended levels:

- EXACT
- HIGH
- MEDIUM
- LOW

Examples:

- TypeScript compiler/module-resolution result: EXACT/HIGH.
- Parsed static import: EXACT.
- Framework adapter declaration: HIGH.
- Dynamic import inferred from a constant: MEDIUM.
- Filename similarity: LOW and should not independently establish impact.

Low-confidence heuristics must never be silently promoted to exact graph facts.

## 12. Repository Discovery

Discovery should inspect:

- .git
- package.json
- lockfiles
- workspace configuration
- tsconfig/jsconfig
- build configuration
- test configuration
- source roots
- package boundaries
- generated directories
- ignore files
- repository-specific configuration

Ignored/generated directories should be derived from standard conventions and explicit configuration.

Do not hardcode directories such as vangioi-audit, edge-profile, .agents, or .gemini.

## 13. Git Adapter

The Git adapter owns all Git operations.

Required operations:

- repository validation;
- HEAD;
- commit metadata;
- parents;
- changed paths;
- rename/copy information;
- file content at a commit;
- tree listing at a commit;
- diff between commits;
- working-tree state as a separate explicit mode.

Historical analysis must use Git object content.

For commit C:

```text
source(C) = git show C:path/to/file
```

not:

```text
source(C) = current working tree
```

Working-tree analysis is a separate mode and must never silently substitute for historical analysis.

## 14. Language Adapter

A language adapter provides semantic parsing and resolution.

Initial priority:

1. TypeScript
2. JavaScript

The TypeScript adapter should use the TypeScript compiler API or an equivalent semantic parser rather than regular expressions for symbol and import relationships.

Required resolution support:

- relative imports;
- absolute imports;
- tsconfig paths;
- baseUrl;
- workspace packages;
- package.json exports;
- index/barrel modules;
- extension substitution;
- TS/TSX/JS/JSX/MJS/CJS where supported;
- type-only imports;
- re-exports;
- namespace imports;
- dynamic imports when statically resolvable.

## 15. Package Manager Adapters

Initial adapters:

- pnpm
- npm
- yarn
- bun

The package-manager adapter determines:

- workspace/package boundaries;
- dependency declarations;
- package scripts;
- command invocation;
- workspace filtering;
- lockfile relationships when useful.

The core must never assume `npx`.

For example, a pnpm workspace test command may require package filtering:

```text
pnpm --filter <package> <script>
```

The command is resolved by the adapter.

## 16. Test Adapter Architecture

Test execution is split into separate responsibilities.

```text
TestRegistry
      |
      v
FrameworkDetector
      |
      v
FrameworkAdapter
      |
      +--> Test discovery
      +--> Test-case extraction
      +--> Command resolution
      +--> Result parsing
```

Separate infrastructure components:

- TestRegistry
- TestProjectDetector
- FrameworkAdapter
- CommandResolver
- TestRunner
- ResultParser
- TestResultStore

The adapter contract should support:

```ts
interface TestFrameworkAdapter {
  detect(context): DetectionResult;
  discoverTests(context): TestFile[];
  extractCases(context, testFile): TestCase[];
  resolveCommand(context, request): TestCommand;
  parseResult(context, output): TestRunResult;
}
```

## 17. Custom Script Tests

Real projects frequently use tests implemented as scripts rather than Vitest/Jest.

Therefore generic-script is a first-class adapter.

It may use:

- package scripts;
- explicit test script naming;
- deterministic configuration;
- structured reporter output when available.

The system must not infer test impact solely from a filename such as `test-foo.mjs`.

Where no semantic relationship can be proven, the result should be marked uncertain and surfaced as such.

## 18. Test Graph

The Test Graph is a projection of the semantic graph.

It must not be:

```text
Changed File -> Test File -> Test Case
```

The preferred path is:

```text
Changed Symbol
    |
    v
Dependency Graph
    |
    v
Affected Symbols
    |
    v
Affected Packages
    |
    v
Test Projects
    |
    v
Test Files
    |
    v
Test Cases
```

Fixture/schema relationships are additional edges.

Input / Inspect / Assert is a presentation detail of a test case when evidence supports it. It is not the foundation of impact analysis.

## 19. Impact Engine

The impact engine consumes graph facts.

Example traversal:

```text
Changed Symbol
 -> CALLS / IMPORTS reverse traversal
 -> downstream symbols
 -> packages
 -> TESTS reverse traversal
 -> test cases
```

Impact categories:

- DIRECT
- DIRECT_DEPENDENCY
- DOWNSTREAM
- INTEGRATION
- CONFIG
- GLOBAL

Every impact result should include:

```ts
Impact {
  nodeId
  level
  confidence
  path[]
  evidence[]
}
```

The path explains why the node was selected.

## 20. Configuration Impact

Configuration changes require semantic rules.

Examples:

- package.json dependency change -> package dependency graph and potentially downstream packages;
- package script change -> affected test command/project;
- tsconfig path change -> module resolution graph;
- build config change -> build/test project impact;
- test config change -> test project impact;
- fixture JSON change -> tests that reference the fixture;
- documentation change -> normally no executable impact.

A generic extension-based rule such as "all JSON affects all tests" is forbidden.

## 21. Graph Snapshot and Versioning

Every analyzed Git commit has a graph snapshot.

```ts
GraphSnapshot {
  schemaVersion
  analyzerVersion
  repository
  commit
  configurationFingerprint
  nodes[]
  edges[]
  metadata
}
```

Requirements:

- exact commit association;
- deterministic serialization;
- schema versioning;
- analyzer version;
- configuration fingerprint;
- content hashes;
- snapshot integrity.

## 22. Incremental Indexing

A new commit should not trigger a complete repository reparse when avoidable.

Preferred process:

```text
Parent Snapshot
      |
      v
Changed Files
      |
      +--> parse changed files
      +--> remove deleted nodes
      +--> resolve changed relationships
      +--> update reverse relationships
      |
      v
New Snapshot
```

Unchanged artifacts may be reused by content hash.

The implementation should maintain a cache/index keyed by stable content and analyzer configuration.

## 23. Persistence

Persistence is an implementation detail behind an interface.

Possible initial implementation:

- local JSON/JSONL or SQLite-backed store;
- content-addressed parser artifacts;
- graph snapshot records.

The public domain must not depend directly on SQLite or JSON files.

Potential interface:

```ts
interface GraphStore {
  saveSnapshot(snapshot): Promise<void>;
  getSnapshot(commit): Promise<GraphSnapshot | null>;
  getNode(id): Promise<GraphNode | null>;
  query(request): Promise<GraphQueryResult>;
  saveArtifacts(artifacts): Promise<void>;
}
```

## 24. Graph Diff

Graph diff compares two exact snapshots.

```ts
GraphDiff {
  fromCommit
  toCommit
  addedNodes[]
  removedNodes[]
  changedNodes[]
  addedEdges[]
  removedEdges[]
}
```

This is separate from raw Git diff.

Git diff answers what text/files changed.

Graph diff answers what semantic relationships changed.

## 25. Public Query API

The package should expose stable query-oriented APIs.

Examples:

- getRepository()
- getPackages()
- getCommit()
- getGraphSnapshot()
- getGraphDiff()
- getChangedSymbols()
- getDependencies()
- getDependents()
- getImpact()
- getAffectedTests()
- getTestProjects()
- getTestFiles()
- getTestCases()
- getBlastRadius()
- getEvidence()

Query results should be serializable and machine-friendly.

## 26. AI Integration

AI is an external consumer.

```text
AI Agent
   |
   +--> repository facts
   +--> graph queries
   +--> commit history
   +--> impact analysis
   +--> affected tests
   +--> evidence
```

The package should make it easy for an AI agent to ask:

- What changed?
- Which symbols changed?
- What depends on this symbol?
- Which tests are affected?
- Why is this test affected?
- What is the blast radius?
- What changed between commit A and B?
- Which relationships are uncertain?

The AI must not be responsible for creating graph metadata.

Optional AI capabilities may later improve:

- unresolved dynamic dependency interpretation;
- test intent classification;
- natural-language graph queries;
- explanation generation.

These are enrichment layers, not core graph construction.

## 27. CLI

The CLI should expose explicit lifecycle operations.

Conceptual commands:

```text
gctg init
gctg index
gctg index --commit <sha>
gctg status
gctg commits
gctg graph
gctg diff <from> <to>
gctg impact <commit>
gctg tests <commit>
gctg run <test-id>
gctg serve
```

Zero-config convenience may remain:

```text
npx git-commit-test-graph
```

but "zero config" must not mean "zero indexing semantics".

## 28. Server / UI Boundary

The web server should be a thin adapter over application/query services.

It must not instantiate Git analyzers, test runners, or graph builders directly.

Target:

```text
HTTP Route
   |
   v
Application Query / Command
   |
   v
Domain Services
   |
   v
Ports
   |
   v
Adapters
```

The UI should support two primary projections:

1. Dependency Graph
2. Test Graph

A third detail view may show evidence and execution results.

## 29. Security and Process Execution

Shell commands must not be assembled from untrusted graph text.

Command execution should use structured arguments where possible.

The runner must record:

- executable;
- arguments;
- cwd;
- environment policy;
- start/end time;
- exit code;
- stdout/stderr;
- parser used.

Execution is opt-in and separate from static impact analysis.

## 30. Error Model

Do not silently swallow analysis errors.

Use typed errors such as:

- RepositoryNotFound
- UnsupportedLanguage
- UnsupportedFramework
- InvalidCommit
- GitOperationFailed
- ParseFailed
- ResolutionFailed
- IndexCorrupt
- TestExecutionFailed

A recoverable uncertainty should become an explicit analysis result, not an empty array that looks like "no relationship".

## 31. Testing Strategy

The package needs four levels of tests.

### Unit

Domain and pure application logic.

### Integration

Real temporary Git repositories exercising:

- commits;
- renames;
- aliases;
- workspaces;
- deleted files;
- config changes;
- test discovery.

### Golden

Small fixed repositories with expected graph snapshots.

Golden fixtures should verify exact nodes, edges, evidence, and impact paths.

### Acceptance

Real-world consumer projects.

vangioi.com is the primary Golden Acceptance project.

## 32. Acceptance Baseline: vangioi.com

The consumer project is a pnpm monorepo with:

- apps/web
- apps/api
- packages/shared
- package scripts;
- TypeScript path configuration;
- Next.js;
- NestJS;
- extensive custom script-based tests.

A known baseline commit is:

```text
ec97721b225038b703e1a274d76fcf6ed39a1a12
feat(home): redesign homepage to remove AI fingerprints
```

Changed files:

```text
apps/web/app/page.tsx
apps/web/components/home/WhyChooseUs.tsx
```

The prototype reported approximately:

- 65 impacted test suites;
- 348 test cases;

with no execution results yet, and included unrelated apps/api dependency relationships.

This is a required regression target.

V2 acceptance must demonstrate that unrelated API files are not included merely because the changed web file shares a basename or import-text pattern.

## 33. Golden Acceptance Requirements

For the baseline commit, V2 must prove:

1. Historical source is read from the selected commit.
2. Changed symbols come from semantic parsing/diff mapping.
3. Web package boundaries are recognized.
4. API package files are not falsely linked.
5. Workspace dependencies are represented correctly.
6. Test projects are identified independently.
7. Custom script tests are recognized.
8. Test impact is based on graph reachability.
9. Every impact path has evidence.
10. Uncertain relationships are explicitly marked.
11. A second request can reuse the persisted graph.
12. Parent-to-child indexing does not require a full repository scan when unnecessary.

## 34. Migration From Prototype

The current prototype should not be incrementally patched into v2.

Recommended migration:

### Phase A — Freeze prototype

Keep the existing implementation only as a historical reference.

### Phase B — Create v2 domain model

Implement graph, evidence, repository, commit, package, file, symbol, and test entities.

### Phase C — Git and repository adapters

Implement exact commit content access and package/workspace discovery.

### Phase D — TypeScript/JavaScript semantic adapter

Replace regex import/symbol analysis with AST/semantic resolution.

### Phase E — Graph index/store

Implement snapshots, content hashes, and incremental updates.

### Phase F — Test adapters

Implement generic-script first for vangioi.com, then Vitest/Jest/node-test/Playwright as adapters.

### Phase G — Impact engine

Implement reverse dependency traversal and test projection.

### Phase H — Query API

Expose stable machine-readable graph and impact queries.

### Phase I — Runner

Separate command resolution, execution, result parsing, and result storage.

### Phase J — Server/UI

Rebuild UI against query APIs.

### Phase K — Acceptance

Run unit, integration, golden, and vangioi acceptance suites.

## 35. Definition of Done for v2 Core

The core is considered architecturally complete when:

- no core service depends on a concrete repository;
- no impact decision requires filename similarity;
- no historical analysis reads current working-tree source;
- graph snapshots are commit-addressed;
- graph relationships carry evidence;
- confidence is explicit;
- package boundaries are modeled;
- test cases are modeled;
- test frameworks are adapters;
- package managers are adapters;
- source parsing is semantic;
- incremental indexing exists;
- graph diff exists;
- impact traversal is deterministic;
- public query APIs are stable;
- AI is optional;
- vangioi acceptance passes without repository-specific hardcoded rules.

## 36. Architecture Invariants

These invariants must be protected by automated tests:

1. Historical commit analysis never falls back to current source.
2. A low-confidence filename match cannot independently create a HIGH/EXACT impact.
3. Repository-specific directory names are not hardcoded in core.
4. Domain modules cannot import infrastructure adapters.
5. Test execution cannot mutate graph truth.
6. Graph snapshot identity includes commit and analyzer/configuration identity.
7. Deleted files disappear from the target snapshot.
8. Renames preserve identity where Git semantics permit.
9. A config change only expands impact according to semantic rules.
10. AI is never required for baseline indexing.

## 37. Performance Targets

Initial targets should be measured rather than guessed.

Required metrics:

- cold index duration;
- incremental index duration;
- graph snapshot size;
- memory usage;
- query latency;
- impact traversal latency;
- test discovery latency.

The first optimization priority is avoiding repeated full-repository scans.

## 38. Compatibility Strategy

Public API changes must use explicit versioning.

Graph schema has its own schema version independent of npm package version.

Analyzer changes that alter graph semantics must change analyzer identity/fingerprint so old snapshots are not incorrectly reused.

## 39. Final Architectural Position

GCTG v2 is not a smarter regex-based diff tool.

It is a local semantic repository graph engine with:

```text
Git History
   +
Repository Structure
   +
Semantic Code Graph
   +
Test Graph
   +
Evidence
   +
Versioned Snapshots
   +
Deterministic Impact Analysis
```

The visual UI is a projection.

The AI integration is a consumer.

The graph is the product.
