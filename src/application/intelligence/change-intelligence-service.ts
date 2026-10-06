import type { ChangeSource, CommitChangeSet } from "../../domain/change-set.js";
import type { ChangeIntelligenceResult, UnifiedChange, ChangeRisk, ChangeUncertainty } from "../../domain/change-intelligence.js";
import type { GraphSnapshot } from "../../domain/graph/model.js";
import { diffSnapshots, changedSymbolIdsFromDiff, removedSymbolIdsFromDiff } from "../analysis/graph-diff.js";
import { ImpactEngine } from "../impact/impact-engine.js";
import { TestGapAnalyzer } from "../impact/test-gap-analyzer.js";
import { TestImpactAnalyzer } from "../impact/test-impact-analyzer.js";
import { buildExecutionPlan } from "../workflow/execution-plan-builder.js";

export interface ChangeIntelligenceInput {
  readonly source: ChangeSource;
  readonly baseSnapshot: GraphSnapshot;
  readonly headSnapshot: GraphSnapshot;
}

export class ChangeIntelligenceService {
  private readonly impact = new ImpactEngine();
  private readonly gaps = new TestGapAnalyzer();
  private readonly tests = new TestImpactAnalyzer();

  analyze(input: ChangeIntelligenceInput): ChangeIntelligenceResult {
    const diff = diffSnapshots(input.baseSnapshot, input.headSnapshot);
    const changedSymbolIds = [...new Set(changedSymbolIdsFromDiff(input.baseSnapshot, input.headSnapshot, diff))].sort();
    const removedSymbolIds = [...new Set(removedSymbolIdsFromDiff(input.baseSnapshot, input.headSnapshot, diff))].sort();
    const impact = this.impact.analyze(input.headSnapshot, {
      changedNodeIds: changedSymbolIds,
      targetTypes: ["Symbol"]
    });
    const affectedSymbolIds = [...new Set(impact.map(item => item.nodeId).filter(id => !changedSymbolIds.includes(id)))].sort();
    const testGaps = this.gaps.analyze(input.headSnapshot, { changedNodeIds: changedSymbolIds });
    const testImpact = this.tests.analyze(input.headSnapshot, {
      changedSymbolIds,
      coverageLinks: testGaps.coverageLinks
    });
    const executionPlan = buildExecutionPlan({
      repository: input.headSnapshot.repository,
      commit: input.headSnapshot.commit,
      nodes: input.headSnapshot.nodes,
      edges: input.headSnapshot.edges,
      impacts: testImpact.impacts
    });

    const uncertainty: ChangeUncertainty[] = [];
    const reasons: string[] = [];
    if (!changedSymbolIds.length && !removedSymbolIds.length) {
      uncertainty.push({ code: "NO_SYMBOL_CHANGE", message: "No changed or removed symbols were resolved from the graph diff.", confidence: "LOW" });
    }
    if (removedSymbolIds.length) {
      reasons.push(removedSymbolIds.length + " symbols were removed and require downstream review.");
      uncertainty.push({ code: "REMOVED_SYMBOLS", message: "Removed symbols are absent from the head graph and cannot be directly test-mapped.", confidence: "MEDIUM" });
    }
    const highGaps = testGaps.gaps.filter(gap => changedSymbolIds.includes(gap.symbolId) && gap.severity === "HIGH");
    if (highGaps.length) reasons.push(highGaps.length + " changed symbols have HIGH test gaps.");
    if (testGaps.unknown > 0) {
      reasons.push(testGaps.unknown + " testable areas have UNKNOWN coverage.");
      uncertainty.push({ code: "UNKNOWN_TEST_COVERAGE", message: testGaps.unknown + " testable areas have unknown coverage.", confidence: "LOW" });
    }
    const noCommand = executionPlan.steps.filter(step => step.status === "IMPACTED_NO_COMMAND");
    if (noCommand.length) reasons.push(noCommand.length + " impacted test projects have no runnable command.");
    const blocked = executionPlan.steps.filter(step => step.status === "BLOCKED");
    if (blocked.length) uncertainty.push({ code: "BLOCKED_EXECUTION", message: blocked.length + " execution steps are blocked by dependencies.", confidence: "MEDIUM" });
    if (affectedSymbolIds.length > Math.max(10, changedSymbolIds.length * 10)) reasons.push("Downstream impact exceeds the review threshold.");

    let risk: ChangeRisk = "LOW";
    if (!changedSymbolIds.length && !removedSymbolIds.length) risk = "UNKNOWN";
    else if (removedSymbolIds.length || highGaps.length || noCommand.length) risk = "HIGH";
    else if (testGaps.unknown > 0 || blocked.length || affectedSymbolIds.length > Math.max(10, changedSymbolIds.length * 10)) risk = "MEDIUM";

    const evidence = [
      ...input.source.commitEvidence?.flatMap(item => item.changedPaths.map(path => ({
        kind: "commit-change",
        filePath: path.path,
        details: { commit: item.commit, subject: item.subject }
      }))) ?? [],
      ...impact.flatMap(item => item.evidence)
    ];

    const intelligence: UnifiedChange = {
      schemaVersion: 1,
      source: input.source,
      base: input.source.base,
      head: input.source.head,
      mergeBase: input.source.mergeBase,
      changedPathCount: input.source.changedPaths.length,
      changedPaths: input.source.changedPaths,
      commits: input.source.commits,
      diff,
      changedSymbolIds,
      removedSymbolIds,
      impact,
      affectedSymbolIds,
      testGaps,
      testImpact,
      executionPlan,
      risk,
      reasons: [...new Set(reasons)],
      uncertainty,
      evidence
    };
    return { schemaVersion: 1, intelligence, deterministic: true };
  }
}

export function commitChangeSet(repository: string, commit: string, parent: string, changedPaths: CommitChangeSet["changedPaths"], commitEvidence: CommitChangeSet["commitEvidence"]): CommitChangeSet {
  return {
    repository,
    source: "COMMIT",
    base: parent,
    head: commit,
    mergeBase: parent,
    commits: [commit],
    changedPaths,
    ...(commitEvidence ? { commitEvidence } : {})
  };
}
