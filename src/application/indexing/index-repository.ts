import { posix } from "node:path";
import { createSnapshot } from "../../domain/graph/snapshot.js";
import { EdgeType, NodeType, type GraphNode, type GraphEdge, type GraphSnapshot } from "../../domain/graph/model.js";
import { stableId, edgeId } from "../../domain/graph/ids.js";
import { Confidence } from "../../domain/evidence/model.js";
import { PackageManager } from "../../domain/package/model.js";
import { classifyFile, FileKind } from "../../domain/repository/file-classification.js";
import { buildTestGraph } from "../tests/test-graph-builder.js";
import { TestRegistry } from "../tests/test-registry.js";
import { GenericScriptTestAdapter } from "../../adapters/test-frameworks/generic-script/adapter.js";
import { buildClassifiedFileGraph } from "./classified-file-graph.js";
import { discoverPathAliases } from "./tsconfig-aliases.js";
import { buildDataReferenceGraph } from "./data-reference-graph.js";
import { VitestAdapter, JestAdapter, NodeTestAdapter, PlaywrightAdapter } from "../../adapters/test-frameworks/standard/adapters.js";
import type { GitRepositoryPort } from "../ports/git.js";
import type { GraphStore } from "../ports/graph-store.js";
import type { SemanticSourceAnalyzer, SourceFileInput, SourceAnalysis } from "../ports/source-analyzer.js";
import { semanticCacheKey } from "../ports/semantic-cache.js";
import type { SemanticCache } from "../ports/semantic-cache.js";

export interface IndexOptions {
  readonly repository: string;
  readonly commit: string;
  readonly configuration: unknown;
  readonly analyzerVersion: string;
  readonly semanticAnalysisPaths?: readonly string[];
  readonly incrementalParentSnapshot?: GraphSnapshot;
}

export class RepositoryIndexer {
  constructor(
    private readonly git: GitRepositoryPort,
    private readonly analyzer: SemanticSourceAnalyzer,
    private readonly store: GraphStore,
    private readonly semanticCache?: SemanticCache
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
    const commitInfo = await this.git.getCommit(options.commit);
    const packageInfo = await discoverPackagesAtCommit(this.git, files, options.commit);
    const nodes: GraphNode[] = [{
      id: stableId("repository", options.repository),
      type: NodeType.REPOSITORY,
      attributes: { root: options.repository, vcs: "git" }
    }];
    const edges: GraphEdge[] = [];
    const commitNodeId = stableId("commit", commitInfo.hash);
    nodes.push({ id: commitNodeId, type: NodeType.COMMIT, attributes: { hash: commitInfo.hash, parents: commitInfo.parents, author: commitInfo.author, committer: commitInfo.committer, timestamp: commitInfo.timestamp, message: commitInfo.message } });
    edges.push(makeEdge(nodes[0]!.id, EdgeType.CONTAINS, commitNodeId, options.commit, "", "repository-commit"));
    const classified = new Map(files.map(path => [normalize(path), classifyFile(path)]));
    const sourceInputs: SourceFileInput[] = [];
    const pathAliases = await discoverPathAliases(this.git, files, options.commit);
    const packageRoots = Object.fromEntries(packageInfo.packages.map(pkg => [pkg.name, pkg.rootPath]));
    const packageEntrypoints = await discoverPackageEntrypoints(this.git, packageInfo.packages, options.commit);
    const testRegistry = new TestRegistry();
    testRegistry.register(new PlaywrightAdapter());
    testRegistry.register(new VitestAdapter());
    testRegistry.register(new JestAdapter());
    testRegistry.register(new NodeTestAdapter());
    testRegistry.register(new GenericScriptTestAdapter());
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

    const sourceContents = await readSourceContents(this.git, options.commit, files.filter(isSource));
    for (const path of files) {
      const kind = classified.get(normalize(path));
      if (kind === FileKind.TEST) testFileCount++;
      if (kind === FileKind.CONFIG || kind === FileKind.LANGUAGE_CONFIG || kind === FileKind.BUILD_CONFIG || kind === FileKind.TEST_CONFIG || kind === FileKind.RUNTIME_CONFIG || kind === FileKind.WORKSPACE_CONFIG) configFileCount++;
      if (!isSource(path)) continue;
      const content = sourceContents.get(normalize(path));
      if (content === undefined) throw new Error("Missing source content for " + path);
      const pkg = packageInfo.packages.find(item => isInsidePackage(path, item.rootPath));
      sourceInputs.push({ path, content, ...(pkg ? { packageId: pkg.id } : {}) });
    }

    const classifiedGraph = buildClassifiedFileGraph({ files, packages: packageInfo.packages, commit: options.commit });
    nodes.push(...classifiedGraph.nodes);
    edges.push(...classifiedGraph.edges);

    const cacheKey = this.semanticCache ? semanticCacheKey({ analyzerVersion: options.analyzerVersion, files: sourceInputs, pathAliases, packageRoots, packageEntrypoints, ...(options.semanticAnalysisPaths ? { analysisPaths: options.semanticAnalysisPaths } : {}) }) : undefined;
    const cachedAnalysis = cacheKey ? await this.semanticCache!.get(cacheKey) : null;
    const rawAnalysis = cachedAnalysis
      ? remapAnalysisForCommit(cachedAnalysis, options.commit)
      : this.analyzer.analyzeProject({ files: sourceInputs, pathAliases, packageRoots, packageEntrypoints, ...(options.semanticAnalysisPaths ? { analysisPaths: options.semanticAnalysisPaths } : {}) }, options.commit);
    if (!cachedAnalysis && cacheKey) await this.semanticCache!.save(cacheKey, rawAnalysis);
    const analysis = options.incrementalParentSnapshot && options.semanticAnalysisPaths
      ? mergeIncrementalSemanticAnalysis(rawAnalysis, options.incrementalParentSnapshot, files, options.semanticAnalysisPaths, options.commit)
      : rawAnalysis;
    const dataInputs = new Map<string, string>();
    for (const input of sourceInputs) dataInputs.set(normalize(input.path), input.content);
    const dataGraph = buildDataReferenceGraph({ files, contents: dataInputs, commit: options.commit });
    nodes.push(...dataGraph.nodes);
    edges.push(...dataGraph.edges);
    nodes.push(...analysis.nodes);
    edges.push(...analysis.edges);

    for (const pkg of packageInfo.packages) {
      const manifest = JSON.parse(await this.git.readFileAtCommit(options.commit, pkg.manifestPath)) as Record<string, unknown>;
      const scripts = manifest.scripts && typeof manifest.scripts === "object" ? Object.fromEntries(Object.entries(manifest.scripts).filter(([, value]) => typeof value === "string")) as Record<string, string> : {};
      const packageFiles = files.filter(path => isInsidePackage(normalize(path), pkg.rootPath));
      const testAdapters = testRegistry.all();
      for (const testAdapter of testAdapters) {
        const tg = await buildTestGraph(testAdapter, { files: packageFiles, packageId: pkg.id, root: pkg.rootPath, commit: options.commit, packageScripts: scripts, dependencies: pkg.dependencies, readFile: path => this.git.readFileAtCommit(options.commit, path), commandResolverId: pkg.manager });
        nodes.push(...tg.nodes);
        edges.push(...tg.edges);
        const project = tg.nodes.find(node => node.type === NodeType.TEST_PROJECT);
        if (project) edges.push(makeEdge(pkg.id, EdgeType.CONTAINS, project.id, options.commit, pkg.manifestPath, "package-test-project"));
      }
    }
    for (const testFileNode of nodes.filter(n => n.type === NodeType.TEST_FILE)) {
      const fileId = String(testFileNode.attributes.fileId);
      for (const edge of analysis.edges) {
        if (edge.source === fileId && (edge.type === EdgeType.IMPORTS || edge.type === EdgeType.CALLS)) {
          const target = edge.target;
          const targetNode = nodes.find(n => n.id === target);
          if (targetNode?.type === NodeType.FILE || targetNode?.type === NodeType.SYMBOL) edges.push(makeEdge(testFileNode.id, EdgeType.TESTS, target, options.commit, String(testFileNode.attributes.path), "test-dependency")); 
        }
      }
    }
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
      nodes: dedupeNodes(nodes),
      edges: dedupeEdges(edges),
      metadata: {
        packageCount: packageById.size,
        sourceFileCount: sourceInputs.length,
        testFileCount,
        configFileCount,
        classifiedFileCount: classified.size,
        ...(options.incrementalParentSnapshot ? {
          incremental: true,
          parentCommit: options.incrementalParentSnapshot.commit,
          semanticAnalyzedPaths: analysis.analyzedPaths ?? sourceInputs.map(input => normalize(input.path)).sort(),
          semanticReusedPaths: sourceInputs.map(input => normalize(input.path)).filter(path => !options.semanticAnalysisPaths?.includes(path)).sort()
        } : {})
      }
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

async function readSourceContents(git: GitRepositoryPort, commit: string, paths: readonly string[]): Promise<Map<string, string>> {
  if (git.readFilesAtCommit) return new Map(await git.readFilesAtCommit(commit, paths));
  const entries = await Promise.all(paths.map(async path => [normalize(path), await git.readFileAtCommit(commit, path)] as const));
  return new Map(entries);
}

async function discoverPackageEntrypoints(git: GitRepositoryPort, packages: readonly IndexedPackage[], commit: string): Promise<Record<string, string>> {
  const result: Record<string, string> = {};
  for (const pkg of packages) {
    try {
      const manifest = JSON.parse(await git.readFileAtCommit(commit, pkg.manifestPath)) as Record<string, unknown>;
      const exportsValue = manifest.exports;
      const target = typeof exportsValue === "string"
        ? exportsValue
        : exportsValue && typeof exportsValue === "object"
          ? exportTarget((exportsValue as Record<string, unknown>)["."])
          : undefined;
      if (target) result[pkg.name] = normalize(joinPath(pkg.rootPath, target));
      else if (typeof manifest.module === "string") result[pkg.name] = normalize(joinPath(pkg.rootPath, manifest.module));
      else if (typeof manifest.main === "string") result[pkg.name] = normalize(joinPath(pkg.rootPath, manifest.main));
    } catch {}
  }
  return result;
}

function exportTarget(value: unknown): string | undefined {
  if (typeof value === "string") return value;
  if (!value || typeof value !== "object") return undefined;
  const record = value as Record<string, unknown>;
  for (const key of ["import", "require", "default", "node", "browser"]) {
    const candidate = exportTarget(record[key]);
    if (candidate) return candidate;
  }
  return undefined;
}

function joinPath(root: string, target: string): string {
  return posix.normalize(posix.join(root, target));
}

function mergeIncrementalSemanticAnalysis(
  fresh: { readonly nodes: readonly GraphNode[]; readonly edges: readonly GraphEdge[]; readonly analyzedPaths?: readonly string[] },
  parent: GraphSnapshot,
  currentFiles: readonly string[],
  selectedPaths: readonly string[],
  commit: string
): { readonly nodes: readonly GraphNode[]; readonly edges: readonly GraphEdge[]; readonly analyzedPaths: readonly string[] } {
  const currentSourcePaths = new Set(currentFiles.filter(isSource).map(normalize));
  const selected = new Set(selectedPaths.map(normalize));
  const parentFilePath = new Map<string, string>();
  const parentSymbolPath = new Map<string, string>();

  for (const node of parent.nodes) {
    if (node.type === NodeType.FILE && typeof node.attributes.path === "string") parentFilePath.set(node.id, normalize(String(node.attributes.path)));
  }
  for (const node of parent.nodes) {
    if (node.type === NodeType.SYMBOL && typeof node.attributes.fileId === "string") {
      const path = parentFilePath.get(String(node.attributes.fileId));
      if (path) parentSymbolPath.set(node.id, path);
    }
  }

  const ownerPath = (nodeId: string): string | undefined => parentFilePath.get(nodeId) ?? parentSymbolPath.get(nodeId);
  const reusableNodes = parent.nodes.filter(node => {
    if (node.type !== NodeType.SYMBOL) return false;
    const path = ownerPath(node.id);
    return !!path && currentSourcePaths.has(path) && !selected.has(path);
  });
  const reusableEdges = parent.edges.filter(edge => {
    const sourcePath = ownerPath(edge.source);
    const targetPath = ownerPath(edge.target);
    return !!sourcePath && !!targetPath && currentSourcePaths.has(sourcePath) && currentSourcePaths.has(targetPath) && !selected.has(sourcePath) && !selected.has(targetPath);
  });

  const nodes = dedupeNodes([...fresh.nodes, ...reusableNodes]);
  const edges = dedupeEdges([...fresh.edges, ...reusableEdges.map(edge => remapEdgeForCommit(edge, commit))]);
  return { nodes, edges, analyzedPaths: [...(fresh.analyzedPaths ?? [...selected])].sort() };
}

function remapEdgeForCommit(edge: GraphEdge, commit: string): GraphEdge {
  return { ...edge, id: edgeId(edge.source, edge.type, edge.target, commit), sourceCommit: commit };
}

function remapAnalysisForCommit(analysis: SourceAnalysis, commit: string): SourceAnalysis {
  return {
    nodes: analysis.nodes,
    edges: analysis.edges.map(edge => remapEdgeForCommit(edge, commit)),
    ...(analysis.analyzedPaths ? { analyzedPaths: analysis.analyzedPaths } : {})
  };
}

function dedupeNodes(nodes: readonly GraphNode[]): GraphNode[] {
  const map = new Map<string, GraphNode>();
  for (const node of nodes) map.set(node.id, node);
  return [...map.values()];
}

function dedupeEdges(edges: readonly GraphEdge[]): GraphEdge[] {
  const map = new Map<string, GraphEdge>();
  for (const edge of edges) map.set(edge.id, edge);
  return [...map.values()];
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
