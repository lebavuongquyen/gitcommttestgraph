export interface ProgressStage {
  readonly operationId: string;
  readonly name: string;
  readonly completed: number | null;
  readonly total: number | null;
  readonly timestamp: string;
}

export interface ProgressSnapshot {
  readonly operationId: string;
  readonly stages: readonly ProgressStage[];
}
