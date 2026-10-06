import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { join } from "node:path";
import type { ConfigurationStore } from "../../application/ports/configuration.js";
import { assertSafeRepositoryPath } from "../../domain/security/policy.js";

export class JsonConfigurationStore implements ConfigurationStore {
  async load(repositoryRoot: string): Promise<unknown | undefined> {
    const path = assertSafeRepositoryPath(repositoryRoot, ".gctg/config.json");
    try {
      return JSON.parse(await readFile(path, "utf8")) as unknown;
    } catch (error) {
      if (isMissing(error)) return undefined;
      throw new Error("Unable to read GCTG configuration.");
    }
  }

  async save(repositoryRoot: string, configuration: unknown): Promise<void> {
    const directory = assertSafeRepositoryPath(repositoryRoot, ".gctg");
    const path = assertSafeRepositoryPath(repositoryRoot, ".gctg/config.json");
    const temporary = assertSafeRepositoryPath(repositoryRoot, ".gctg/config.json.tmp");
    await mkdir(directory, { recursive: true });
    await writeFile(temporary, JSON.stringify(configuration, null, 2) + "\n", "utf8");
    await rename(temporary, path);
  }
}

function isMissing(error: unknown): boolean {
  return !!error && typeof error === "object" && "code" in error && error.code === "ENOENT";
}
