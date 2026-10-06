import type { GraphSnapshot } from "../../domain/graph/model.js";
import type { PullRequestChangeSet } from "../../domain/change-set.js";
import type { PullRequestMetadata, PullRequestReview } from "../../domain/pull-request/model.js";
import { TestGapAnalyzer } from "../impact/test-gap-analyzer.js";
import { TestImpactAnalyzer } from "../impact/test-impact-analyzer.js";
import { ImpactEngine } from "../impact/impact-engine.js";
import { buildExecutionPlan } from "../workflow/execution-plan-builder.js";

export interface PullRequestReviewInput {
  readonly changeSet: PullRequestChangeSet;
  readonly pullRequest: PullRequestMetadata;
  readonly current: GraphSnapshot;
  readonly changedSymbolIds: readonly string[];
  readonly removedSymbolIds?: readonly string[];
}

export class PullRequestReviewService {
  private readonly gaps = new TestGapAnalyzer();
  private readonly tests = new TestImpactAnalyzer();
  private readonly impact = new ImpactEngine();

  analyze(input: PullRequestReviewInput): PullRequestReview {
    const changedSymbolIds = [...new Set(input.changedSymbolIds)].sort();
    const removedSymbolIds = [...new Set(input.removedSymbolIds ?? [])].sort();
    const testGaps = this.gaps.analyze(input.current, { changedNodeIds: changedSymbolIds });
    const testImpact = this.tests.analyze(input.current, { changedSymbolIds, coverageLinks: testGaps.coverageLinks });
    const affectedSymbolIds = this.impact.analyze(input.current, {
      changedNodeIds: changedSymbolIds,
      targetTypes: ["Symbol"]
    }).map(item => item.nodeId).filter(id => !changedSymbolIds.includes(id));

    const executionPlan = buildExecutionPlan({
      repository: input.current.repository,
      commit: input.current.commit,
      nodes: input.current.nodes,
      edges: input.current.edges,
      impacts: testImpact.impacts
    });

    const reasons: string[] = [];
    const uncertainty: string[] = [];
    const highGaps = testGaps.gaps.filter(gap => changedSymbolIds.includes(gap.symbolId) && gap.severity === "HIGH");
    const noCommand = executionPlan.steps.filter(step => step.status === "IMPACTED_NO_COMMAND");
    const blocked = executionPlan.steps.filter(step => step.status === "BLOCKED");
    const failedChecks = input.pullRequest.checks.filter(check => check.status === "COMPLETED" && ["FAILURE", "FAILED", "CANCELLED", "TIMED_OUT", "ACTION_REQUIRED"].includes(check.conclusion ?? ""));
    const pendingChecks = input.pullRequest.checks.filter(check => check.status !== "COMPLETED");
    const runnable = executionPlan.steps.filter(step => step.status === "RUNNABLE");

    if (!changedSymbolIds.length && !removedSymbolIds.length) uncertainty.push("No changed or removed symbols were resolved from the pull request graph diff.");
    if (input.pullRequest.draft) reasons.push("The pull request is still a draft.");
    if (input.pullRequest.mergeable === false) reasons.push("GitHub reports the pull request is not mergeable.");
    if (input.pullRequest.reviewState === "CHANGES_REQUESTED") reasons.push("A reviewer has requested changes.");
    if (input.pullRequest.reviewState === "COMMENTED") uncertainty.push("Review feedback exists without an approval decision.");
    if (input.pullRequest.reviewState === "PENDING" || input.pullRequest.reviewState === "UNKNOWN") uncertainty.push("No final approval decision is recorded.");
    if (failedChecks.length) reasons.push(failedChecks.length + " GitHub check(s) are failing or cancelled.");
    if (pendingChecks.length) uncertainty.push(pendingChecks.length + " GitHub check(s) are still pending.");
    if (!input.pullRequest.checks.length) uncertainty.push("No GitHub checks are recorded for the pull request head.");
    if (removedSymbolIds.length) {
      reasons.push(removedSymbolIds.length + " symbols were removed and require review of downstream consumers.");
      uncertainty.push("Removed symbols are absent from the head graph and cannot be directly test-mapped.");
    }
    if (highGaps.length) reasons.push(highGaps.length + " changed symbols have HIGH test gaps.");
    if (testGaps.unknown > 0) uncertainty.push(testGaps.unknown + " testable areas have UNKNOWN coverage.");
    if (noCommand.length) reasons.push(noCommand.length + " impacted test projects have no runnable command.");
    if (blocked.length) uncertainty.push(blocked.length + " execution steps are blocked by dependencies.");
    if (!runnable.length && testImpact.impactedTestCases > 0) uncertainty.push("Impacted tests exist but no runnable execution step is available.");
    if (affectedSymbolIds.length > changedSymbolIds.length * 10) reasons.push("The pull request has a broad downstream symbol impact.");

    let decision: PullRequestReview["decision"] = "READY";
    let risk: PullRequestReview["risk"] = "LOW";

    if (!input.changeSet.commits.length) {
      decision = "BLOCKED";
      risk = "UNKNOWN";
      reasons.push("The pull request contains no commits ahead of its base.");
    } else if (input.pullRequest.mergeable === false || input.pullRequest.reviewState === "CHANGES_REQUESTED" || failedChecks.length) {
      decision = "BLOCKED";
      risk = "HIGH";
    } else if (!changedSymbolIds.length && !removedSymbolIds.length) {
      decision = "INCONCLUSIVE";
      risk = "UNKNOWN";
    } else if (removedSymbolIds.length || highGaps.length || noCommand.length) {
      decision = "HIGH_RISK";
      risk = "HIGH";
    } else if (input.pullRequest.draft || pendingChecks.length || testGaps.unknown > 0 || blocked.length || uncertainty.length) {
      decision = "NEEDS_REVIEW";
      risk = "MEDIUM";
    } else if (affectedSymbolIds.length > Math.max(10, changedSymbolIds.length * 10)) {
      decision = "NEEDS_REVIEW";
      risk = "MEDIUM";
      reasons.push("Downstream impact exceeds the pull request review threshold.");
    }

    return {
      schemaVersion: 1,
      decision,
      risk,
      reasons,
      uncertainty,
      pullRequest: input.pullRequest,
      changeSet: input.changeSet,
      changedSymbolIds,
      removedSymbolIds,
      affectedSymbolIds: [...new Set(affectedSymbolIds)].sort(),
      testGaps,
      testImpact,
      executionPlan
    };
  }
}
