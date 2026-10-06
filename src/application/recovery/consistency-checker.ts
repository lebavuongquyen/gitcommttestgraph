import type { SnapshotConsistencyIssue, SnapshotConsistencyStore } from "../ports/snapshot-consistency.js";

export interface ConsistencyReport {
  readonly healthy: boolean;
  readonly issues: readonly SnapshotConsistencyIssue[];
}

export class ConsistencyChecker {
  constructor(private readonly store: SnapshotConsistencyStore) {}

  async check(): Promise<ConsistencyReport> {
    const issues = await this.store.checkConsistency();
    return { healthy: issues.length === 0, issues };
  }
}
