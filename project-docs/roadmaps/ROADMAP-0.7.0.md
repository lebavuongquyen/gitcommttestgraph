# Roadmap 0.7.0 — Pull Request Intelligence

## Goal

Promote a pull request from a branch-shaped diff into a first-class engineering change object that combines:

- Git ancestry and exact change evidence.
- Semantic graph diff.
- Changed and removed symbols.
- Downstream impact.
- Test gaps and impacted tests.
- Deterministic execution plan.
- Pull request metadata.
- Review decision state.
- GitHub check state.
- GUI review cockpit.
- MCP agent capability.
- CLI automation.

The release is complete only when the feature is implemented, tested, represented in GUI, exposed through MCP, documented and accepted.

## Architecture

```
GitHub PR metadata
        |
        v
PullRequestProvider
        |
        v
PullRequestChangeSet
        |
        +--> Git merge-base / commit evidence
        |
        v
Semantic Graph Diff
        |
        +--> changed symbols
        +--> removed symbols
        +--> downstream impact
        +--> test gaps
        +--> impacted tests
        +--> execution plan
        |
        v
PullRequestReviewService
        |
        +--> decision
        +--> risk
        +--> reasons
        +--> uncertainty
        +--> review state
        +--> check state
        |
        +--> GUI
        +--> MCP
        +--> CLI
```

MCP, GUI and CLI remain adapters. No PR-specific business logic is implemented inside an adapter boundary.

## Scope

### PR identity

- PR number.
- Title.
- Description.
- Author.
- Draft state.
- Labels.
- Requested/recent reviewers.
- Review state.
- Mergeability.
- GitHub URL.
- Base/head repository and refs.

### Validation signals

- GitHub review state.
- GitHub check-run state.
- Semantic graph diff.
- Removed-symbol evidence.
- Test-gap evidence.
- Test-impact evidence.
- Execution-plan readiness.
- Downstream blast-radius threshold.

### Decision model

- READY.
- NEEDS_REVIEW.
- HIGH_RISK.
- BLOCKED.
- INCONCLUSIVE.

Risk levels:

- LOW.
- MEDIUM.
- HIGH.
- UNKNOWN.

The decision is deterministic. AI is not required to produce the decision.

## Feature Tasks

| ID | Task | Status |
|---|---|---|
| PR01 | First-class PullRequest metadata model | DONE |
| PR02 | PullRequest ChangeSet service | DONE |
| PR03 | Provider port | DONE |
| PR04 | GitHub metadata adapter | DONE |
| PR05 | Review/check state ingestion | DONE |
| PR06 | PullRequest Review service | DONE |
| PR07 | Removed-symbol and semantic diff integration | DONE |
| PR08 | Test-gap/test-impact/execution-plan integration | DONE |
| PR09 | MCP pull_request_review tool | DONE |
| PR10 | HTTP /api/pull-request-review endpoint | DONE |
| PR11 | GUI PR Intelligence cockpit | DONE |
| PR12 | CLI pr-review command | DONE |
| PR13 | Unit and GUI acceptance coverage | DONE |
| PR14 | Installation/reproducibility hardening | DONE |
| PR15 | Public documentation and release notes | DONE |
| PR16 | Release gate and v0.7.0 acceptance | DONE |

## Provider contract

```ts
interface PullRequestProvider {
  get(ownerRepo: string, number: number): Promise<PullRequestContext>;
}
```

The core depends on this port. The GitHub adapter is one implementation. The domain/application layers do not depend on GitHub SDK types.

Authentication is optional for public repositories and uses GITHUB_TOKEN when provided for authenticated/private access.

## Review semantics

A pull request is BLOCKED/HIGH when GitHub reports a merge conflict, a reviewer requests changes, or a failing/cancelled check is present.

A pull request is NEEDS_REVIEW/MEDIUM when it is a draft, checks are pending, approval is unresolved, semantic coverage is unknown, or execution dependencies are blocked.

A pull request is HIGH_RISK when semantic removal, high test gaps or non-runnable impacted projects create a concrete engineering risk.

A pull request is INCONCLUSIVE/UNKNOWN when no meaningful semantic change can be resolved.

A pull request can be READY/LOW only when no blocking signal or material uncertainty remains.

## GUI acceptance

The GUI must expose:

- PR repository and number inputs.
- Review PR action.
- Decision and risk.
- PR title and author.
- Base/head.
- Commit count.
- Changed/removed symbols.
- Impacted tests.
- Review reasons.
- Uncertainty.

The GUI must call the HTTP application boundary. It must not call GitHub directly.

## MCP acceptance

MCP exposes:

```text
pull_request_review(ownerRepo, number)
```

The tool is read-only and returns the same application-level PullRequestReview used by the HTTP/GUI/CLI adapters.

## CLI acceptance

```text
gctg pr-review <owner/repo> <number>
```

The command returns deterministic JSON and does not execute tests.

## Security boundary

Pull request metadata is treated as untrusted external input.

No PR title, body, label, reviewer name or GitHub text is interpolated into shell commands.

Runtime execution remains behind the existing explicit execution boundary.

## Known operational requirement

The local repository must contain the PR base/head commits or refs before semantic indexing can analyze them. GitHub stores PR refs remotely; local tooling can fetch the PR head ref before invoking the review flow.

## Validation baseline

Before 0.7.0 implementation:

- Typecheck: PASS.
- Build: PASS.
- Tests: 50 PASS.

Current implementation validation:

- Typecheck: PASS.
- Build: PASS.
- Tests: 53 PASS.

## Release Definition of Done

- [x] PR model.
- [x] PR ChangeSet.
- [x] Provider boundary.
- [x] GitHub metadata provider.
- [x] Review/check signals.
- [x] Semantic analysis.
- [x] Test intelligence.
- [x] Execution-plan integration.
- [x] GUI.
- [x] MCP.
- [x] CLI.
- [x] Regression and acceptance tests.
- [ ] README and architecture documentation updated.
- [ ] Changelog entry added.
- [ ] Release document completed.
- [ ] Version bumped to 0.7.0.
- [ ] Release gate passes.
- [ ] Final tag v0.7.0 created and pushed.

## Next milestone

After 0.7.0, the roadmap proceeds to 0.8.0 Unified Change Intelligence, where commit, branch and pull-request change sources converge into one unified review/query model without duplicating analysis logic.
