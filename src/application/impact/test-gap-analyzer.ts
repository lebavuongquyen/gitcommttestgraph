import { EdgeType, NodeType, type GraphEdge, type GraphSnapshot } from "../../domain/graph/model.js";
import type { TestGap, TestGapSeverity, TestCoverageKind, TestGapSummary } from "../../domain/impact/test-gap.js";

export interface TestGapRequest {
  readonly changedNodeIds?: readonly string[];
  readonly packageId?: string;
}

type Coverage = { kind: TestCoverageKind; evidence: any[]; testFiles: Set<string> };

export class TestGapAnalyzer {
  analyze(snapshot: GraphSnapshot, request: TestGapRequest = {}): TestGapSummary {
    const nodes = new Map(snapshot.nodes.map(node => [node.id, node]));
    const testSourceIds = new Set(snapshot.nodes.filter(node => node.type === NodeType.TEST_FILE).map(node => String(node.attributes.fileId)));
    const outgoing = buildOutgoing(snapshot.edges);
    const coverage = new Map<string, Coverage>();
    for (const testSourceId of testSourceIds) walkFromTestFile(testSourceId, outgoing, nodes, coverage);

    const allSymbolNodes = snapshot.nodes.filter(node => node.type === NodeType.SYMBOL);
    const symbolNodes = allSymbolNodes.filter(symbol => {
      if (!request.packageId) return true;
      const fileNode = nodes.get(String(symbol.attributes.fileId));
      return fileNode?.attributes.packageId === request.packageId;
    });
    const gaps: TestGap[] = [];
    let tested = 0;
    let indirectlyTested = 0;

    for (const symbol of symbolNodes) {
      if (testSourceIds.has(String(symbol.attributes.fileId))) continue;
      const fileNode = nodes.get(String(symbol.attributes.fileId));
      const filePath = String(fileNode?.attributes.path ?? "");
      const packageId = typeof fileNode?.attributes.packageId === "string" ? fileNode.attributes.packageId : undefined;
      const found = coverage.get(symbol.id);
      if (found) {
        if (found.kind === "DIRECT") tested++;
        else indirectlyTested++;
        continue;
      }
      const fanIn = snapshot.edges.filter(edge => edge.target === symbol.id && isDependencyEdge(edge.type)).length;
      gaps.push({
        symbolId: symbol.id,
        filePath,
        symbolName: String(symbol.attributes.name ?? symbol.id),
        ...(packageId ? { packageId } : {}),
        severity: scoreSeverity(symbol, fanIn, request.changedNodeIds?.includes(symbol.id) ?? false),
        coverage: "UNTESTED",
        evidence: [],
        suggestedTestFiles: suggestTests(snapshot, filePath, packageId)
      });
    }

    gaps.sort((a, b) => severityRank(b.severity) - severityRank(a.severity) || a.filePath.localeCompare(b.filePath) || a.symbolName.localeCompare(b.symbolName));
    return { symbols: symbolNodes.length, tested, indirectlyTested, untested: gaps.length, unknown: 0, gaps };
  }
}

function walkFromTestFile(start: string, outgoing: Map<string, GraphEdge[]>, nodes: Map<string, GraphSnapshot["nodes"][number]>, coverage: Map<string, Coverage>): void {
  const queue: Array<{ id: string; depth: number; evidence: any[] }> = [{ id: start, depth: 0, evidence: [] }];
  const seen = new Set<string>();
  while (queue.length) {
    const current = queue.shift()!;
    const key = current.id + ":" + current.depth;
    if (seen.has(key) || current.depth > 3) continue;
    seen.add(key);
    const node = nodes.get(current.id);
    if (node?.type === NodeType.SYMBOL && current.id !== start) {
      const kind: TestCoverageKind = current.depth === 1 ? "DIRECT" : "INDIRECT";
      const existing = coverage.get(current.id);
      if (!existing || (existing.kind === "INDIRECT" && kind === "DIRECT")) {
        coverage.set(current.id, { kind, evidence: current.evidence, testFiles: new Set([start]) });
      }
    }
    for (const edge of outgoing.get(current.id) ?? []) {
      if (!isTestTraversalEdge(edge.type) || !nodes.has(edge.target)) continue;
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

function isTestTraversalEdge(type: GraphEdge["type"]): boolean {
  return type === EdgeType.CALLS || type === EdgeType.IMPORTS || type === EdgeType.EXPORTS;
}

function scoreSeverity(symbol: GraphSnapshot["nodes"][number], fanIn: number, changed: boolean): TestGapSeverity {
  const exported = symbol.attributes.exported === true;
  const kind = String(symbol.attributes.kind ?? "").toLowerCase();
  if (changed || (exported && fanIn >= 2) || (exported && ["function", "method", "class"].includes(kind))) return "HIGH";
  if (exported || fanIn >= 1) return "MEDIUM";
  return "LOW";
}

function severityRank(value: TestGapSeverity): number {
  return value === "HIGH" ? 3 : value === "MEDIUM" ? 2 : 1;
}

function suggestTests(snapshot: GraphSnapshot, filePath: string, packageId?: string): string[] {
  const directory = filePath.split("/").slice(0, -1).join("/");
  return snapshot.nodes
    .filter(node => node.type === NodeType.TEST_FILE)
    .filter(node => !packageId || node.attributes.packageId === packageId || !node.attributes.packageId)
    .map(node => String(node.attributes.path))
    .filter(path => directory.length > 0 && path.startsWith(directory))
    .slice(0, 5);
}
