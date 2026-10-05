import type { GraphStore } from "../ports/graph-store.js";
import type { GraphNode, GraphSnapshot } from "../../domain/graph/model.js";

export class GraphQueryService {
  constructor(private readonly store: GraphStore) {}

  async getSnapshot(repository: string, commit: string, analyzerVersion: string, configurationFingerprint: string): Promise<GraphSnapshot | null> {
    return this.store.getSnapshot(repository, commit, analyzerVersion, configurationFingerprint);
  }

  async getNode(id: string): Promise<GraphNode | null> {
    return this.store.getNode(id);
  }

  async findByType(type: GraphNode["type"]): Promise<readonly GraphNode[]> {
    return (await this.store.query({ nodeType: type })).nodes;
  }
}
