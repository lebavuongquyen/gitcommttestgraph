import { NodeType, type GraphSnapshot } from "../../domain/graph/model.js";
import type { TestImpact, TestImpactRelation, TestImpactSummary } from "../../domain/impact/test-impact.js";
import type { TestCoverageLink } from "../../domain/impact/test-gap.js";
import { ImpactEngine } from "./impact-engine.js";

export interface TestImpactRequest {
  readonly changedSymbolIds: readonly string[];
  readonly coverageLinks: readonly TestCoverageLink[];
}

export class TestImpactAnalyzer {
  private readonly impactEngine = new ImpactEngine();

  analyze(snapshot: GraphSnapshot, request: TestImpactRequest): TestImpactSummary {
    const nodes = new Map(snapshot.nodes.map(node => [node.id, node]));
    const changed = new Set(request.changedSymbolIds);
    const affected = this.impactEngine.analyze(snapshot, {
      changedNodeIds: request.changedSymbolIds,
      targetTypes: [NodeType.SYMBOL]
    });
    const affectedIds = new Set([...changed, ...affected.map(item => item.nodeId)]);
    const links = request.coverageLinks.filter(link => affectedIds.has(link.symbolId));
    const impacts: TestImpact[] = [];

    for (const link of links) {
      const testCase = nodes.get(link.testCaseId);
      if (!testCase || testCase.type !== NodeType.TEST_CASE) continue;
      const testFileId = String(testCase.attributes.testFileId ?? "");
      const testFile = nodes.get(testFileId);
      if (!testFile || testFile.type !== NodeType.TEST_FILE) continue;
      const testProjectId = String(testFile.attributes.testProjectId ?? "");
      const project = nodes.get(testProjectId);
      if (!project || project.type !== NodeType.TEST_PROJECT) continue;
      const command = readCommand(project);
      const relation: TestImpactRelation = changed.has(link.symbolId)
        ? "DIRECT"
        : link.coverage === "DIRECT" ? "INDIRECT" : "INDIRECT";
      impacts.push({
        testProjectId,
        testFileId: testFile.id,
        testCaseId: testCase.id,
        ...(command ? { testCommand: command } : {}),
        relation,
        changedSymbolIds: request.changedSymbolIds,
        affectedSymbolIds: [link.symbolId],
        evidence: link.evidence
      });
    }

    const unique = dedupeImpacts(impacts);
    const runnableCommands = [...new Map(
      unique
        .filter(item => item.testCommand)
        .map(item => [item.testProjectId, { testProjectId: item.testProjectId, ...item.testCommand! }])
    ).values()].sort((a, b) => a.testProjectId.localeCompare(b.testProjectId));

    return {
      changedSymbols: changed.size,
      affectedSymbols: affectedIds.size,
      impactedTestCases: new Set(unique.map(item => item.testCaseId)).size,
      impactedTestFiles: new Set(unique.map(item => item.testFileId)).size,
      impactedTestProjects: new Set(unique.map(item => item.testProjectId)).size,
      runnableCommands,
      impacts: unique
    };
  }
}

function readCommand(node: { attributes: Readonly<Record<string, unknown>> }) {
  const value = node.attributes.testCommand;
  if (!value || typeof value !== "object") return undefined;
  const command = value as Record<string, unknown>;
  if (typeof command.executable !== "string" || !Array.isArray(command.args) || typeof command.cwd !== "string") return undefined;
  return {
    executable: command.executable,
    args: command.args.filter((arg): arg is string => typeof arg === "string"),
    cwd: command.cwd
  };
}

function dedupeImpacts(items: readonly TestImpact[]): TestImpact[] {
  const map = new Map<string, TestImpact>();
  for (const item of items) {
    const key = [item.testCaseId, item.testProjectId, item.relation, ...item.affectedSymbolIds].join("|");
    const existing = map.get(key);
    if (!existing) {
      map.set(key, item);
      continue;
    }
    map.set(key, {
      ...existing,
      changedSymbolIds: [...new Set([...existing.changedSymbolIds, ...item.changedSymbolIds])],
      affectedSymbolIds: [...new Set([...existing.affectedSymbolIds, ...item.affectedSymbolIds])],
      evidence: mergeEvidence(existing.evidence, item.evidence)
    });
  }
  return [...map.values()].sort((a, b) =>
    a.testProjectId.localeCompare(b.testProjectId) ||
    a.testFileId.localeCompare(b.testFileId) ||
    a.testCaseId.localeCompare(b.testCaseId) ||
    a.relation.localeCompare(b.relation)
  );
}

function mergeEvidence(a: TestImpact["evidence"], b: TestImpact["evidence"]) {
  const map = new Map<string, TestImpact["evidence"][number]>();
  for (const item of [...a, ...b]) map.set(JSON.stringify(item), item);
  return [...map.values()];
}
