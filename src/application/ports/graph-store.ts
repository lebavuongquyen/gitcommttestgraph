import type { GraphNode, GraphSnapshot } from "../../domain/graph/model.js";

export interface GraphQueryRequest {
  readonly nodeType?: GraphNode["type"];
  readonly packageId?: string;
  readonly filePath?: string;
}

export interface GraphQueryResult {
  readonly nodes: readonly GraphNode[];
}

export interface GraphSnapshotStore {
  saveSnapshot(snapshot: GraphSnapshot): Promise<void>;
  getSnapshot(repository: string, commit: string, analyzerVersion: string, configurationFingerprint: string): Promise<GraphSnapshot | null>;
}

export interface GraphNodeStore {
  getNode(id: string): Promise<GraphNode | null>;
  query(request: GraphQueryRequest): Promise<GraphQueryResult>;
}

export interface GraphStore extends GraphSnapshotStore, GraphNodeStore {
  listSnapshots(): Promise<readonly import("./snapshot-maintenance.js").SnapshotRecord[]>;
  checkConsistency(): Promise<readonly import("./snapshot-consistency.js").SnapshotConsistencyIssue[]>;
  rebuildManifestFromPhysicalSnapshots(): Promise<void>;
}
