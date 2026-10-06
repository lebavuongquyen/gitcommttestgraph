import type { GraphSnapshot } from "../../domain/graph/model.js";
import type { GraphNodeStore, GraphQueryRequest, GraphQueryResult, GraphSnapshotStore } from "../../application/ports/graph-store.js";

export interface GraphSnapshotReader {
  readonly snapshots: GraphSnapshotStore;
}

export interface GraphNodeReader {
  readonly nodes: GraphNodeStore;
}

export interface GraphQueryReader {
  query(request: GraphQueryRequest): Promise<GraphQueryResult>;
}

export interface GraphReadStore extends GraphSnapshotReader, GraphNodeReader, GraphQueryReader {}

export interface GraphSnapshotWriter {
  readonly snapshots: GraphSnapshotStore;
}

export interface GraphWriteStore extends GraphSnapshotWriter {}
