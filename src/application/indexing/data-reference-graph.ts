import { EdgeType, NodeType, type GraphEdge, type GraphNode } from "../../domain/graph/model.js";
import { Confidence } from "../../domain/evidence/model.js";
import { edgeId, stableId } from "../../domain/graph/ids.js";
import { FileKind, classifyFile } from "../../domain/repository/file-classification.js";

export interface DataReferenceInput {
  readonly files: readonly string[];
  readonly contents: ReadonlyMap<string, string>;
  readonly commit: string;
}

export function buildDataReferenceGraph(input: DataReferenceInput): { nodes: GraphNode[]; edges: GraphEdge[] } {
  const targets = input.files.map(path => ({ path: normalize(path), kind: classifyFile(path) }))
    .filter(item => item.kind === FileKind.FIXTURE || item.kind === FileKind.SCHEMA);
  const nodes: GraphNode[] = targets.map(item => ({
    id: stableId("file", item.path),
    type: item.kind === FileKind.FIXTURE ? NodeType.FIXTURE : NodeType.SCHEMA,
    attributes: { path: item.path, kind: item.kind }
  }));
  const edges: GraphEdge[] = [];
  for (const [sourcePath, content] of input.contents) {
    const sourceKind = classifyFile(sourcePath);
    if (sourceKind !== FileKind.TEST && sourceKind !== FileKind.SOURCE) continue;
    for (const target of targets) {
      const base = target.path.split("/").pop() ?? target.path;
      if (!content.includes(base) && !content.includes(target.path)) continue;
      const type = target.kind === FileKind.FIXTURE ? EdgeType.USES_FIXTURE : EdgeType.USES_SCHEMA;
      edges.push({ id: edgeId(stableId("file", sourcePath), type, stableId("file", target.path), input.commit), source: stableId("file", sourcePath), target: stableId("file", target.path), type, confidence: Confidence.MEDIUM, evidence: [{ kind: "text-reference", filePath: sourcePath }], sourceCommit: input.commit });
    }
  }
  return { nodes, edges: [...new Map(edges.map(edge => [edge.id, edge])).values()] };
}

function normalize(path: string): string { return path.replaceAll("\\", "/"); }
