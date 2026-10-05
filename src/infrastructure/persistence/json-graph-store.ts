import { mkdir, readFile, writeFile, readdir } from "node:fs/promises";
import { dirname, join } from "node:path";
import type { GraphNode, GraphSnapshot } from "../../domain/graph/model.js";
import type { GraphQueryRequest, GraphQueryResult, GraphStore } from "../../application/ports/graph-store.js";

export class JsonGraphStore implements GraphStore {
  constructor(private readonly directory: string) {}

  async saveSnapshot(snapshot: GraphSnapshot): Promise<void> {
    const path = this.pathFor(snapshot.repository, snapshot.commit, snapshot.analyzerVersion, snapshot.configurationFingerprint);
    await mkdir(dirname(path), { recursive: true });
    await writeFile(path, JSON.stringify(snapshot), "utf8");
  }

  async getSnapshot(repository: string, commit: string, analyzerVersion: string, configurationFingerprint: string): Promise<GraphSnapshot | null> {
    try {
      return JSON.parse(await readFile(this.pathFor(repository, commit, analyzerVersion, configurationFingerprint), "utf8")) as GraphSnapshot;
    } catch {
      return null;
    }
  }

  async getNode(id: string): Promise<GraphNode | null> {
    let found: GraphNode | null = null;
    await walk(this.directory, async path => {
      if (!path.endsWith(".json")) return;
      try {
        const snapshot = JSON.parse(await readFile(path, "utf8")) as GraphSnapshot;
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
        const snapshot = JSON.parse(await readFile(path, "utf8")) as GraphSnapshot;
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
    return join(this.directory, repositoryKey, analyzerVersion, fingerprint, `${commit}.json`);
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
