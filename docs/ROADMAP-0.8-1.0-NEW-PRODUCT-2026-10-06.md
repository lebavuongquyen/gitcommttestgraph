# Master Roadmap — 0.8.x → 1.0.0 → Next Product

Date: 2026-10-06
Repository: git-commit-test-graph
Baseline: v0.7.1
Status: Approved planning baseline

## 1. Vision

git-commit-test-graph (GCTG) evolves from a deterministic semantic Git/test graph into a production-grade software-engineering intelligence platform.

The path to 1.0.0 is not a rewrite.

It is a controlled progression:

```
0.7.1
  |
  | hardening baseline
  v
0.8.x  Unified Change Intelligence
  |
  | public contracts + observability + multi-source change model
  v
0.9.x  Production Engineering Platform
  |
  | stability + compatibility + performance + ecosystem readiness
  v
1.0.0  Stable Product
  |
  | extract stable core / productize higher-level experience
  v
1.x    New Product Line
```

The fundamental architecture remains:

```
Git / GitHub / CI / workspace
          |
          v
      Adapters
          |
          v
   Application Services
          |
          v
 Deterministic Graph + Evidence
          |
    +-----+-----+-----+
    |     |     |     |
   CLI   HTTP   MCP   GUI
    |     |     |     |
    +-----+-----+-----+
          |
       Consumers
```

The core remains:

- deterministic;
- historical-truth aware;
- graph-first;
- evidence-driven;
- AI-optional;
- project-agnostic;
- locally usable;
- automatable.

## 2. Product strategy

### 2.1 What 1.0.0 means

1.0.0 means the existing product has a stable, documented, reproducible public contract.

It does NOT mean:

- every language is supported;
- every framework is supported;
- AI is required;
- the product becomes hosted-only;
- the architecture is frozen forever;
- every advanced feature is complete.

1.0.0 means users can depend on the core contract without treating the project as experimental.

### 2.2 What the next product means

The next product should be built on the stable 1.0 core rather than inside the graph engine.

Potential product direction:

```
GCTG Core
   |
   +--> CLI
   +--> SDK
   +--> MCP
   +--> Local API
   |
   v
New Product
   |
   +--> Change Intelligence workspace
   +--> PR / branch cockpit
   +--> visual graph exploration
   +--> test-impact planning
   +--> execution evidence
   +--> AI-assisted investigation
   +--> team / CI integrations
```

The new product should consume stable capabilities through public application/API contracts.

The graph engine must not become dependent on the new product.

## 3. Non-negotiable principles

### P1 — Feature first, adapters second

Every capability is implemented once in domain/application layers.

Then:

1. test it;
2. expose it through GUI;
3. expose it through MCP;
4. expose it through CLI/API when useful;
5. document it;
6. release it.

No adapter may own business logic.

### P2 — Evidence before intelligence

The system must distinguish:

- fact;
- inferred relationship;
- uncertain relationship;
- runtime evidence;
- AI-generated explanation.

AI must never silently replace deterministic evidence.

### P3 — Historical truth

For commit-based analysis:

```
snapshot(commit X) = repository content at X
```

Never:

```
snapshot(commit X) = current working tree interpreted as X
```

### P4 — Public contracts are tested

Every public capability must have:

- application-level tests;
- public adapter contract tests;
- critical end-to-end smoke coverage.

### P5 — Reproducible releases

A release must be reproducible from a clean checkout.

Required:

- clean dependency installation;
- locked dependencies;
- typecheck;
- build;
- complete tests;
- public contract tests;
- package verification;
- release documentation;
- tag verification.

### P6 — No historical tag rewriting

Old releases remain immutable.

Historical defects become:

- accepted historical debt;
- backport candidate;
- future-process requirement.

### P7 — 1.0 before product expansion

Do not build the next product on unstable internal APIs.

The stable core comes first.

---

# 4. Phase 0 — 0.7.1 Baseline

Status: COMPLETE

Baseline commit:

```
8813a324d2d042cb7cea6a288a31ea327e025d9d
```

Tag:

```
v0.7.1
```

Validation:

- typecheck: PASS
- build: PASS
- tests: 56/56
- release check: PASS
- clean Git state: PASS

0.7.1 is the quality baseline for all remaining work.

---

# 5. Phase 1 — 0.8.x Unified Change Intelligence

## Objective

Unify commit, branch and pull-request intelligence into one change model.

The user should not have to understand which internal analysis pipeline is being used.

Conceptually:

```
Commit
Branch
Pull Request
CI Change
    |
    v
ChangeSource
    |
    v
Unified ChangeSet
    |
    v
Unified ChangeAnalysis
    |
    +--> semantic diff
    +--> impact
    +--> tests
    +--> risk
    +--> evidence
    +--> execution plan
```

## 5.1 0.8.0 — Unified Change Model

### UCI-01 ChangeSource abstraction

Create a first-class source model:

```ts
type ChangeSource =
  | CommitChange
  | BranchChange
  | PullRequestChange;
```

Acceptance:

- commit analysis uses the same application contract;
- branch analysis uses the same contract;
- PR analysis uses the same contract;
- adapters only translate source metadata.

### UCI-02 Unified ChangeSet

Create:

```ts
UnifiedChangeSet
UnifiedChangeAnalysis
```

It must contain:

- source identity;
- base commit;
- target commit;
- changed files;
- added symbols;
- changed symbols;
- removed symbols;
- changed relationships;
- downstream impact;
- test impact;
- test gaps;
- execution plan;
- evidence;
- uncertainty.

### UCI-03 Unified risk model

Normalize:

- decision;
- risk;
- blockers;
- uncertainty;
- evidence.

No separate branch-risk and PR-risk business rules unless the source semantics genuinely differ.

### UCI-04 Change Intelligence query

Add one compact application query:

```
change_intelligence(source)
```

It should answer:

- what changed;
- why it matters;
- who/what is affected;
- which tests are affected;
- what is uncertain;
- what should be inspected next.

### UCI-05 GUI

Create a unified Change Intelligence cockpit.

Required views:

- source;
- change summary;
- semantic diff;
- impact;
- test impact;
- risk;
- uncertainty;
- evidence;
- execution plan.

The GUI must not duplicate analysis logic.

### UCI-06 MCP

Expose the same capability:

```
change_intelligence
```

MCP output must be application-level data serialized for agents.

### UCI-07 CLI/API

Add a stable machine-readable command:

```
gctg change-intelligence ...
```

Output:

- JSON;
- deterministic ordering;
- schema version.

### UCI-08 Contract tests

Add dedicated:

```
tests/integration/
tests/acceptance/
tests/contracts/
```

Minimum suites:

- MCP;
- HTTP;
- CLI;
- GUI HTTP smoke.

### UCI-09 Release gate v2

Create executable release validation.

The gate must perform:

```
clean install
   -> dependency provenance
   -> typecheck
   -> build
   -> unit tests
   -> integration tests
   -> public contract tests
   -> package verification
   -> documentation gate
```

### UCI-10 Release documentation

Every 0.8 release must include:

- release document;
- changelog;
- architecture delta;
- migration note if public API changes;
- acceptance evidence.

### 0.8.0 Definition of Done

- [ ] Unified ChangeSource
- [ ] Unified ChangeSet
- [ ] Unified ChangeAnalysis
- [ ] unified risk/uncertainty model
- [ ] change_intelligence query
- [ ] GUI cockpit
- [ ] MCP tool
- [ ] CLI/API
- [ ] MCP contract tests
- [ ] HTTP contract tests
- [ ] CLI contract tests
- [ ] GUI smoke test
- [ ] executable release gate v2
- [ ] clean-install reproducibility test
- [ ] documentation
- [ ] changelog
- [ ] release acceptance
- [ ] v0.8.0 tag

---

# 6. Phase 2 — 0.8.x Hardening Releases

0.8.x patches are for stabilizing the unified model.

## 0.8.1 — Public Contract Hardening

Status: COMPLETE

Focus:

- MCP schemas;
- HTTP status/error contracts;
- CLI exit codes;
- serialization;
- backwards-compatible field additions;
- GUI state/error handling.

Delivered:

- CLI Change Intelligence source validation with deterministic usage exit code 2;
- HTTP Change Intelligence source validation with HTTP 400;
- MCP source enum/schema contract coverage;
- deterministic repeated-query contract coverage;
- GUI Change Intelligence result capture fixed;
- GUI visible error state for commit intelligence loading;
- dedicated 0.8.1 contract suite with 7/7 gates passing;
- release documentation and changelog;
- version 0.8.1.

Evidence:

- `tests/contracts/0.8.1-public-contract.contract.test.mjs`
- `docs/releases/0.8.1.md`

## 0.8.2 — Performance

Focus:

- incremental indexing;
- snapshot reuse;
- semantic cache;
- large repository traversal;
- memory pressure;
- graph query latency.

Required benchmark classes:

- small repository;
- medium monorepo;
- large-history repository;
- repeated historical query;
- cold index;
- warm index.

## 0.8.3 — Reliability

Focus:

- interrupted indexing;
- stale lock recovery;
- corrupt snapshot;
- missing Git objects;
- detached HEAD;
- shallow clone;
- deleted branch;
- force-push scenarios;
- GitHub API failures;
- pagination boundaries.

## 0.8.4 — Security

Focus:

- untrusted repository input;
- command execution;
- GitHub metadata;
- token handling;
- path traversal;
- unsafe environment inheritance;
- malicious repository fixtures.

Security tests become permanent regression tests.

---

# 7. Phase 3 — 0.9.x Production Engineering Platform

0.9.x is not a feature explosion.

It is the phase where the product becomes operationally trustworthy.

## 7.1 0.9.0 — Stable Public API

Freeze the first public API surface.

Potential public namespaces:

```
@ gctg/core
@ gctg/api
@ gctg/mcp
```

The exact package split is decided only after dependency analysis.

Public contracts include:

- graph snapshot schema;
- change analysis schema;
- impact result schema;
- test impact schema;
- evidence schema;
- execution-plan schema;
- error schema.

Each gets an explicit schema version.

## 7.2 0.9.1 — Repository Ecosystem

Improve adapters:

- npm;
- pnpm;
- yarn;
- bun;
- TypeScript;
- JavaScript;
- Node test;
- Jest;
- Vitest;
- Playwright;
- generic scripts.

Priority is correctness over quantity.

Unsupported environments must produce explicit UNKNOWN/UNSUPPORTED results.

They must never silently become false-positive impact results.

## 7.3 0.9.2 — Monorepo Intelligence

Support:

- workspace boundaries;
- package dependencies;
- package-level impact;
- cross-package symbol relationships;
- package-specific tests;
- filtered test execution;
- package ownership metadata when available.

## 7.4 0.9.3 — Historical Intelligence

Improve:

- multi-commit analysis;
- regression windows;
- semantic evolution;
- symbol history;
- dependency history;
- test-impact history.

Potential query:

```
Why did this test become affected between A and B?
```

## 7.5 0.9.4 — CI Integration

Provide machine-readable integration:

```
gctg analyze
gctg impact
gctg test-impact
gctg change-intelligence
```

Support:

- GitHub Actions;
- generic CI;
- exit codes;
- JSON artifacts;
- SARIF where justified;
- CI summary output.

No hosted service is required.

## 7.6 0.9.5 — Observability

Add structured diagnostics:

- operation ID;
- repository;
- commit;
- analyzer version;
- duration;
- cache hit/miss;
- node/edge counts;
- parser;
- resolver;
- uncertainty counts.

Diagnostics must not leak secrets.

## 7.7 0.9.6 — Documentation and SDK Preview

Produce:

- API reference;
- MCP tool reference;
- CLI reference;
- architecture guide;
- integration guide;
- troubleshooting guide;
- performance guide;
- security model;
- extension guide.

Potential SDK is preview only until 1.0.

## 7.8 0.9.7 — Compatibility Freeze

No new major architecture capability.

Only:

- compatibility;
- performance;
- bug fixes;
- documentation;
- migration tooling;
- release engineering.

## 7.9 0.9.x Definition of Done

- [ ] stable public schemas
- [ ] supported ecosystem matrix
- [ ] monorepo support
- [ ] historical intelligence
- [ ] CI integration
- [ ] structured diagnostics
- [ ] documentation
- [ ] compatibility tests
- [ ] migration tests
- [ ] performance baseline
- [ ] security baseline
- [ ] no known P0
- [ ] no unresolved P1 in stable public contracts

---

# 8. Phase 4 — 1.0.0 Stable Product

## 8.1 1.0 principle

1.0 is a contract release, not a feature-count release.

The question is:

> Can an external developer install this product, understand it, automate it, integrate it into CI/MCP/GUI workflows, and trust the documented behavior?

If yes, 1.0 is justified.

## 8.2 1.0 Public Product Surface

### Core

- repository discovery;
- historical snapshots;
- semantic graph;
- graph diff;
- impact;
- test impact;
- test gaps;
- execution plan;
- evidence;
- uncertainty.

### Change Intelligence

- commit;
- branch;
- pull request;
- unified change source.

### Interfaces

- CLI;
- programmatic API;
- local HTTP API;
- MCP;
- GUI.

### Execution

- explicit authorization;
- structured commands;
- runtime evidence;
- persisted execution feedback.

### Security

- safe process execution;
- token isolation;
- repository trust boundary;
- path validation;
- deterministic read-only defaults.

## 8.3 1.0 Compatibility Promise

Document:

- Node support range;
- OS support;
- supported package managers;
- supported languages;
- supported test frameworks;
- CLI stability;
- JSON schema stability;
- MCP tool stability;
- HTTP endpoint stability;
- configuration stability.

Anything outside the promise is explicitly experimental.

## 8.4 1.0 Release Candidate

Create:

```
0.10.0-rc.1
```

or an equivalent RC policy without changing the normal semantic release policy.

RC gate:

- clean install;
- typecheck;
- build;
- complete test suite;
- contract tests;
- security tests;
- performance tests;
- compatibility tests;
- package smoke;
- MCP smoke;
- GUI smoke;
- CI smoke;
- documentation validation.

## 8.5 1.0.0 Acceptance

Required:

- zero P0;
- zero unresolved P1 in stable paths;
- all public APIs documented;
- all public tools documented;
- all release artifacts reproducible;
- migration guide from 0.7.x;
- changelog complete;
- known limitations documented;
- examples work from clean checkout;
- package can be consumed without repository internals.

## 8.6 1.0.0 Definition of Done

- [ ] architecture stable
- [ ] public API stable
- [ ] graph schema stable
- [ ] change schema stable
- [ ] evidence schema stable
- [ ] MCP schema stable
- [ ] HTTP API stable
- [ ] CLI stable
- [ ] GUI critical workflows accepted
- [ ] clean-install reproducibility
- [ ] performance baseline
- [ ] security baseline
- [ ] CI integration
- [ ] compatibility matrix
- [ ] migration guide
- [ ] complete documentation
- [ ] release notes
- [ ] changelog
- [ ] 1.0 acceptance report
- [ ] v1.0.0 tag
- [ ] published package verification

---

# 9. Phase 5 — Product Extraction

## Objective

After 1.0.0, separate:

1. the stable engineering intelligence engine;
2. the higher-level product experience.

Do not fork prematurely.

## 9.1 Product boundary

Target:

```
                    GCTG Core
                       |
        +--------------+--------------+
        |              |              |
       SDK            MCP            CLI
        |              |              |
        +--------------+--------------+
                       |
                 Stable API
                       |
                       v
              Next Product
```

The new product may have:

- its own repository;
- its own release cadence;
- its own UI;
- optional cloud services;
- team/project concepts;
- AI orchestration;
- collaboration;
- integrations.

But the core graph engine remains independently usable.

## 9.2 Recommended new-product positioning

The product should not be marketed as merely:

> a Git graph viewer.

The stronger product proposition is:

> **A Change Intelligence workspace that explains what changed, what is affected, what must be tested, why the system believes it, and what evidence was produced.**

The core differentiator is the evidence chain:

```
Change
  |
  v
Semantic Difference
  |
  v
Impact
  |
  v
Affected Tests
  |
  v
Execution Plan
  |
  v
Runtime Evidence
  |
  v
Engineering Decision
```

AI can sit above this chain and explain/orchestrate it, but deterministic evidence remains underneath.

## 9.3 Candidate product capabilities

### Workspace

- repository projects;
- branch/PR navigation;
- change timeline;
- saved investigations.

### Change cockpit

- unified change view;
- semantic diff;
- blast radius;
- affected tests;
- uncertainty;
- evidence.

### Test cockpit

- impacted tests;
- execution plan;
- runtime results;
- historical failure evidence.

### AI investigation

AI may:

- ask graph queries;
- investigate evidence;
- summarize changes;
- explain risk;
- propose investigation paths;
- compare historical regressions.

AI may not silently invent graph facts.

### Team/CI

Later:

- GitHub integration;
- CI annotations;
- PR comments;
- review summaries;
- dashboards;
- team policies.

### Optional cloud

Only after local-first workflows are proven.

Potential architecture:

```
Local Agent / CLI
       |
       v
Stable GCTG API
       |
       +------> Local mode
       |
       +------> Hosted mode
                    |
                    v
               Product backend
```

Cloud is an extension, not a prerequisite for the core.

---

# 10. Repository strategy

## Before 1.0

Keep one repository.

Reason:

- rapid architecture evolution;
- shared tests;
- shared fixtures;
- simpler refactoring;
- no premature package boundaries.

## Around 1.0

Decide package boundaries based on actual dependency measurements.

Possible structure:

```
git-commit-test-graph/
  core/
  api/
  cli/
  mcp/
  web/
```

or a package-oriented monorepo.

Do not split merely because a diagram looks cleaner.

## After 1.0

Create a new repository only when:

- core API is stable;
- product requirements differ from engine requirements;
- release cadence differs;
- ownership/security boundary differs;
- independent deployment becomes useful.

Potential repositories:

```
git-commit-test-graph
git-commit-test-graph-product
```

The exact names are intentionally deferred.

---

# 11. Version strategy

## GCTG

```
0.7.1  PR hardening baseline
0.8.0  Unified Change Intelligence
0.8.x  hardening/performance/security
0.9.0  stable public API
0.9.x  production platform
1.0.0  stable product contract
1.0.x  maintenance
1.1+   additive capabilities
2.0     only for intentional breaking contract changes
```

## New product

The new product gets its own version line.

It must not force core version bumps for product-only changes.

Example:

```
GCTG Core 1.0.0
Product 0.1.0
Product 0.2.0
Product 1.0.0
```

This separation is important.

---

# 12. Quality gates

## Feature gate

Every feature:

```
Requirement
 -> domain/application
 -> tests
 -> GUI
 -> MCP
 -> CLI/API
 -> docs
 -> acceptance
```

Not every feature must expose every adapter. The release document must explicitly state why an adapter is not applicable.

## Release gate

Every release:

```
1. clean checkout
2. dependency provenance
3. clean install
4. typecheck
5. build
6. unit tests
7. integration tests
8. contract tests
9. security tests
10. performance smoke
11. package smoke
12. GUI smoke
13. MCP smoke
14. release documentation
15. changelog
16. version consistency
17. clean Git state
18. tag verification
19. published artifact verification
```

## Product gate

Before creating the new product repository:

- core 1.0 API stable;
- package consumption tested externally;
- core can run without product;
- product can run without core internals;
- no circular dependency;
- independent versioning proven;
- migration path documented.

---

# 13. Quality dashboard

Every milestone should report:

### Correctness

- test pass rate;
- contract pass rate;
- regression count;
- unresolved P0/P1.

### Graph quality

- exact relationships;
- uncertain relationships;
- false-positive benchmark;
- false-negative benchmark where measurable.

### Performance

- cold indexing time;
- warm indexing time;
- memory;
- query latency;
- cache hit rate.

### Reliability

- interrupted operation recovery;
- corrupted snapshot recovery;
- lock recovery;
- API failure handling.

### Product

- GUI critical flows;
- MCP tool success;
- CLI command success;
- clean-install success.

---

# 14. Benchmark repositories

Create permanent fixtures for:

1. small TypeScript project;
2. medium application;
3. pnpm monorepo;
4. npm monorepo;
5. mixed TS/JS repository;
6. custom-script test repository;
7. large-history repository;
8. repository with renamed/moved symbols;
9. repository with deleted symbols;
10. repository with generated code;
11. repository with dynamic imports;
12. repository with configuration-driven behavior.

Every release must run the relevant benchmark/acceptance subset.

---

# 15. Risk register

## R1 — Feature explosion

Mitigation:
- one capability per minor release;
- no partial minor releases;
- hard scope freeze.

## R2 — Architecture rewrite

Mitigation:
- refactor behind existing ports;
- preserve application contracts;
- migrate incrementally.

## R3 — False confidence from unit tests

Mitigation:
- mandatory public contract tests;
- clean-install gate;
- smoke tests.

## R4 — AI overreach

Mitigation:
- deterministic core;
- evidence model;
- explicit uncertainty;
- AI as consumer, not source of graph truth.

## R5 — Product/core coupling

Mitigation:
- stable API;
- adapter boundary;
- separate product repository only after 1.0.

## R6 — Performance collapse on large repositories

Mitigation:
- incremental index;
- content-addressed cache;
- benchmark fixtures;
- performance budget.

## R7 — Security regression through execution

Mitigation:
- structured process runner;
- explicit execution approval;
- no shell interpolation;
- security fixtures.

## R8 — Release process regression

Mitigation:
- executable release gate;
- release checklist;
- immutable tags;
- post-publish verification.

---

# 16. Milestone sequence

```
NOW
 |
 v
Audit complete
 |
 v
0.8.0 Unified Change Intelligence
 |
 +--> public contract testing
 +--> release gate v2
 |
 v
0.8.x hardening
 |
 +--> performance
 +--> reliability
 +--> security
 |
 v
0.9.0 Stable Public API
 |
 v
0.9.x Production Engineering
 |
 +--> ecosystem
 +--> monorepo
 +--> historical intelligence
 +--> CI
 +--> observability
 |
 v
0.10 / RC
 |
 v
1.0.0 Stable Product
 |
 +--> API freeze
 +--> compatibility promise
 +--> migration guide
 |
 v
Product extraction decision
 |
 v
New Product 0.1.0
 |
 +--> Change Intelligence Workspace
 +--> AI investigation
 +--> team/CI integrations
 |
 v
New Product 1.0
```

---

# 17. Immediate next actions

The next implementation milestone is not yet product extraction.

First:

### M01 — Release Quality Gate v2

Status: COMPLETE

Build the executable gate from the audit findings.

### M02 — Public contract test framework

Status: COMPLETE

Add:

- MCP contract tests;
- HTTP integration tests;
- CLI contract tests;
- GUI HTTP smoke;
- reusable cross-surface contract helpers.

Mandatory development standard:

> No Surface Without Gate.

Every feature surface exposed through CLI, HTTP/API, MCP or GUI must have an executable quality gate before that surface is accepted. See `docs/QUALITY-GATES.md`.

### M03 — Unified Change model

Status: COMPLETE

Implemented as the shared application/domain model used by Change Intelligence.

### M04 — Unified Change Intelligence

Status: COMPLETE

Expose it through:

- GUI;
- MCP;
- CLI/API.

Completed with one shared application contract and independent executable gates for each exposed surface.

M04 acceptance evidence:

- domain/application semantics verified;
- CLI gate passed;
- HTTP/API gate passed;
- MCP gate passed;
- GUI real HTTP gate passed;
- cross-surface semantic equivalence passed;
- full regression passed;
- deterministic result contract passed.

See docs/QUALITY-GATES.md and docs/releases/0.8.0.md.

### M05 — 0.8.0 acceptance

Status: COMPLETE

Release Gate v2 passed on the final 0.8.0 release commit.

Acceptance evidence:

- clean install and dependency provenance;
- typecheck;
- build;
- full regression;
- public contract tests;
- M04 gate;
- package verification;
- documentation and changelog;
- version consistency;
- clean Git state;
- immutable tag `v0.8.0` verified and pushed.

### M06 — 0.8.1 public contract hardening

Status: COMPLETE

Acceptance evidence:

- CLI usage/error contract;
- HTTP status/error contract;
- MCP schema contract;
- deterministic serialization/query behavior;
- GUI Change Intelligence runtime path;
- 7/7 dedicated contract gates;
- release documentation and changelog.

See `docs/releases/0.8.1.md`.

### M07 — 0.8.2 performance hardening

Status: NEXT

First establish benchmark gates before changing indexing behavior.

Required benchmark classes:

- cold index;
- warm historical query;
- repeated historical query;
- small repository;
- medium monorepo;
- large-history repository;
- memory pressure;
- graph query latency.

No performance optimization is accepted without a reproducible baseline and regression threshold.

---

# 18. Final success criterion

The project reaches 1.0.0 when the following statement is true:

> GCTG can deterministically analyze a real Git repository at a specific historical state, explain semantic changes and their downstream impact, identify affected tests, produce an explicit execution plan, preserve evidence and uncertainty, expose the same capability through CLI/API/GUI/MCP, and reproduce its installation and behavior from a clean environment.

The next product then begins from a stable foundation:

> It does not need to discover what changed itself. It consumes trusted Change Intelligence and turns that intelligence into a first-class engineering workflow.

That separation is the strategic boundary between **the engine we are building now** and **the product we can build next**.
