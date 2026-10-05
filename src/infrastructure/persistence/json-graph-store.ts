import { mkdir, readFile, writeFile, rename, readdir } from "node:fs/promises";
import { dirname, join } from "node:path";
import type { GraphNode, GraphSnapshot } from "../../domain/graph/model.js";
import type { GraphQueryRequest, GraphQueryResult, GraphStore } from "../../application/ports/graph-store.js";
import { IndexCorruptError } from "../../domain/errors.js";

export class JsonGraphStore implements GraphStore {
  constructor(private readonly directory: string) {}

  async saveSnapshot(snapshot: GraphSnapshot): Promise<void> {
    validateSnapshot(snapshot);
    const path = this.pathFor(snapshot.repository, snapshot.commit, snapshot.analyzerVersion, snapshot.configurationFingerprint);
    await mkdir(dirname(path), { recursive: true });
    const temp = path + "." + process.pid + "." + Date.now() + ".tmp";
    await writeFile(temp, JSON.stringify(snapshot), "utf8");
    await rename(temp, path);
  }

  async getSnapshot(repository: string, commit: string, analyzerVersion: string, configurationFingerprint: string): Promise<GraphSnapshot | null> {
    const path = this.pathFor(repository, commit, analyzerVersion, configurationFingerprint);
    try {
      const snapshot = JSON.parse(await readFile(path, "utf8")) as unknown;
      validateSnapshot(snapshot);
      return snapshot;
    } catch (error) {
      if (error && typeof error === "object" && "code" in error && error.code === "ENOENT") return null;
      if (error instanceof SyntaxError || error instanceof IndexCorruptError) throw new IndexCorruptError("Invalid graph snapshot for " + commit);
      return null;
    }
  }

  async getNode(id: string): Promise<GraphNode | null> {
    let found: GraphNode | null = null;
    await walk(this.directory, async path => {
      if (!path.endsWith(".json")) return;
      try {
        const snapshot = JSON.parse(await readFile(path, "utf8")) as unknown;
        validateSnapshot(snapshot);
        const node = snapshot.nodes.find(item => item.id === id);
        if (node) found = node;
      } catch {}
    });
    return found;
  }

  async query(request: GraphQueryRequest): Promise<GraphQueryResult> {
    const nodes = new Map<string, GraphNode>();
    await walk(this.directory, async path => {
      if (!path.endsWith(".json")) return;
      try {
        const snapshot = JSON.parse(await readFile(path, "utf8")) as unknown;
        validateSnapshot(snapshot);
        for (const node of snapshot.nodes) {
          if (request.nodeType && node.type !== request.nodeType) continue;
          if (request.packageId && node.attributes.packageId !== request.packageId) continue;
          if (request.filePath && node.attributes.path !== request.filePath) continue;
          nodes.set(node.id, node);
        }
      } catch {}
    });
    return { nodes: [...nodes.values()].sort((a, b) => a.id.localeCompare(b.id)) };
  }

  private pathFor(repository: string, commit: string, analyzerVersion: string, fingerprint: string): string {
    const repositoryKey = Buffer.from(repository).toString("base64url");
    return join(this.directory, repositoryKey, analyzerVersion, fingerprint, commit + ".json");
  }
}

function validateSnapshot(value: unknown): asserts value is GraphSnapshot {
  if (!value || typeof value !== "object") throw new IndexCorruptError("Graph snapshot is not an object");
  const snapshot = value as Record<string, unknown>;
  if (snapshot.schemaVersion !== 1 || typeof snapshot.analyzerVersion !== "string" || typeof snapshot.repository !== "string" || typeof snapshot.commit !== "string" || typeof snapshot.configurationFingerprint !== "string" || !Array.isArray(snapshot.nodes) || !Array.isArray(snapshot.edges) || !snapshot.metadata || typeof snapshot.metadata !== "object") throw new IndexCorruptError("Graph snapshot schema is invalid");
  const nodeIds = new Set<string>();
  for (const node of snapshot.nodes) {
    if (!node || typeof node !== "object") throw new IndexCorruptError("Graph snapshot contains an invalid node");
    const item = node as Record<string, unknown>;
    if (typeof item.id !== "string" || typeof item.type !== "string" || !item.attributes || typeof item.attributes !== "object" || nodeIds.has(item.id)) throw new IndexCorruptError("Graph snapshot contains an invalid or duplicate node");
    nodeIds.add(item.id);
  }
  for (const edge of snapshot.edges) {
    if (!edge || typeof edge !== "object") throw new IndexCorruptError("Graph snapshot contains an invalid edge");
    const item = edge as Record<string, unknown>;
    if (typeof item.id !== "string" || typeof item.source !== "string" || typeof item.target !== "string" || typeof item.type !== "string" || typeof item.sourceCommit !== "string" || !Array.isArray(item.evidence)) throw new IndexCorruptError("Graph snapshot contains an invalid edge");
    if (!nodeIds.has(item.source) || !nodeIds.has(item.target)) throw new IndexCorruptError("Graph snapshot contains a dangling edge");
  }
}

async function walk(root: string, visit: (path: string) => Promise<void>): Promise<void> {
  try {
    for (const entry of await readdir(root, { withFileTypes: true })) {
      const path = join(root, entry.name);
      if (entry.isDirectory()) await walk(path, visit);
      else await visit(path);
    }
  } catch {}
}
