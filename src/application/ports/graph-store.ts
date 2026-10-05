import type { GraphNode, GraphSnapshot } from "../../domain/graph/model.js";

export interface GraphQueryRequest {
  readonly nodeType?: GraphNode["type"];
  readonly packageId?: string;
  readonly filePath?: string;
}

export interface GraphQueryResult {
  readonly nodes: readonly GraphNode[];
}

export interface GraphStore {
  saveSnapshot(snapshot: GraphSnapshot): Promise<void>;
  getSnapshot(repository: string, commit: string, analyzerVersion: string, configurationFingerprint: string): Promise<GraphSnapshot | null>;
  getNode(id: string): Promise<GraphNode | null>;
  query(request: GraphQueryRequest): Promise<GraphQueryResult>;
}
