import { appendFile, mkdir, readFile } from "node:fs/promises";
import { assertSafeRepositoryPath } from "../../domain/security/policy.js";
import type { ConfigurationHistoryEntry, ConfigurationHistoryStore } from "../../application/ports/configuration-history.js";

export class JsonConfigurationHistoryStore implements ConfigurationHistoryStore {
  async append(repositoryRoot: string, entry: ConfigurationHistoryEntry): Promise<void> {
    const directory = assertSafeRepositoryPath(repositoryRoot, ".gctg");
    const path = assertSafeRepositoryPath(repositoryRoot, ".gctg/config-history.jsonl");
    await mkdir(directory, { recursive: true });
    await appendFile(path, JSON.stringify(entry) + "\n", "utf8");
  }

  async load(repositoryRoot: string): Promise<readonly ConfigurationHistoryEntry[]> {
    const path = assertSafeRepositoryPath(repositoryRoot, ".gctg/config-history.jsonl");
    try {
      const raw = await readFile(path, "utf8");
      return raw.split("\n").filter(Boolean).map(line => JSON.parse(line) as ConfigurationHistoryEntry);
    } catch (error) {
      if (isMissing(error)) return [];
      throw new Error("Unable to read GCTG configuration history.");
    }
  }
}

function isMissing(error: unknown): boolean {
  return !!error && typeof error === "object" && "code" in error && error.code === "ENOENT";
}
