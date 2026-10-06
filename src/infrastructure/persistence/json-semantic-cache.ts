import { dirname, join } from "node:path";
import { mkdir, readFile, rename, rm, writeFile } from "node:fs/promises";
import type { SemanticCache } from "../../application/ports/semantic-cache.js";
import type { SemanticStorage } from "../../application/ports/semantic-storage.js";
import type { SourceAnalysis } from "../../application/ports/source-analyzer.js";

export class JsonSemanticCache implements SemanticCache, SemanticStorage {
  constructor(private readonly root: string) {}

  async get(key: string): Promise<SourceAnalysis | null> {
    try {
      const value = JSON.parse(await readFile(join(this.root, key.slice(0, 2), key + ".json"), "utf8")) as SourceAnalysis;
      if (!Array.isArray(value.nodes) || !Array.isArray(value.edges)) return null;
      return value;
    } catch {
      return null;
    }
  }

  async save(key: string, analysis: SourceAnalysis): Promise<void> {
    const path = join(this.root, key.slice(0, 2), key + ".json");
    const temp = path + ".tmp-" + process.pid + "-" + Date.now();
    await mkdir(dirname(path), { recursive: true });
    try {
      await writeFile(temp, JSON.stringify(analysis), "utf8");
      await rename(temp, path);
    } catch (error) {
      await rm(temp, { force: true });
      if (isAlreadyExists(error)) return;
      throw error;
    }
  }
}

function isAlreadyExists(error: unknown): boolean {
  return !!error && typeof error === "object" && "code" in error && error.code === "EEXIST";
}
