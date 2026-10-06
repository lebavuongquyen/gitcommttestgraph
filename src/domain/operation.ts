import type { FailureCategory } from "./failure.js";

export type OperationState = "queued" | "running" | "succeeded" | "failed" | "cancelled" | "recovered";

export interface OperationRecord {
  readonly id: string;
  readonly name: string;
  readonly state: OperationState;
  readonly startedAt: string;
  readonly finishedAt?: string;
  readonly parentId?: string;
  readonly error?: string;
  readonly failureCategory?: FailureCategory;
  readonly metadata: Readonly<Record<string, unknown>>;
}
