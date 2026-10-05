import type { GraphEdge, GraphSnapshot } from "../../domain/graph/model.js";
import { EdgeType } from "../../domain/graph/model.js";
import { Confidence, type Evidence } from "../../domain/evidence/model.js";
import { ImpactLevel, type Impact } from "../../domain/impact/model.js";

export interface ImpactRequest {
  readonly changedNodeIds: readonly string[];
  readonly targetTypes?: readonly GraphSnapshot["nodes"][number]["type"][];
}

export class ImpactEngine {
  analyze(snapshot: GraphSnapshot, request: ImpactRequest): readonly Impact[] {
    const reverse = new Map<string, GraphEdge[]>();
    for (const edge of snapshot.edges) {
      const list = reverse.get(edge.source) ?? [];
      list.push(edge);
      reverse.set(edge.source, list);
      if (isReverseDependency(edge.type)) {
        const incoming = reverse.get(edge.target) ?? [];
        incoming.push(edge);
        reverse.set(edge.target, incoming);
      }
    }
    const results = new Map<string, Impact>();
    const queue: Array<{ id: string; path: Array<{ nodeId: string; relation?: string }>; level: ImpactLevel; confidence: Confidence; evidence: Evidence[] }> =
      request.changedNodeIds.map(id => ({ id, path: [{ nodeId: id }], level: ImpactLevel.DIRECT, confidence: Confidence.EXACT, evidence: [] }));
    const seen = new Set<string>();
    while (queue.length) {
      const current = queue.shift()!;
      if (seen.has(current.id)) continue;
      seen.add(current.id);
      if (current.level !== ImpactLevel.DIRECT && (!request.targetTypes || request.targetTypes.includes(snapshot.nodes.find(n => n.id === current.id)?.type as any))) {
        results.set(current.id, { nodeId: current.id, level: current.level, confidence: current.confidence, path: current.path, evidence: current.evidence });
      }
      for (const edge of reverse.get(current.id) ?? []) {
        const forward = edge.type === EdgeType.CONFIGURES && edge.source === current.id;
        if (!forward && edge.source === current.id && !isReverseDependency(edge.type)) continue;
        const next = forward ? edge.target : edge.source;
        if (seen.has(next)) continue;
        queue.push({
          id: next,
          path: [...current.path, { nodeId: next, relation: edge.type }],
          level: forward ? ImpactLevel.CONFIG : edge.type === EdgeType.DEPENDS_ON ? ImpactLevel.DIRECT_DEPENDENCY : edge.type === EdgeType.TESTS ? ImpactLevel.INTEGRATION : ImpactLevel.DOWNSTREAM,
          confidence: minConfidence(current.confidence, edge.confidence),
          evidence: [...current.evidence, ...edge.evidence]
        });
      }
    }
    return [...results.values()];
  }
}

function isReverseDependency(type: GraphEdge["type"]): boolean {
  return [EdgeType.IMPORTS, EdgeType.CALLS, EdgeType.EXTENDS, EdgeType.IMPLEMENTS, EdgeType.DEPENDS_ON, EdgeType.TESTS, EdgeType.USES_FIXTURE, EdgeType.USES_SCHEMA].some(value => value === type);
}

function minConfidence(a: Confidence, b: Confidence): Confidence {
  const rank = { [Confidence.EXACT]: 4, [Confidence.HIGH]: 3, [Confidence.MEDIUM]: 2, [Confidence.LOW]: 1 };
  return rank[a] <= rank[b] ? a : b;
}
