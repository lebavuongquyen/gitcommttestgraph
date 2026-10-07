export type RecoveryJournalPhase = "prepared" | "locked" | "analyzing" | "committing";

export interface RecoveryJournalState {
  readonly schemaVersion: 1;
  readonly operationId: string;
  readonly operationName: string;
  readonly commit: string;
  readonly phase: RecoveryJournalPhase;
  readonly startedAt: string;
  readonly updatedAt: string;
  readonly metadata: Readonly<Record<string, unknown>>;
}

export interface RecoveryJournalStore {
  load(repositoryRoot: string): Promise<RecoveryJournalState | null>;
  save(repositoryRoot: string, state: RecoveryJournalState): Promise<void>;
  clear(repositoryRoot: string): Promise<void>;
}