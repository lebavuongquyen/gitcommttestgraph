import { createSnapshot } from "../../domain/graph/snapshot.js";
import { EdgeType, NodeType, type GraphNode, type GraphEdge } from "../../domain/graph/model.js";
import { stableId, edgeId } from "../../domain/graph/ids.js";
import { Confidence } from "../../domain/evidence/model.js";
import { PackageManager } from "../../domain/package/model.js";
import { classifyFile, FileKind } from "../../domain/repository/file-classification.js";
import type { GitRepositoryPort } from "../ports/git.js";
import type { GraphStore } from "../ports/graph-store.js";
import type { SemanticSourceAnalyzer, SourceFileInput } from "../ports/source-analyzer.js";

export interface IndexOptions {
  readonly repository: string;
  readonly commit: string;
  readonly configuration: unknown;
  readonly analyzerVersion: string;
}

export class RepositoryIndexer {
  constructor(
    private readonly git: GitRepositoryPort,
    private readonly analyzer: SemanticSourceAnalyzer,
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
    const packageInfo = await discoverPackagesAtCommit(this.git, files, options.commit);
    const nodes: GraphNode[] = [{
      id: stableId("repository", options.repository),
      type: NodeType.REPOSITORY,
      attributes: { root: options.repository, vcs: "git" }
    }];
    const edges: GraphEdge[] = [];
    const classified = new Map(files.map(path => [normalize(path), classifyFile(path)]));
    const sourceInputs: SourceFileInput[] = [];
    let testFileCount = 0;
    let configFileCount = 0;

    for (const pkg of packageInfo.packages) {
      nodes.push({ id: pkg.id, type: NodeType.PACKAGE, attributes: { name: pkg.name, rootPath: pkg.rootPath, manifestPath: pkg.manifestPath, manager: pkg.manager } });
      edges.push(makeEdge(nodes[0]!.id, EdgeType.CONTAINS, pkg.id, options.commit, pkg.manifestPath, "package-boundary"));
      for (const dep of Object.keys(pkg.dependencies)) {
        const target = packageInfo.byName.get(dep);
        if (!target) continue;
        edges.push(makeEdge(pkg.id, EdgeType.DEPENDS_ON, target.id, options.commit, pkg.manifestPath, "workspace-dependency", dep));
      }
    }

    for (const path of files) {
      const kind = classified.get(normalize(path));
      if (kind === FileKind.TEST) testFileCount++;
      if ([FileKind.CONFIG, FileKind.LANGUAGE_CONFIG, FileKind.BUILD_CONFIG, FileKind.TEST_CONFIG, FileKind.RUNTIME_CONFIG, FileKind.WORKSPACE_CONFIG].includes(kind!)) configFileCount++;
      if (!isSource(path)) continue;
      const content = await this.git.readFileAtCommit(options.commit, path);
      const pkg = packageInfo.packages.find(item => isInsidePackage(path, item.rootPath));
      sourceInputs.push({ path, content, ...(pkg ? { packageId: pkg.id } : {}) });
    }

    const analysis = this.analyzer.analyzeProject({ files: sourceInputs }, options.commit);
    nodes.push(...analysis.nodes);
    edges.push(...analysis.edges);

    const packageById = new Map(packageInfo.packages.map(pkg => [pkg.id, pkg]));
    for (const node of analysis.nodes.filter(node => node.type === NodeType.FILE)) {
      const packageId = typeof node.attributes.packageId === "string" ? node.attributes.packageId : undefined;
      if (packageId) edges.push(makeEdge(packageId, EdgeType.CONTAINS, node.id, options.commit, String(node.attributes.path), "package-file-boundary"));
    }

    const snapshot = createSnapshot({
      analyzerVersion: options.analyzerVersion,
      repository: options.repository,
      commit: options.commit,
      configuration: options.configuration,
      nodes,
      edges,
      metadata: { packageCount: packageById.size, sourceFileCount: sourceInputs.length, testFileCount, configFileCount, classifiedFileCount: classified.size }
    });
    await this.store.saveSnapshot(snapshot);
    return { snapshot, reused: false };
  }
}

interface IndexedPackage {
  readonly id: string;
  readonly name: string;
  readonly rootPath: string;
  readonly manifestPath: string;
  readonly manager: PackageManager;
  readonly dependencies: Readonly<Record<string, string>>;
}

async function discoverPackagesAtCommit(git: GitRepositoryPort, files: readonly string[], commit: string): Promise<{ packages: IndexedPackage[]; byName: Map<string, IndexedPackage> }> {
  const normalized = files.map(normalize);
  const manager = detectManager(normalized);
  const manifestPaths = new Set<string>();
  if (normalized.includes("package.json")) manifestPaths.add("package.json");
  for (const path of normalized) if (path.endsWith("/package.json")) manifestPaths.add(path);
  const workspaces = await workspacePatterns(git, normalized, commit);
  const selected = workspaces.length ? [...manifestPaths].filter(path => matchesWorkspace(path, workspaces)) : [...manifestPaths];
  if (normalized.includes("package.json") && !selected.includes("package.json")) selected.push("package.json");
  const packages = [];
  for (const manifestPath of selected) {
    const raw = await git.readFileAtCommit(commit, manifestPath);
    const data = JSON.parse(raw) as Record<string, unknown>;
    const rootPath = manifestPath === "package.json" ? "." : manifestPath.slice(0, -"/package.json".length);
    const name = typeof data.name === "string" ? data.name : rootPath;
    packages.push({ id: stableId("package", name, rootPath), name, rootPath, manifestPath, manager, dependencies: dependencies(data) });
  }
  return { packages, byName: new Map(packages.map(pkg => [pkg.name, pkg])) };
}

async function workspacePatterns(git: GitRepositoryPort, files: readonly string[], commit: string): Promise<string[]> {
  if (files.includes("pnpm-workspace.yaml")) {
    const text = await git.readFileAtCommit(commit, "pnpm-workspace.yaml");
    return text.split(/\r?\n/).map(line => line.match(/^\s*-\s*["']?([^"']+)["']?\s*$/)?.[1]).filter((x): x is string => !!x);
  }
  if (!files.includes("package.json")) return [];
  const data = JSON.parse(await git.readFileAtCommit(commit, "package.json")) as Record<string, unknown>;
  const w = data.workspaces;
  if (Array.isArray(w)) return w.filter((x): x is string => typeof x === "string");
  if (w && typeof w === "object" && Array.isArray((w as Record<string, unknown>).packages)) return ((w as Record<string, unknown>).packages as unknown[]).filter((x): x is string => typeof x === "string");
  return [];
}

function matchesWorkspace(manifest: string, patterns: readonly string[]): boolean {
  if (manifest === "package.json") return false;
  const dir = manifest.slice(0, -"/package.json".length);
  return patterns.some(pattern => {
    const p = pattern.replaceAll("\\", "/").replace(/^\.\//, "").replace(/\/$/, "");
    if (p.endsWith("/*")) return dir.startsWith(p.slice(0, -1)) && !dir.slice(p.length - 1).includes("/");
    return dir === p;
  });
}

function detectManager(files: readonly string[]): PackageManager {
  if (files.includes("pnpm-workspace.yaml") || files.includes("pnpm-lock.yaml")) return PackageManager.PNPM;
  if (files.includes("yarn.lock")) return PackageManager.YARN;
  if (files.includes("bun.lock") || files.includes("bun.lockb")) return PackageManager.BUN;
  return PackageManager.NPM;
}

function dependencies(data: Record<string, unknown>): Record<string, string> {
  const result: Record<string, string> = {};
  for (const key of ["dependencies", "devDependencies", "peerDependencies", "optionalDependencies"]) {
    const value = data[key];
    if (!value || typeof value !== "object") continue;
    for (const [name, version] of Object.entries(value)) if (typeof version === "string") result[name] = version;
  }
  return result;
}

function isInsidePackage(path: string, rootPath: string): boolean {
  return rootPath === "." || path === rootPath || path.startsWith(rootPath + "/");
}

function isSource(path: string): boolean {
  if (/(^|\/)(node_modules|\.git|dist|build|coverage|\.next)(\/)/.test(path)) return false;
  return /\.(ts|tsx|js|jsx|mjs|cjs)$/.test(path);
}

function normalize(path: string): string { return path.replaceAll("\\", "/"); }

function makeEdge(source: string, type: EdgeType, target: string, commit: string, filePath: string, kind: string, text?: string): GraphEdge {
  return {
    id: edgeId(source, type, target, commit),
    source,
    target,
    type,
    confidence: Confidence.EXACT,
    evidence: [{ kind, filePath, ...(text ? { text } : {}) }],
    sourceCommit: commit
  };
}
