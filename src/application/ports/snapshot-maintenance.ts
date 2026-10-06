export interface SnapshotRecord {
  readonly repository: string;
  readonly commit: string;
  readonly analyzerVersion: string;
  readonly configurationFingerprint: string;
  readonly path: string;
  readonly sizeBytes: number;
}

export interface SnapshotMaintenanceStore {
  listSnapshots(): Promise<readonly SnapshotRecord[]>;
  deleteSnapshot(record: SnapshotRecord): Promise<void>;
}
