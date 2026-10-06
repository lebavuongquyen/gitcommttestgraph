import type { OperationRecord, OperationState } from "../../domain/operation.js";
import type { OperationHistoryStore } from "../ports/operation-history.js";

export interface OperationHistoryQuery {
  readonly name?: string;
  readonly state?: OperationState;
  readonly limit?: number;
}

export class OperationHistoryService {
  constructor(private readonly repositoryRoot: string, private readonly store: OperationHistoryStore, private readonly limit = 100) {}

  async load(): Promise<readonly OperationRecord[]> {
    return this.store.load(this.repositoryRoot);
  }

  async record(records: readonly OperationRecord[]): Promise<void> {
    await this.store.save(this.repositoryRoot, records.slice(-this.limit));
  }

  async query(query: OperationHistoryQuery = {}): Promise<readonly OperationRecord[]> {
    const records = await this.load();
    const filtered = records.filter(record =>
      (!query.name || record.name === query.name) &&
      (!query.state || record.state === query.state)
    );
    const limit = query.limit === undefined ? this.limit : Math.max(0, Math.min(query.limit, this.limit));
    return filtered.slice(-limit);
  }
}
