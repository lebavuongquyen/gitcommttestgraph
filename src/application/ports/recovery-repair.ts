import type { SnapshotConsistencyIssue } from "./snapshot-consistency.js";

export type RecoveryRepairActionKind = "rebuild_manifest" | "rehydrate_head";

export interface RecoveryRepairAction {
  readonly kind: RecoveryRepairActionKind;
  readonly reason: string;
}

export interface RecoveryRepairPlan {
  readonly safe: boolean;
  readonly healthyBefore: boolean;
  readonly issues: readonly SnapshotConsistencyIssue[];
  readonly actions: readonly RecoveryRepairAction[];
  readonly blockedReasons: readonly string[];
}

export interface RecoveryRepairService {
  plan(repositoryRoot: string): Promise<RecoveryRepairPlan>;
  apply(repositoryRoot: string): Promise<RecoveryRepairPlan>;
}
