import { rm } from "node:fs/promises";
import { join } from "node:path";
import type { RecoveryJournalState, RecoveryJournalStore } from "../ports/recovery-journal.js";
import type { OperationService } from "../operations/operation-service.js";
import type { OperationHistoryService } from "../operations/operation-history-service.js";

export interface InterruptedRecoveryResult {
  readonly status: "none" | "interrupted" | "resumed" | "rolled_back";
  readonly journal: RecoveryJournalState | null;
  readonly operation?: unknown;
}

export class InterruptedOperationRecoveryService {
  constructor(
    private readonly repositoryRoot: string,
    private readonly journal: RecoveryJournalStore,
    private readonly operations: OperationService,
    private readonly operationHistory: OperationHistoryService,
    private readonly resumeIndex: (commit: string) => Promise<unknown>
  ) {}

  async status(): Promise<InterruptedRecoveryResult> {
    const journal = await this.journal.load(this.repositoryRoot);
    if (!journal) return { status: "none", journal: null };
    return { status: "interrupted", journal, operation: this.operations.get(journal.operationId) };
  }

  async resume(): Promise<InterruptedRecoveryResult> {
    const journal = await this.journal.load(this.repositoryRoot);
    if (!journal) return { status: "none", journal: null };
    const current = this.operations.get(journal.operationId);
    if (current && ["queued", "running"].includes(current.state)) {
      this.operations.recover(journal.operationId);
      await this.operationHistory.record(this.operations.list());
    }
    const operation = this.operations.begin("recovery-resume", { interruptedOperationId: journal.operationId, commit: journal.commit });
    await this.operationHistory.record(this.operations.list());
    this.operations.start(operation.id);
    await this.operationHistory.record(this.operations.list());
    try {
      await this.resumeIndex(journal.commit);
      this.operations.succeed(operation.id);
      await this.operationHistory.record(this.operations.list());
      await this.journal.clear(this.repositoryRoot);
      return { status: "resumed", journal, operation: this.operations.get(operation.id) };
    } catch (error) {
      this.operations.fail(operation.id, error, "recovery");
      await this.operationHistory.record(this.operations.list());
      throw error;
    }
  }

  async rollback(): Promise<InterruptedRecoveryResult> {
    const journal = await this.journal.load(this.repositoryRoot);
    if (!journal) return { status: "none", journal: null };
    await rm(join(this.repositoryRoot, ".gctg", "index.lock"), { force: true });
    await rm(join(this.repositoryRoot, ".gctg", "recovery.json.tmp"), { force: true });
    const current = this.operations.get(journal.operationId);
    if (current && ["queued", "running"].includes(current.state)) {
      this.operations.cancel(journal.operationId);
      await this.operationHistory.record(this.operations.list());
    }
    await this.journal.clear(this.repositoryRoot);
    return { status: "rolled_back", journal };
  }
}