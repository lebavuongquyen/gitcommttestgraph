import { createSnapshot } from "../../domain/graph/snapshot.js";
import { EdgeType, NodeType, type GraphSnapshot } from "../../domain/graph/model.js";
import { classifyFile, FileKind } from "../../domain/repository/file-classification.js";
import type { GitRepositoryPort } from "../ports/git.js";
import type { RepositoryIndexer, IndexOptions } from "./index-repository.js";

const REUSABLE_KINDS = new Set<FileKind>([
  FileKind.DOCUMENTATION,
  FileKind.ASSET,
  FileKind.RUNTIME_DATA,
  FileKind.GENERATED,
  FileKind.UNKNOWN
]);

const SEMANTIC_REVERSE_EDGES = new Set<EdgeType>([
  EdgeType.IMPORTS,
  EdgeType.CALLS,
  EdgeType.EXPORTS,
  EdgeType.EXTENDS,
  EdgeType.IMPLEMENTS
]);

export interface IncrementalIndexResult {
  readonly snapshot: GraphSnapshot;
  readonly reused: boolean;
  readonly incremental: boolean;
  readonly changedPaths: readonly string[];
  readonly analyzedPaths: readonly string[];
  readonly reusedPaths: readonly string[];
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

    if (!parent) return this.full(options, []);

    const changed = await this.git.getDiff(parent, options.commit);
    const changedPaths = unique(changed.paths.flatMap(path => [path.path, ...(path.oldPath ? [path.oldPath] : [])]).map(normalize));

    if (!changedPaths.length || changedPaths.some(path => !REUSABLE_KINDS.has(classifyFile(path)) && !isSource(path))) {
      return this.full(options, changedPaths);
    }

    const fingerprint = createSnapshot({
      analyzerVersion: options.analyzerVersion,
      repository: options.repository,
      commit: parent,
      configuration: options.configuration,
      nodes: [],
      edges: []
    }).configurationFingerprint;

    const parentSnapshot = await this.loadSnapshot(options.repository, parent, options.analyzerVersion, fingerprint);
    if (!parentSnapshot) return this.full(options, changedPaths);

    const sourceChanged = changedPaths.filter(isSource);
    if (!sourceChanged.length) {
      const result = await this.fullIndexer.index(options);
      return {
        snapshot: result.snapshot,
        reused: result.reused,
        incremental: true,
        changedPaths,
        analyzedPaths: [],
        reusedPaths: sourcePaths(result.snapshot)
      };
    }

    const analyzedPaths = computeImpactedPaths(parentSnapshot, sourceChanged);
    const result = await this.fullIndexer.index({
      ...options,
      semanticAnalysisPaths: analyzedPaths,
      incrementalParentSnapshot: parentSnapshot
    });

    return {
      snapshot: result.snapshot,
      reused: result.reused,
      incremental: true,
      changedPaths,
      analyzedPaths,
      reusedPaths: sourcePaths(result.snapshot).filter(path => !analyzedPaths.includes(path))
    };
  }

  private async full(options: IndexOptions, changedPaths: readonly string[]): Promise<IncrementalIndexResult> {
    const result = await this.fullIndexer.index(options);
    return {
      snapshot: result.snapshot,
      reused: result.reused,
      incremental: false,
      changedPaths,
      analyzedPaths: sourcePaths(result.snapshot),
      reusedPaths: []
    };
  }
}

function computeImpactedPaths(snapshot: GraphSnapshot, changedPaths: readonly string[]): string[] {
  const filePathById = new Map<string, string>();
  const symbolOwnerById = new Map<string, string>();

  for (const node of snapshot.nodes) {
    if (node.type === NodeType.FILE && typeof node.attributes.path === "string") {
      filePathById.set(node.id, normalize(String(node.attributes.path)));
    }
  }
  for (const node of snapshot.nodes) {
    if (node.type === NodeType.SYMBOL && typeof node.attributes.fileId === "string") {
      const owner = filePathById.get(String(node.attributes.fileId));
      if (owner) symbolOwnerById.set(node.id, owner);
    }
  }

  const owner = (id: string): string | undefined => filePathById.get(id) ?? symbolOwnerById.get(id);
  const impacted = new Set(changedPaths.map(normalize));
  const queue = [...impacted];

  while (queue.length) {
    const targetPath = queue.shift()!;
    for (const edge of snapshot.edges) {
      if (!SEMANTIC_REVERSE_EDGES.has(edge.type)) continue;
      if (owner(edge.target) !== targetPath) continue;
      const sourcePath = owner(edge.source);
      if (!sourcePath || impacted.has(sourcePath)) continue;
      impacted.add(sourcePath);
      queue.push(sourcePath);
    }
  }

  return [...impacted].sort();
}

function sourcePaths(snapshot: GraphSnapshot): string[] {
  return snapshot.nodes
    .filter(node => node.type === NodeType.FILE && typeof node.attributes.path === "string" && isSource(String(node.attributes.path)))
    .map(node => normalize(String(node.attributes.path)))
    .sort();
}

function isSource(path: string): boolean {
  return /\.(ts|tsx|js|jsx|mjs|cjs)$/.test(path) && !/(^|\/)(node_modules|\.git|dist|build|coverage|\.next)(\/)/.test(path);
}

function normalize(path: string): string {
  return path.replaceAll("\\", "/");
}

function unique(paths: readonly string[]): string[] {
  return [...new Set(paths)];
}
