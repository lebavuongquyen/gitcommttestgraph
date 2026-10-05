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

function edgeKey(edge: { source: string; type: string; target: string }): string {
  return JSON.stringify([edge.source, edge.type, edge.target]);
}

export function diffSnapshots(from: GraphSnapshot, to: GraphSnapshot): GraphDiff {
  const fromNodes = new Map(from.nodes.map(n => [n.id, JSON.stringify(n.attributes)]));
  const toNodes = new Map(to.nodes.map(n => [n.id, JSON.stringify(n.attributes)]));
  const fromEdges = new Map(from.edges.map(edge => [edgeKey(edge), edge.id]));
  const toEdges = new Map(to.edges.map(edge => [edgeKey(edge), edge.id]));
  return {
    fromCommit: from.commit,
    toCommit: to.commit,
    addedNodes: [...toNodes.keys()].filter(id => !fromNodes.has(id)),
    removedNodes: [...fromNodes.keys()].filter(id => !toNodes.has(id)),
    changedNodes: [...toNodes.keys()].filter(id => fromNodes.has(id) && fromNodes.get(id) !== toNodes.get(id)),
    addedEdges: [...toEdges.entries()].filter(([key]) => !fromEdges.has(key)).map(([, id]) => id),
    removedEdges: [...fromEdges.entries()].filter(([key]) => !toEdges.has(key)).map(([, id]) => id)
  };
}

export function changedSymbolIdsFromDiff(from: GraphSnapshot, to: GraphSnapshot, diff: GraphDiff): readonly string[] {
  const changedNodeIds = new Set([...diff.addedNodes, ...diff.changedNodes]);
  const changedEdgeIds = new Set([...diff.addedEdges, ...diff.removedEdges]);
  const edgeNodeIds = new Set<string>();
  for (const edge of from.edges) if (changedEdgeIds.has(edge.id)) {
    edgeNodeIds.add(edge.source);
    edgeNodeIds.add(edge.target);
  }
  for (const edge of to.edges) if (changedEdgeIds.has(edge.id)) {
    edgeNodeIds.add(edge.source);
    edgeNodeIds.add(edge.target);
  }
  const ids = new Set([...changedNodeIds, ...edgeNodeIds]);
  return to.nodes.filter(node => node.type === "Symbol" && ids.has(node.id)).map(node => node.id).sort();
}

export function removedSymbolIdsFromDiff(from: GraphSnapshot, diff: GraphDiff): readonly string[] {
  const removed = new Set(diff.removedNodes);
  return from.nodes.filter(node => node.type === "Symbol" && removed.has(node.id)).map(node => node.id).sort();
}
