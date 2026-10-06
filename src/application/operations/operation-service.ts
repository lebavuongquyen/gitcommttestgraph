import { randomUUID } from "node:crypto";
import type { OperationRecord, OperationState } from "../../domain/operation.js";

export class OperationService {
  private readonly records = new Map<string, OperationRecord>();

  begin(name: string, metadata: Readonly<Record<string, unknown>> = {}, parentId?: string): OperationRecord {
    const record: OperationRecord = {
      id: randomUUID(),
      name,
      state: "queued",
      startedAt: new Date().toISOString(),
      ...(parentId ? { parentId } : {}),
      metadata
    };
    this.records.set(record.id, record);
    return record;
  }

  start(id: string): OperationRecord { return this.transition(id, "running"); }
  succeed(id: string): OperationRecord { return this.transition(id, "succeeded", true); }
  cancel(id: string): OperationRecord { return this.transition(id, "cancelled", true); }
  recover(id: string): OperationRecord { return this.transition(id, "recovered", true); }

  fail(id: string, error: unknown): OperationRecord {
    return this.transition(id, "failed", true, error instanceof Error ? error.message : String(error));
  }

  get(id: string): OperationRecord | undefined { return this.records.get(id); }

  restore(records: readonly OperationRecord[]): void {
    this.records.clear();
    for (const record of records) this.records.set(record.id, record);
  }

  list(): readonly OperationRecord[] {
    return [...this.records.values()].sort((a, b) => a.startedAt.localeCompare(b.startedAt) || a.id.localeCompare(b.id));
  }

  private transition(id: string, state: OperationState, finished = false, error?: string): OperationRecord {
    const current = this.records.get(id);
    if (!current) throw new Error("Operation not found: " + id);
    const next: OperationRecord = {
      ...current,
      state,
      ...(finished ? { finishedAt: new Date().toISOString() } : {}),
      ...(error ? { error } : {})
    };
    this.records.set(id, next);
    return next;
  }
}
