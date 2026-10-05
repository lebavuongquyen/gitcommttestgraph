import { EdgeType, NodeType, type GraphEdge, type GraphNode, type GraphSnapshot } from "../../domain/graph/model.js";
import type { Evidence } from "../../domain/evidence/model.js";
import type { TestGap, TestGapSeverity, TestCoverageKind, TestGapSummary, TestCoverageLink } from "../../domain/impact/test-gap.js";

export interface TestGapRequest {
  readonly changedNodeIds?: readonly string[];
  readonly packageId?: string;
}

type Coverage = {
  kind: TestCoverageKind;
  evidence: readonly Evidence[];
  testFiles: Set<string>;
  testCases: Set<string>;
};

type TestCaseRange = { id: string; startLine: number; endLine: number; title: string };

const TESTABLE_KINDS = new Set(["function", "class", "method"]);
const TRAVERSAL_EDGES: ReadonlySet<GraphEdge["type"]> = new Set([EdgeType.CALLS, EdgeType.IMPORTS, EdgeType.EXPORTS]);

export class TestGapAnalyzer {
  analyze(snapshot: GraphSnapshot, request: TestGapRequest = {}): TestGapSummary {
    const nodes = new Map(snapshot.nodes.map(node => [node.id, node]));
    const testFiles = snapshot.nodes.filter(node => node.type === NodeType.TEST_FILE);
    const genericScriptPackages = new Set(
      snapshot.nodes
        .filter(node => node.type === NodeType.TEST_PROJECT && node.attributes.framework === "generic-script")
        .map(node => String(node.attributes.packageId ?? ""))
        .filter(Boolean)
    );
    const outgoing = buildOutgoing(snapshot.edges);
    const coverage = new Map<string, Coverage>();

    for (const testFile of testFiles) {
      const sourceId = String(testFile.attributes.fileId);
      const cases = snapshot.nodes
        .filter(node => node.type === NodeType.TEST_CASE && node.attributes.testFileId === testFile.id)
        .map(node => ({
          id: node.id,
          startLine: Number(node.attributes.startLine ?? 0),
          endLine: Number(node.attributes.endLine ?? Number.MAX_SAFE_INTEGER),
          title: String(node.attributes.title ?? node.id)
        }));
      walkFromTestFile(sourceId, String(testFile.attributes.path ?? ""), cases, outgoing, nodes, coverage);
    }

    const symbolNodes = snapshot.nodes
      .filter(node => node.type === NodeType.SYMBOL)
      .filter(symbol => TESTABLE_KINDS.has(String(symbol.attributes.kind ?? "").toLowerCase()))
      .filter(symbol => {
        if (!request.packageId) return true;
        const fileNode = nodes.get(String(symbol.attributes.fileId));
        return fileNode?.attributes.packageId === request.packageId;
      });

    const coverageLinks: TestCoverageLink[] = [];
    for (const [symbolId, item] of coverage) {
      for (const testCaseId of item.testCases) {
        coverageLinks.push({
          testCaseId,
          symbolId,
          coverage: item.kind === "DIRECT" ? "DIRECT" : "INDIRECT",
          evidence: item.evidence
        });
      }
    }
    coverageLinks.sort((a, b) => a.testCaseId.localeCompare(b.testCaseId) || a.symbolId.localeCompare(b.symbolId));

    const gaps: TestGap[] = [];
    let tested = 0;
    let indirectlyTested = 0;
    let unknown = 0;

    for (const symbol of symbolNodes) {
      const fileNode = nodes.get(String(symbol.attributes.fileId));
      const filePath = String(fileNode?.attributes.path ?? "");
      const packageId = typeof fileNode?.attributes.packageId === "string" ? fileNode.attributes.packageId : undefined;
      const found = coverage.get(symbol.id);

      if (found?.kind === "DIRECT") {
        tested++;
        continue;
      }
      if (found?.kind === "INDIRECT") {
        indirectlyTested++;
        continue;
      }
      if (packageId && genericScriptPackages.has(packageId)) {
        unknown++;
        continue;
      }

      const fanIn = snapshot.edges.filter(edge => edge.target === symbol.id && isDependencyEdge(edge.type)).length;
      const changed = request.changedNodeIds?.includes(symbol.id) ?? false;
      gaps.push({
        symbolId: symbol.id,
        filePath,
        symbolName: String(symbol.attributes.name ?? symbol.id),
        ...(packageId ? { packageId } : {}),
        severity: scoreSeverity(symbol, fanIn, changed),
        coverage: "UNTESTED",
        evidence: [],
        suggestedTestFiles: suggestTests(testFiles, filePath, packageId)
      });
    }

    gaps.sort((a, b) => severityRank(b.severity) - severityRank(a.severity) || a.filePath.localeCompare(b.filePath) || a.symbolName.localeCompare(b.symbolName));

    return { symbols: symbolNodes.length, tested, indirectlyTested, untested: gaps.length, unknown, coverageLinks, gaps };
  }
}

function walkFromTestFile(
  start: string,
  testPath: string,
  cases: readonly TestCaseRange[],
  outgoing: Map<string, GraphEdge[]>,
  nodes: Map<string, GraphNode>,
  coverage: Map<string, Coverage>
): void {
  const queue: Array<{ id: string; depth: number; evidence: Evidence[] }> = [{ id: start, depth: 0, evidence: [] }];
  const seen = new Set<string>();

  while (queue.length) {
    const current = queue.shift()!;
    const key = current.id + ":" + current.depth;
    if (seen.has(key) || current.depth > 3) continue;
    seen.add(key);

    const node = nodes.get(current.id);
    if (node?.type === NodeType.SYMBOL && current.id !== start) {
      const kind: TestCoverageKind = current.depth === 1 ? "DIRECT" : "INDIRECT";
      const relatedCases = new Set(
        current.evidence.flatMap(evidence => {
          const line = evidence.startLine ?? evidence.endLine;
          if (line == null) return [];
          return cases.filter(testCase => line >= testCase.startLine && line <= testCase.endLine).map(testCase => testCase.id);
        })
      );
      const existing = coverage.get(current.id);
      if (!existing || (existing.kind === "INDIRECT" && kind === "DIRECT")) {
        coverage.set(current.id, {
          kind,
          evidence: current.evidence,
          testFiles: new Set([testPath]),
          testCases: relatedCases
        });
      } else {
        existing.testFiles.add(testPath);
        for (const testCase of relatedCases) existing.testCases.add(testCase);
      }
    }

    for (const edge of outgoing.get(current.id) ?? []) {
      if (!TRAVERSAL_EDGES.has(edge.type) || !nodes.has(edge.target)) continue;
      queue.push({ id: edge.target, depth: current.depth + 1, evidence: [...current.evidence, ...edge.evidence] });
    }
  }
}

function buildOutgoing(edges: readonly GraphEdge[]): Map<string, GraphEdge[]> {
  const result = new Map<string, GraphEdge[]>();
  for (const edge of edges) {
    const list = result.get(edge.source) ?? [];
    list.push(edge);
    result.set(edge.source, list);
  }
  return result;
}

function isDependencyEdge(type: GraphEdge["type"]): boolean {
  return type === EdgeType.CALLS || type === EdgeType.IMPORTS;
}

function scoreSeverity(symbol: GraphNode, fanIn: number, changed: boolean): TestGapSeverity {
  const exported = symbol.attributes.exported === true;
  const kind = String(symbol.attributes.kind ?? "").toLowerCase();
  if (changed && TESTABLE_KINDS.has(kind)) return "HIGH";
  if (exported && fanIn >= 2) return "HIGH";
  if (exported) return "MEDIUM";
  if (fanIn >= 1) return "MEDIUM";
  return "LOW";
}

function severityRank(value: TestGapSeverity): number {
  return value === "HIGH" ? 3 : value === "MEDIUM" ? 2 : 1;
}

function suggestTests(testFiles: readonly GraphNode[], filePath: string, packageId?: string): string[] {
  const directory = filePath.split("/").slice(0, -1).join("/");
  return testFiles
    .filter(node => !packageId || node.attributes.packageId === packageId)
    .map(node => String(node.attributes.path ?? ""))
    .map(path => ({ path, score: testPathScore(path, filePath, directory) }))
    .filter(item => item.score > 0)
    .sort((a, b) => b.score - a.score || a.path.localeCompare(b.path))
    .slice(0, 5)
    .map(item => item.path);
}

function testPathScore(path: string, filePath: string, directory: string): number {
  const targetBase = filePath.split("/").pop()?.replace(/\.[^.]+$/, "") ?? "";
  const sameDirectory = directory.length > 0 && path.startsWith(directory + "/");
  const sameBase = targetBase.length > 0 && path.includes(targetBase);
  const conventional = /\.(test|spec)\.(?:[cm]?[jt]sx?|mjs|cjs)$/i.test(path);
  return (sameDirectory ? 4 : 0) + (sameBase ? 3 : 0) + (conventional ? 1 : 0);
}
