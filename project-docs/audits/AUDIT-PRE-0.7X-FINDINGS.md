# Pre-0.7.x Audit Findings Register

Date: 2026-10-06
Baseline: v0.7.1

Severity:
- P0 = release-blocking correctness/security/reproducibility defect
- P1 = high-priority quality or public-contract defect
- P2 = technical debt / missing engineering discipline
- P3 = documentation or developer-experience improvement
- Accepted = intentional historical limitation

## AUDIT-PRE07X-001 — Missing formal release evidence for 0.3.x

Severity: P2
Versions: 0.3.3-0.3.8
Status: Historical debt / accepted

Evidence:
- No docs/releases files exist in v0.3.3-v0.3.8.
- No src/version.ts exists in those tags.
- v0.3.8 CHANGELOG entry says to see Git history rather than providing a release record.

Impact:
- Release acceptance cannot be reconstructed from a standardized artifact.
- Capability boundaries and validation evidence are harder to audit.
- Release quality depends on commit history and operator memory.

Root cause:
- Release discipline had not yet been formalized.

Action:
- No historical tag rewrite.
- Preserve finding in audit history.
- Apply the new release gate to all future versions.

Target:
- 0.8.0 release process.

## AUDIT-PRE07X-002 — npm lockfiles contain pnpm store paths

Severity: P0
Versions: 0.4.0-0.6.1
Status: Confirmed historical defect

Evidence:
- package-lock.json contains entries such as ../../node_modules/.pnpm/... for @types/node and typescript.
- The same pattern appears in v0.4.0, v0.5.0, v0.6.0 and v0.6.1.
- v0.7.0 no longer contains the .pnpm path pattern.

Impact:
- Clean npm dependency installation is not a reliable reproduction of the intended dependency tree.
- Build results can depend on an existing development environment.
- Release validation can produce false confidence.

Root cause:
- Lockfile provenance/tooling was inconsistent with npm package/release semantics.

Action:
- Do not rewrite historical tags.
- Treat v0.7.0 as the correction point.
- Add an automated lockfile provenance/reproducibility check to future release gates.

Target:
- 0.8.0 release engineering hardening.

## AUDIT-PRE07X-003 — Release gate did not prove clean build reproducibility

Severity: P1
Versions: 0.4.0-0.7.0
Status: Confirmed process gap

Evidence:
- scripts/release-check.mjs validates versioning, changelog, release docs and policy text.
- It does not run npm ci/install, typecheck, build or the full test suite.
- Release documents state those validations were performed separately.

Impact:
- A release can satisfy release:check while the package cannot be rebuilt from a clean environment.
- Documentation assertions can drift from executable reality.

Root cause:
- Documentation gate and executable release gate were treated as separate concerns without a mandatory orchestration layer.

Action:
- Split checks into documentation gate and executable quality gate.
- Make release:check orchestrate or require the executable gate.
- Add clean install and package verification.

Target:
- 0.8.0.

## AUDIT-PRE07X-004 — MCP public contract lacks automated integration coverage

Severity: P1
Versions: 0.4.0-0.7.1
Status: Open

Evidence:
- No tests/unit/mcp*.test.mjs or equivalent MCP integration suite exists.
- MCP exposes branch review, PR review, impact, execution-plan and execution capabilities.
- Underlying application services are tested, but tool registration/schema/wiring is not.

Impact:
- A refactor can break tool names, schemas, serialization or wiring while domain tests remain green.
- MCP consumers are not protected by a contract test.

Action:
- Add MCP contract tests for every public tool.
- Validate tool names, input schemas, representative output shape and error behavior.
- Add one smoke path per capability family.

Target:
- 0.8.0 before adding more MCP surface.

## AUDIT-PRE07X-005 — HTTP public contract lacks automated integration coverage

Severity: P1
Versions: 0.4.0-0.7.1
Status: Open

Evidence:
- No dedicated HTTP integration test suite exists under tests.
- Release docs mention HTTP smoke tests for some releases, but those are not durable regression tests.

Impact:
- Endpoint routing, validation, status codes and serialization can regress without test failure.

Action:
- Add in-process HTTP integration tests for public endpoints.
- Verify success, validation failure, domain error and serialization contracts.

Target:
- 0.8.0.

## AUDIT-PRE07X-006 — CLI public contract lacks automated integration coverage

Severity: P1
Versions: 0.3.3-0.7.1
Status: Open

Evidence:
- No dedicated CLI integration/contract test suite exists.
- CLI behavior is primarily covered indirectly through application services and manual smoke validation.

Impact:
- Argument parsing, command registration, exit codes and output formatting can regress independently of application logic.

Action:
- Add CLI contract tests for each public command.
- Validate arguments, exit codes and machine-readable output where applicable.

Target:
- 0.8.0.

## AUDIT-PRE07X-007 — GUI acceptance test is render-contract only

Severity: P2
Versions: 0.4.0-0.7.1
Status: Open

Evidence:
- tests/unit/gui.test.mjs calls renderGui() and asserts strings/endpoints.
- It does not start the HTTP server or execute a browser interaction flow.

Impact:
- UI wiring can appear correct in static HTML while runtime API integration is broken.
- Browser interaction regressions are not detected.

Action:
- Keep the existing render test.
- Add lightweight HTTP-level GUI smoke coverage.
- Add browser automation only for critical workflows where justified.

Target:
- 0.8.x, with HTTP smoke coverage required for 0.8.0.

## AUDIT-PRE07X-008 — 0.3.x package lacked committed npm lockfile

Severity: P2
Versions: 0.3.3-0.3.8
Status: Historical debt / accepted

Evidence:
- package-lock.json is absent in every audited 0.3.x tag.

Impact:
- Dependency resolution was not reproducibly pinned for npm consumers/developers.

Root cause:
- Early project stage before formal release engineering.

Action:
- No backport.
- Maintain lockfile/reproducibility requirements going forward.

## AUDIT-PRE07X-009 — Source version was not independently recorded before 0.4.0

Severity: P2
Versions: 0.3.3-0.3.8
Status: Historical debt / accepted

Evidence:
- src/version.ts is absent from 0.3.x tags.
- It is present starting at v0.4.0.

Impact:
- Runtime/API version identity could drift from package.json.

Action:
- No historical rewrite.
- Keep package/source version consistency as a release gate.

## AUDIT-PRE07X-010 — Public capability acceptance was stronger than its automated evidence

Severity: P2
Versions: 0.4.0-0.7.0
Status: Open

Evidence:
- Release documents consistently claim complete GUI/MCP/CLI capability.
- Automated tests primarily exercise application/domain services.
- Public adapter contracts have limited direct automated coverage.

Impact:
- The implementation may be correct while the release surface is insufficiently protected against wiring regressions.

Action:
- Define acceptance at three layers:
  1. domain/application semantics;
  2. public adapter contract;
  3. end-to-end smoke for critical GUI flows.

Target:
- 0.8.0.

## Audit summary

| ID | Severity | Status | Target |
|---|---|---|---|
| 001 | P2 | Historical | Future process |
| 002 | P0 | Confirmed historical defect | 0.8 gate |
| 003 | P1 | Confirmed process gap | 0.8 |
| 004 | P1 | Open | 0.8 |
| 005 | P1 | Open | 0.8 |
| 006 | P1 | Open | 0.8 |
| 007 | P2 | Open | 0.8.x |
| 008 | P2 | Historical | Future process |
| 009 | P2 | Historical | Future process |
| 010 | P2 | Open | 0.8 |

## Recommended release policy

No future release should be accepted solely because unit tests and release documentation pass.

Minimum release evidence must include:

- clean dependency installation;
- typecheck;
- production build;
- full test suite;
- public MCP contract tests;
- HTTP integration tests;
- CLI contract tests;
- critical GUI smoke test;
- release documentation gate;
- clean Git state;
- pushed commit and tag;
- post-tag/package verification.
