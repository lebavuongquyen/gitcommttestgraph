# Pre-0.7.x Deep Quality Audit

Date: 2026-10-06
Repository: lebavuongquyen/gitcommttestgraph
Baseline: v0.7.1
Audit scope: v0.3.3 through v0.7.0
Audit mode: evidence-first, read-only against implementation history

## 1. Executive conclusion

The pre-0.7.x history is substantially stronger technically than the release process suggested, but the releases were not governed by a sufficiently strict reproducibility and acceptance gate.

The audit found three classes of issues:

1. Release-governance debt in v0.3.3-v0.3.8.
2. A real npm reproducibility defect in v0.4.0-v0.6.1 caused by npm lockfiles containing pnpm-specific dependency paths.
3. Public-surface test gaps: MCP, HTTP and CLI contracts are not covered by dedicated automated integration/contract tests; the GUI test is an HTML shell assertion rather than a real HTTP/browser acceptance test.

The most important historical finding is the lockfile defect. v0.6.1's release documentation stated that build and release validation passed, but a clean dependency installation followed by build cannot be reproduced reliably from the committed npm lockfile. v0.7.0 corrected the package dependency classification and lockfile shape, and v0.7.1 is the current clean baseline.

No code change is required as part of this audit itself. Historical defects should not be rewritten into old tags. They should be tracked as backport candidates or accepted historical debt.

## 2. Audited release lineage

| Version | Capability | Release doc | Source version constant | Lockfile | Historical clean build/test |
|---|---|---:|---:|---:|---:|
| 0.3.3 | Semantic incremental indexing baseline | No | No | No | Build + 23 tests pass |
| 0.3.4 | Concurrent index locking | No | No | No | Not separately revalidated after first clean baseline |
| 0.3.5 | Content-addressed semantic cache | No | No | No | Not separately revalidated |
| 0.3.6 | Graph snapshot manifest / hardening | No | No | No | Not separately revalidated |
| 0.3.7 | Static test-gap analysis | No | No | No | Not separately revalidated |
| 0.3.8 | Test-gap calibration | No | No | No | Build + 31 tests pass |
| 0.4.0 | GUI-first workbench | Yes | Yes | Present but pnpm-shaped | Clean npm install/build reproducibility defect |
| 0.5.0 | Visual test execution workflow | Yes | Yes | Present but pnpm-shaped | Same lockfile class of defect |
| 0.6.0 | Branch Intelligence | Yes | Yes | Present but pnpm-shaped | Same lockfile class of defect |
| 0.6.1 | Branch hardening | Yes | Yes | Present but pnpm-shaped | Same lockfile class of defect |
| 0.7.0 | Pull Request Intelligence | Yes | Yes | Corrected | Build + 53 tests pass |
| 0.7.1 | PR hardening baseline | Yes | Yes | Corrected | Build + 56 tests pass |

Historical validation was performed in isolated Git worktrees. The early failed test attempt was discarded because it omitted the historical build step; the corrected lifecycle was install -> build -> test.

## 3. Release-governance evolution

### v0.3.3-v0.3.8

The product already had a mature architecture and semantic indexing direction, but there was effectively no formal release evidence package.

Observed:

- no release documents under docs/releases;
- no source version constant;
- no committed package-lock.json;
- v0.3.8 CHANGELOG entry only redirected readers to Git history.

This is governance debt rather than evidence that the implementation itself was poor.

### v0.4.0-v0.7.0

Release documentation became explicit and capability-oriented.

The release docs introduced:

- release goals;
- delivered capability lists;
- acceptance sections;
- publish rules;
- typecheck/build/test assertions;
- GUI/MCP/CLI alignment statements.

This was a major improvement.

However, the release gate initially verified documentation consistency, not full package reproducibility. The current release-check implementation is still a documentation/version gate and does not itself execute the complete build/test/reproducibility workflow.

## 4. Critical technical finding

### Invalid npm lockfile provenance

The committed package-lock.json files for v0.4.0, v0.5.0, v0.6.0 and v0.6.1 contain entries such as:

    ../../node_modules/.pnpm/@types+node@24.19.1/node_modules/@types/node
    ../../node_modules/.pnpm/typescript@5.9.3/node_modules/typescript

These are pnpm store-style paths embedded in an npm lockfile.

The package manifests simultaneously describe an npm package with npm-compatible scripts and npm publication semantics.

Consequences:

- a clean install does not reproduce the dependency tree expected by the source;
- build dependencies can appear absent even though they are declared;
- release validation can pass only when executed from a pre-existing development environment;
- the published package can be buildable while the source repository is not reproducibly buildable from a clean checkout.

This is the strongest historical release-quality defect found.

v0.7.0 corrected the dependency classification and lockfile shape. v0.7.1 is the current baseline and has passed the full clean release workflow.

## 5. Public-surface test coverage

Current tests strongly cover domain/application behavior, but the external product surfaces are less rigorously tested.

### MCP

No dedicated MCP contract/integration test file was found.

The MCP server directly exposes major capabilities including:

- branch review;
- pull-request review;
- impact analysis;
- execution plan;
- execution.

The underlying application services have unit coverage, but the MCP schema/tool wiring itself does not have equivalent automated contract coverage.

### HTTP

No dedicated HTTP integration test suite was found under tests.

Release notes mention HTTP smoke validation for some releases, but this validation is not represented as durable automated regression tests.

### CLI

No dedicated CLI integration/contract test suite was found.

CLI wiring therefore depends primarily on shared application behavior and manual validation.

### GUI

The GUI test validates rendered HTML strings and endpoint references. It is useful as a rendering contract, but it is not a browser-level or HTTP integration acceptance test.

Therefore the release statement "GUI acceptance coverage" should be interpreted as shell/rendering acceptance, not full end-to-end acceptance.

## 6. Architecture observations

The architecture direction is strong and consistent with the target architecture:

- Git history is modeled through explicit adapters.
- Historical source reads use commit-aware Git operations.
- Domain/application code is separated from infrastructure.
- Test execution uses structured process arguments with shell disabled.
- GUI and MCP delegate to application/domain services rather than implementing separate business logic.
- Branch and PR intelligence build on the same semantic graph foundation.

No P0 architecture-boundary violation was found in this audit.

The main architectural concern for 0.8.x is not the existing layering; it is ensuring that every new public capability has a single application contract and then receives CLI/GUI/MCP contract coverage.

## 7. Historical defect disposition

Do not rewrite historical tags.

Recommended disposition:

- 0.3.x governance gaps -> record as historical debt; no backport required.
- 0.4.0-0.6.1 lockfile defect -> document as historical release defect; no tag rewrite.
- 0.4.0-0.7.0 public-surface test gaps -> carry forward as quality requirements for 0.8.x.
- 0.7.1 -> retain as stable baseline.
- 0.8.0 -> become the first release governed by the new deep-release gate.

## 8. New release quality standard

Starting with 0.8.x, a release is not accepted by documentation alone.

Required pipeline:

    Feature complete
        |
        v
    Domain/application tests
        |
        v
    Public contract tests
        |
        +--> CLI
        +--> HTTP
        +--> MCP
        +--> GUI
        |
        v
    Clean dependency install
        |
        v
    Typecheck
        |
        v
    Build
        |
        v
    Full test suite
        |
        v
    Package/release reproducibility check
        |
        v
    Release documentation gate
        |
        v
    Git/tag/publish verification

## 9. Audit decision

0.8.0 should proceed, but only after converting the findings below into explicit acceptance criteria.

The audit does not justify freezing development or reverting the 0.7.x architecture. It justifies tightening the release engineering layer before adding another large capability.

## 10. Evidence references

Key historical evidence:

- v0.3.3 package and source tree
- v0.3.3/v0.3.8 clean build/test runs
- v0.4.0-v0.6.1 package-lock.json pnpm-path evidence
- v0.6.1 clean-install/build failure
- v0.7.0 clean build/test run
- v0.7.1 current release gate and 56-test baseline
- current scripts/release-check.mjs
- current GUI, PR and branch test suites
