import { createHash } from "node:crypto";
import type { SnapshotRecord, SnapshotMaintenanceStore } from "../ports/snapshot-maintenance.js";

export interface CleanupPreview {
  readonly previewId: string;
  readonly createdAt: string;
  readonly items: readonly SnapshotRecord[];
}

export interface CleanupApplyResult {
  readonly previewId: string;
  readonly deleted: readonly string[];
  readonly alreadyMissing: readonly string[];
}

export class SnapshotCleanupService {
  constructor(private readonly store: SnapshotMaintenanceStore) {}

  async preview(commits: readonly string[], now: string): Promise<CleanupPreview> {
    const requested = new Set(commits);
    const items = (await this.store.listSnapshots())
      .filter(item => requested.has(item.commit))
      .sort((a, b) => a.path.localeCompare(b.path));
    return {
      previewId: previewId(items),
      createdAt: now,
      items
    };
  }

  async apply(preview: CleanupPreview): Promise<CleanupApplyResult> {
    if (preview.previewId !== previewId(preview.items)) throw new Error("Cleanup preview proof is invalid.");
    const current = new Map((await this.store.listSnapshots()).map(item => [item.path, item]));
    const deleted: string[] = [];
    const alreadyMissing: string[] = [];

    for (const item of preview.items) {
      const existing = current.get(item.path);
      if (!existing) {
        alreadyMissing.push(item.path);
        continue;
      }
      if (existing.commit !== item.commit || existing.sizeBytes !== item.sizeBytes) {
        throw new Error("Cleanup preview is stale for " + item.commit);
      }
      await this.store.deleteSnapshot(item);
      deleted.push(item.path);
    }

    return { previewId: preview.previewId, deleted, alreadyMissing };
  }
}

function previewId(items: readonly SnapshotRecord[]): string {
  return createHash("sha256").update(JSON.stringify(items)).digest("hex");
}
