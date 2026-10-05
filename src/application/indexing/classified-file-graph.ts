import { EdgeType, NodeType, type GraphEdge, type GraphNode } from "../../domain/graph/model.js";
import { Confidence } from "../../domain/evidence/model.js";
import { edgeId, stableId } from "../../domain/graph/ids.js";
import { FileKind, classifyFile } from "../../domain/repository/file-classification.js";

export interface ClassifiedGraphInput {
  readonly files: readonly string[];
  readonly packages: readonly { id: string; rootPath: string }[];
  readonly commit: string;
}

export function buildClassifiedFileGraph(input: ClassifiedGraphInput): { nodes: GraphNode[]; edges: GraphEdge[] } {
  const nodes: GraphNode[] = [];
  const edges: GraphEdge[] = [];
  for (const path of input.files) {
    const kind = classifyFile(path);
    if (kind === FileKind.SOURCE || kind === FileKind.TEST || kind === FileKind.GENERATED || kind === FileKind.ASSET || kind === FileKind.DOCUMENTATION || kind === FileKind.RUNTIME_DATA || kind === FileKind.UNKNOWN) continue;
    const id = stableId("file", normalize(path));
    const type = kind === FileKind.SCHEMA ? NodeType.SCHEMA : kind === FileKind.FIXTURE ? NodeType.FIXTURE : NodeType.CONFIG;
    nodes.push({ id, type, attributes: { path: normalize(path), kind } });
    const pkg = input.packages.find(item => isInsidePackage(normalize(path), item.rootPath));
    if (pkg) {
      edges.push(edge(pkg.id, EdgeType.CONTAINS, id, input.commit, path, "package-classified-file"));
      if (type === NodeType.CONFIG) edges.push(edge(id, EdgeType.CONFIGURES, pkg.id, input.commit, path, "configures-package"));
    }
  }
  return { nodes, edges };
}

function edge(source: string, type: EdgeType, target: string, commit: string, filePath: string, kind: string): GraphEdge {
  return { id: edgeId(source, type, target, commit), source, target, type, confidence: Confidence.EXACT, evidence: [{ kind, filePath }], sourceCommit: commit };
}
function normalize(path: string): string { return path.replaceAll("\\", "/"); }
function isInsidePackage(path: string, rootPath: string): boolean { return rootPath === "." || path === rootPath || path.startsWith(rootPath + "/"); }
