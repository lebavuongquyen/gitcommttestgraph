import { mkdir, readFile, writeFile } from "node:fs/promises";
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
    return null;
  }

  async query(request: GraphQueryRequest): Promise<GraphQueryResult> {
    return { nodes: [] };
  }

  private pathFor(repository: string, commit: string, analyzerVersion: string, fingerprint: string): string {
    const repositoryKey = Buffer.from(repository).toString("base64url");
    return join(this.directory, repositoryKey, analyzerVersion, fingerprint, `${commit}.json`);
  }
}
