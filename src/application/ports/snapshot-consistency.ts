export type ConsistencyIssueKind = "manifest" | "duplicate_identity" | "missing_object" | "orphan_object" | "corrupt_object";

export interface SnapshotConsistencyIssue {
  readonly kind: ConsistencyIssueKind;
  readonly path?: string;
  readonly detail: string;
}

export interface SnapshotConsistencyStore {
  checkConsistency(): Promise<readonly SnapshotConsistencyIssue[]>;
}
