import type { GraphSnapshot } from "../../domain/graph/model.js";

export interface GraphDiff {
  readonly fromCommit: string;
  readonly toCommit: string;
  readonly addedNodes: readonly string[];
  readonly removedNodes: readonly string[];
  readonly changedNodes: readonly string[];
  readonly addedEdges: readonly string[];
  readonly removedEdges: readonly string[];
}

export function diffSnapshots(from: GraphSnapshot, to: GraphSnapshot): GraphDiff {
  const fromNodes = new Map(from.nodes.map(n => [n.id, JSON.stringify(n.attributes)]));
  const toNodes = new Map(to.nodes.map(n => [n.id, JSON.stringify(n.attributes)]));
  const fromEdges = new Set(from.edges.map(e => e.id));
  const toEdges = new Set(to.edges.map(e => e.id));
  return {
    fromCommit: from.commit,
    toCommit: to.commit,
    addedNodes: [...toNodes.keys()].filter(id => !fromNodes.has(id)),
    removedNodes: [...fromNodes.keys()].filter(id => !toNodes.has(id)),
    changedNodes: [...toNodes.keys()].filter(id => fromNodes.has(id) && fromNodes.get(id) !== toNodes.get(id)),
    addedEdges: [...toEdges].filter(id => !fromEdges.has(id)),
    removedEdges: [...fromEdges].filter(id => !toEdges.has(id))
  };
}
