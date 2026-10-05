import { EdgeType, type GraphEdge } from "../../domain/graph/model.js";
import { Confidence } from "../../domain/evidence/model.js";
import { edgeId, stableId } from "../../domain/graph/ids.js";
import type { RepositoryPackage } from "../../domain/repository/discovery-model.js";

export function workspaceDependencyEdges(packages: readonly RepositoryPackage[], commit: string): GraphEdge[] {
  const byName = new Map(packages.map(p => [p.name, p]));
  const edges: GraphEdge[] = [];
  for (const pkg of packages) {
    for (const name of Object.keys(pkg.dependencies)) {
      const target = byName.get(name);
      if (!target) continue;
      edges.push({
        id: edgeId(stableId("package", pkg.name, pkg.rootPath), EdgeType.DEPENDS_ON, target.id, commit),
        source: pkg.id,
        target: target.id,
        type: EdgeType.DEPENDS_ON,
        confidence: Confidence.EXACT,
        evidence: [{ kind: "workspace-dependency", filePath: pkg.manifestPath, text: name }],
        sourceCommit: commit
      });
    }
  }
  return edges;
}
