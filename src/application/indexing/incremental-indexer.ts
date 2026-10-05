import { createSnapshot } from "../../domain/graph/snapshot.js";
import { edgeId } from "../../domain/graph/ids.js";
import { classifyFile, FileKind } from "../../domain/repository/file-classification.js";
import type { GraphSnapshot, GraphEdge } from "../../domain/graph/model.js";
import type { GitRepositoryPort } from "../ports/git.js";
import type { RepositoryIndexer, IndexOptions } from "./index-repository.js";

const REUSABLE_KINDS = new Set<FileKind>([
  FileKind.DOCUMENTATION,
  FileKind.ASSET,
  FileKind.RUNTIME_DATA,
  FileKind.GENERATED,
  FileKind.UNKNOWN
]);

export interface IncrementalIndexResult {
  readonly snapshot: GraphSnapshot;
  readonly reused: boolean;
  readonly incremental: boolean;
  readonly changedPaths: readonly string[];
}

export class IncrementalRepositoryIndexer {
  constructor(
    private readonly git: GitRepositoryPort,
    private readonly fullIndexer: RepositoryIndexer,
    private readonly loadSnapshot: (repository: string, commit: string, analyzerVersion: string, fingerprint: string) => Promise<GraphSnapshot | null>
  ) {}

  async index(options: IndexOptions, parentCommit?: string): Promise<IncrementalIndexResult> {
    const commit = await this.git.getCommit(options.commit);
    const parent = parentCommit ?? commit.parents[0];
    if (!parent) {
      const result = await this.fullIndexer.index(options);
      return { snapshot: result.snapshot, reused: result.reused, incremental: false, changedPaths: [] };
    }
    const changed = await this.git.getDiff(parent, options.commit);
    const changedPaths = changed.paths.flatMap(path => [path.path, ...(path.oldPath ? [path.oldPath] : [])]);
    if (!changedPaths.length || changedPaths.some(path => !REUSABLE_KINDS.has(classifyFile(path)))) {
      const result = await this.fullIndexer.index(options);
      return { snapshot: result.snapshot, reused: result.reused, incremental: false, changedPaths };
    }
    const fingerprint = createSnapshot({ analyzerVersion: options.analyzerVersion, repository: options.repository, commit: parent, configuration: options.configuration, nodes: [], edges: [] }).configurationFingerprint;
    const parentSnapshot = await this.loadSnapshot(options.repository, parent, options.analyzerVersion, fingerprint);
    if (!parentSnapshot) {
      const result = await this.fullIndexer.index(options);
      return { snapshot: result.snapshot, reused: result.reused, incremental: false, changedPaths };
    }
    const edges = parentSnapshot.edges.map(edge => remapEdge(edge, options.commit));
    const snapshot = createSnapshot({
      analyzerVersion: options.analyzerVersion,
      repository: options.repository,
      commit: options.commit,
      configuration: options.configuration,
      nodes: parentSnapshot.nodes,
      edges,
      metadata: { ...parentSnapshot.metadata, incremental: true, parentCommit: parent, reusedNodeCount: parentSnapshot.nodes.length, reusedEdgeCount: parentSnapshot.edges.length }
    });
    return { snapshot, reused: false, incremental: true, changedPaths };
  }
}

function remapEdge(edge: GraphEdge, commit: string): GraphEdge {
  return { ...edge, id: edgeId(edge.source, edge.type, edge.target, commit), sourceCommit: commit };
}
