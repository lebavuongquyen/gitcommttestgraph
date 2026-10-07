import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { assertSafeRepositoryPath, sanitizeErrorMessage } from "../../domain/security/policy.js";
import type { RecoveryJournalState, RecoveryJournalStore } from "../../application/ports/recovery-journal.js";

export class JsonRecoveryJournalStore implements RecoveryJournalStore {
  async load(repositoryRoot: string): Promise<RecoveryJournalState | null> {
    const path = assertSafeRepositoryPath(repositoryRoot, ".gctg/recovery.json");
    try {
      const value = JSON.parse(await readFile(path, "utf8")) as RecoveryJournalState;
      if (!isValid(value)) throw new Error("Invalid recovery journal.");
      return value;
    } catch (error) {
      if (isMissing(error)) return null;
      throw new Error(sanitizeErrorMessage("Unable to read GCTG recovery journal."));
    }
  }

  async save(repositoryRoot: string, state: RecoveryJournalState): Promise<void> {
    const directory = assertSafeRepositoryPath(repositoryRoot, ".gctg");
    const path = assertSafeRepositoryPath(repositoryRoot, ".gctg/recovery.json");
    const temporary = assertSafeRepositoryPath(repositoryRoot, ".gctg/recovery.json.tmp");
    await mkdir(directory, { recursive: true });
    await writeFile(temporary, JSON.stringify(state, null, 2) + "\n", "utf8");
    await writeFile(path, await readFile(temporary, "utf8"), "utf8");
    await rm(temporary, { force: true });
  }

  async clear(repositoryRoot: string): Promise<void> {
    await rm(assertSafeRepositoryPath(repositoryRoot, ".gctg/recovery.json"), { force: true });
  }
}

function isValid(value: unknown): value is RecoveryJournalState {
  if (!value || typeof value !== "object") return false;
  const item = value as Record<string, unknown>;
  return item.schemaVersion === 1 &&
    typeof item.operationId === "string" &&
    typeof item.operationName === "string" &&
    typeof item.commit === "string" &&
    ["prepared", "locked", "analyzing", "committing"].includes(String(item.phase)) &&
    typeof item.startedAt === "string" &&
    typeof item.updatedAt === "string" &&
    !!item.metadata && typeof item.metadata === "object" && !Array.isArray(item.metadata);
}

function isMissing(error: unknown): boolean {
  return !!error && typeof error === "object" && "code" in error && error.code === "ENOENT";
}