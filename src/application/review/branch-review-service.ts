import type { GraphSnapshot } from "../../domain/graph/model.js";
import type { BranchChangeSet } from "../../domain/change-set.js";
import type { BranchReview, ReviewDecision, ReviewRisk } from "../../domain/review/model.js";
import { TestGapAnalyzer } from "../impact/test-gap-analyzer.js";
import { TestImpactAnalyzer } from "../impact/test-impact-analyzer.js";
import { ImpactEngine } from "../impact/impact-engine.js";
import { buildExecutionPlan } from "../workflow/execution-plan-builder.js";

export interface BranchReviewInput {
  readonly changeSet: BranchChangeSet;
  readonly current: GraphSnapshot;
  readonly changedSymbolIds: readonly string[];
  readonly removedSymbolIds?: readonly string[];
}

export class BranchReviewService {
  private readonly gaps = new TestGapAnalyzer();
  private readonly tests = new TestImpactAnalyzer();
  private readonly impact = new ImpactEngine();

  analyze(input: BranchReviewInput): BranchReview {
    const changedSymbolIds = [...new Set(input.changedSymbolIds)].sort();
    const removedSymbolIds = [...new Set(input.removedSymbolIds ?? [])].sort();
    const testGaps = this.gaps.analyze(input.current, { changedNodeIds: changedSymbolIds });
    const testImpact = this.tests.analyze(input.current, {
      changedSymbolIds,
      coverageLinks: testGaps.coverageLinks
    });
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
    const runnable = executionPlan.steps.filter(step => step.status === "RUNNABLE");

    if (!changedSymbolIds.length && !removedSymbolIds.length) uncertainty.push("No changed or removed symbols were resolved from the branch graph diff.");
    if (removedSymbolIds.length) {
      reasons.push(removedSymbolIds.length + " symbols were removed and require review of their downstream consumers.");
      uncertainty.push("Removed symbols are absent from the head graph and cannot be directly test-mapped.");
    }
    if (highGaps.length) reasons.push(highGaps.length + " changed symbols have HIGH test gaps.");
    if (testGaps.unknown > 0) uncertainty.push(testGaps.unknown + " testable areas have UNKNOWN coverage.");
    if (noCommand.length) reasons.push(noCommand.length + " impacted test projects have no runnable command.");
    if (blocked.length) uncertainty.push(blocked.length + " execution steps are blocked by dependencies.");
    if (!runnable.length && testImpact.impactedTestCases > 0) uncertainty.push("Impacted tests exist but no runnable execution step is available.");
    if (affectedSymbolIds.length > changedSymbolIds.length * 10) reasons.push("The branch has a broad downstream symbol impact.");

    let decision: ReviewDecision = "READY";
    let risk: ReviewRisk = "LOW";

    if (!input.changeSet.commits.length) {
      decision = "BLOCKED";
      risk = "UNKNOWN";
      reasons.push("The branch contains no commits ahead of its base.");
    } else if (!changedSymbolIds.length && !removedSymbolIds.length) {
      decision = "INCONCLUSIVE";
      risk = "UNKNOWN";
    } else if (removedSymbolIds.length || highGaps.length || noCommand.length) {
      decision = "HIGH_RISK";
      risk = "HIGH";
    } else if (testGaps.unknown > 0 || blocked.length || uncertainty.length) {
      decision = "NEEDS_REVIEW";
      risk = "MEDIUM";
    } else if (affectedSymbolIds.length > Math.max(10, changedSymbolIds.length * 10)) {
      decision = "NEEDS_REVIEW";
      risk = "MEDIUM";
      reasons.push("Downstream impact exceeds the branch review threshold.");
    }

    return {
      schemaVersion: 1,
      decision,
      risk,
      reasons,
      uncertainty,
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
