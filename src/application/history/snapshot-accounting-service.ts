import type { GctgConfiguration } from "../../domain/configuration/model.js";
import type { SnapshotRecord, SnapshotMaintenanceStore } from "../ports/snapshot-maintenance.js";

export interface SnapshotAccounting {
  readonly snapshotCount: number;
  readonly totalSizeBytes: number;
  readonly maxSnapshots: number | null;
  readonly maxSizeBytes: number | null;
  readonly countExceeded: boolean;
  readonly sizeExceeded: boolean;
}

export interface CompactionPlan {
  readonly candidates: readonly SnapshotRecord[];
  readonly protectedPaths: readonly string[];
  readonly accounting: SnapshotAccounting;
}

export class SnapshotAccountingService {
  constructor(private readonly store: SnapshotMaintenanceStore) {}

  async account(configuration: GctgConfiguration): Promise<SnapshotAccounting> {
    return accountRecords(await this.store.listSnapshots(), configuration);
  }

  async planCompaction(
    configuration: GctgConfiguration,
    protectedPaths: readonly string[] = []
  ): Promise<CompactionPlan> {
    const records = await this.store.listSnapshots();
    const protectedSet = new Set(protectedPaths);
    const accounting = accountRecords(records, configuration);
    let count = accounting.snapshotCount;
    let size = accounting.totalSizeBytes;
    const candidates: SnapshotRecord[] = [];

    for (const record of [...records].sort((a, b) => a.path.localeCompare(b.path))) {
      if (protectedSet.has(record.path)) continue;
      const countExceeded = configuration.storage.maxSnapshots !== null && count > configuration.storage.maxSnapshots;
      const sizeExceeded = configuration.storage.maxSizeMb !== null && size > configuration.storage.maxSizeMb * 1024 * 1024;
      if (!countExceeded && !sizeExceeded) break;
      candidates.push(record);
      count -= 1;
      size -= record.sizeBytes;
    }

    return { candidates, protectedPaths: [...protectedSet].sort(), accounting };
  }
}

function accountRecords(records: readonly SnapshotRecord[], configuration: GctgConfiguration): SnapshotAccounting {
  const totalSizeBytes = records.reduce((sum, record) => sum + record.sizeBytes, 0);
  const maxSnapshots = configuration.storage.maxSnapshots;
  const maxSizeBytes = configuration.storage.maxSizeMb === null ? null : configuration.storage.maxSizeMb * 1024 * 1024;
  return {
    snapshotCount: records.length,
    totalSizeBytes,
    maxSnapshots,
    maxSizeBytes,
    countExceeded: maxSnapshots !== null && records.length > maxSnapshots,
    sizeExceeded: maxSizeBytes !== null && totalSizeBytes > maxSizeBytes
  };
}
