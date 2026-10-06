import type { OperationRecord } from "../../domain/operation.js";

export interface OperationHistoryStore {
  load(repositoryRoot: string): Promise<readonly OperationRecord[]>;
  save(repositoryRoot: string, records: readonly OperationRecord[]): Promise<void>;
}
