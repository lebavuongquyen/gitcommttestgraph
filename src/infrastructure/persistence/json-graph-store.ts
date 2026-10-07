import { mkdir, readFile, writeFile, rename, readdir, stat, unlink } from "node:fs/promises";
import { dirname, join } from "node:path";
import type { GraphNode, GraphSnapshot } from "../../domain/graph/model.js";
import type { GraphQueryRequest, GraphQueryResult, GraphStore } from "../../application/ports/graph-store.js";
import type { GraphStorage } from "../../application/ports/graph-store-capabilities.js";
import type { SnapshotMaintenanceStore, SnapshotRecord } from "../../application/ports/snapshot-maintenance.js";
import type { SnapshotConsistencyStore, SnapshotConsistencyIssue } from "../../application/ports/snapshot-consistency.js";
import { IndexCorruptError } from "../../domain/errors.js";
import { IndexLock } from "./index-lock.js";

interface SnapshotManifestEntry {
  readonly repository: string;
  readonly commit: string;
  readonly analyzerVersion: string;
  readonly configurationFingerprint: string;
  readonly path: string;
}

export class JsonGraphStore implements GraphStore, GraphStorage, SnapshotMaintenanceStore, SnapshotConsistencyStore {
  private manifestPromise: Promise<SnapshotManifestEntry[]> | undefined;
  private readonly manifestLock: IndexLock;
  readonly snapshots: GraphStore = this;
  readonly nodes: GraphStore = this;

  constructor(private readonly directory: string) {
    this.manifestLock = new IndexLock(join(directory, "manifest.lock"));
  }

  async saveSnapshot(snapshot: GraphSnapshot): Promise<void> {
    validateSnapshot(snapshot);
    const path = this.pathFor(snapshot.repository, snapshot.commit, snapshot.analyzerVersion, snapshot.configurationFingerprint);
    await mkdir(dirname(path), { recursive: true });
    const temp = path + "." + process.pid + "." + Date.now() + ".tmp";
    await writeFile(temp, JSON.stringify(snapshot), "utf8");
    await rename(temp, path);
    const release = await this.manifestLock.acquire();
    try {
      this.manifestPromise = undefined;
      const entries = await this.readManifest();
      const filtered = entries.filter(entry => entry.path !== path);
      filtered.push({ repository: snapshot.repository, commit: snapshot.commit, analyzerVersion: snapshot.analyzerVersion, configurationFingerprint: snapshot.configurationFingerprint, path });
      await this.writeManifest(filtered.sort((a, b) => a.path.localeCompare(b.path)));
    } finally {
      await release();
    }
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

  async listSnapshots(): Promise<readonly SnapshotRecord[]> {
    const records: SnapshotRecord[] = [];
    for (const entry of await this.readManifest()) {
      try {
        const info = await stat(entry.path);
        records.push({ ...entry, sizeBytes: info.size });
      } catch {}
    }
    return records.sort((a, b) => a.path.localeCompare(b.path));
  }

  async checkConsistency(): Promise<readonly SnapshotConsistencyIssue[]> {
    const issues: SnapshotConsistencyIssue[] = [];
    const manifestPath = join(this.directory, "manifest.json");
    let entries: SnapshotManifestEntry[] = [];
    try {
      const parsed = JSON.parse(await readFile(manifestPath, "utf8")) as unknown;
      if (!Array.isArray(parsed)) {
        issues.push({ kind: "manifest", path: manifestPath, detail: "Manifest is not an array." });
      } else {
        entries = parsed as SnapshotManifestEntry[];
        const identities = new Map<string, string>();
        for (const entry of entries) {
          if (!entry || typeof entry !== "object" || typeof entry.path !== "string" || typeof entry.repository !== "string" || typeof entry.commit !== "string" || typeof entry.analyzerVersion !== "string" || typeof entry.configurationFingerprint !== "string") {
            issues.push({ kind: "manifest", detail: "Manifest contains an invalid entry." });
            continue;
          }
          const identity = [entry.repository, entry.commit, entry.analyzerVersion, entry.configurationFingerprint].join("\u0000");
          const previous = identities.get(identity);
          if (previous) issues.push({ kind: "duplicate_identity", path: entry.path, detail: "Duplicate snapshot identity also appears at " + previous });
          identities.set(identity, entry.path);
          try {
            const snapshot = JSON.parse(await readFile(entry.path, "utf8")) as unknown;
            validateSnapshot(snapshot);
          } catch (error) {
            if (isMissing(error)) {
              issues.push({ kind: "missing_object", path: entry.path, detail: "Manifest entry has no physical snapshot object." });
            } else {
              issues.push({ kind: "corrupt_object", path: entry.path, detail: error instanceof Error ? error.message : String(error) });
            }
          }
        }
      }
    } catch (error) {
      if (isMissing(error)) issues.push({ kind: "manifest", path: manifestPath, detail: "Manifest is missing." }); else issues.push({ kind: "manifest", path: manifestPath, detail: "Manifest cannot be parsed." });
    }

    const referenced = new Set(entries.map(entry => entry.path));
    await walk(this.directory, async path => {
      if (path === manifestPath) return;
      if (path.endsWith(".tmp")) {
        issues.push({ kind: "orphan_object", path, detail: "Temporary snapshot artifact indicates an incomplete write or cleanup." });
        return;
      }
      if (!path.endsWith(".json")) return;
      if (!referenced.has(path)) issues.push({ kind: "orphan_object", path, detail: "Physical snapshot object is not referenced by the manifest." });
    });

    return issues.sort((a, b) => (a.kind + (a.path ?? "")).localeCompare(b.kind + (b.path ?? "")));
  }

  async rebuildManifestFromPhysicalSnapshots(): Promise<void> {
    const manifestPath = join(this.directory, "manifest.json");
    const entries: SnapshotManifestEntry[] = [];
    const identities = new Set<string>();
    const files: string[] = [];
    await walk(this.directory, async path => {
      if (path === manifestPath || !path.endsWith(".json")) return;
      files.push(path);
    });
    for (const path of files.sort()) {
      const snapshot = JSON.parse(await readFile(path, "utf8")) as unknown;
      validateSnapshot(snapshot);
      const identity = [snapshot.repository, snapshot.commit, snapshot.analyzerVersion, snapshot.configurationFingerprint].join("\u0000");
      if (identities.has(identity)) throw new Error("Cannot rebuild manifest: duplicate snapshot identity for " + snapshot.commit);
      identities.add(identity);
      entries.push({ repository: snapshot.repository, commit: snapshot.commit, analyzerVersion: snapshot.analyzerVersion, configurationFingerprint: snapshot.configurationFingerprint, path });
    }
    await this.manifestLock.acquire().then(async release => {
      try { await this.writeManifest(entries); } finally { await release(); }
    });
  }
  async deleteSnapshot(record: SnapshotRecord): Promise<void> {
    const release = await this.manifestLock.acquire();
    try {
      try { await unlink(record.path); } catch (error) {
        if (!isMissing(error)) throw error;
      }
      const entries = (await this.readManifest()).filter(entry => entry.path !== record.path);
      await this.writeManifest(entries);
    } finally {
      await release();
    }
  }

  async getNode(id: string): Promise<GraphNode | null> {
    for (const entry of await this.readManifest()) {
      try {
        const snapshot = JSON.parse(await readFile(entry.path, "utf8")) as unknown;
        validateSnapshot(snapshot);
        const node = snapshot.nodes.find(item => item.id === id);
        if (node) return node;
      } catch {}
    }
    return null;
  }

  async query(request: GraphQueryRequest): Promise<GraphQueryResult> {
    const nodes = new Map<string, GraphNode>();
    for (const entry of await this.readManifest()) {
      try {
        const snapshot = JSON.parse(await readFile(entry.path, "utf8")) as unknown;
        validateSnapshot(snapshot);
        for (const node of snapshot.nodes) {
          if (request.nodeType && node.type !== request.nodeType) continue;
          if (request.packageId && node.attributes.packageId !== request.packageId) continue;
          if (request.filePath && node.attributes.path !== request.filePath) continue;
          nodes.set(node.id, node);
        }
      } catch {}
    }
    return { nodes: [...nodes.values()].sort((a, b) => a.id.localeCompare(b.id)) };
  }

  private pathFor(repository: string, commit: string, analyzerVersion: string, fingerprint: string): string {
    const repositoryKey = Buffer.from(repository).toString("base64url");
    return join(this.directory, repositoryKey, analyzerVersion, fingerprint, commit + ".json");
  }

  private async readManifest(): Promise<SnapshotManifestEntry[]> {
    if (!this.manifestPromise) {
      this.manifestPromise = readFile(join(this.directory, "manifest.json"), "utf8")
        .then(raw => JSON.parse(raw) as SnapshotManifestEntry[])
        .catch(() => []);
    }
    return this.manifestPromise;
  }

  private async writeManifest(entries: SnapshotManifestEntry[]): Promise<void> {
    const path = join(this.directory, "manifest.json");
    await mkdir(this.directory, { recursive: true });
    const temp = path + "." + process.pid + "." + Date.now() + ".tmp";
    await writeFile(temp, JSON.stringify(entries), "utf8");
    await rename(temp, path);
    this.manifestPromise = Promise.resolve(entries);
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

function isMissing(error: unknown): boolean {
  return !!error && typeof error === "object" && "code" in error && error.code === "ENOENT";
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
