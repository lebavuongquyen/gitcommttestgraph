import { createSnapshot } from "../../domain/graph/snapshot.js";
import { NodeType, type GraphNode, type GraphEdge } from "../../domain/graph/model.js";
import { stableId } from "../../domain/graph/ids.js";
import type { GitRepositoryPort } from "../ports/git.js";
import type { GraphStore } from "../ports/graph-store.js";
import type { SourceAnalyzer } from "../ports/source-analyzer.js";

export interface IndexOptions {
  readonly repository: string;
  readonly commit: string;
  readonly configuration: unknown;
  readonly analyzerVersion: string;
}

export class RepositoryIndexer {
  constructor(
    private readonly git: GitRepositoryPort,
    private readonly analyzer: SourceAnalyzer,
    private readonly store: GraphStore
  ) {}

  async index(options: IndexOptions) {
    const fingerprintSnapshot = createSnapshot({
      analyzerVersion: options.analyzerVersion,
      repository: options.repository,
      commit: options.commit,
      configuration: options.configuration,
      nodes: [],
      edges: []
    });
    const cached = await this.store.getSnapshot(options.repository, options.commit, options.analyzerVersion, fingerprintSnapshot.configurationFingerprint);
    if (cached) return { snapshot: cached, reused: true };

    const files = await this.git.listFilesAtCommit(options.commit);
    const nodes: GraphNode[] = [{
      id: stableId("repository", options.repository),
      type: NodeType.REPOSITORY,
      attributes: { root: options.repository }
    }];
    const edges: GraphEdge[] = [];
    for (const path of files) {
      if (!isAnalyzable(path)) continue;
      const content = await this.git.readFileAtCommit(options.commit, path);
      const analysis = this.analyzer.analyze({ path, content }, options.commit);
      nodes.push(...analysis.nodes);
      edges.push(...analysis.edges);
    }
    const snapshot = createSnapshot({
      analyzerVersion: options.analyzerVersion,
      repository: options.repository,
      commit: options.commit,
      configuration: options.configuration,
      nodes,
      edges
    });
    await this.store.saveSnapshot(snapshot);
    return { snapshot, reused: false };
  }
}

function isAnalyzable(path: string): boolean {
  if (/(^|\\|\/)(node_modules|\.git|dist|build|coverage|\.next)(\\|\/)/.test(path)) return false;
  return /\.(ts|tsx|js|jsx|mjs|cjs)$/.test(path);
}
