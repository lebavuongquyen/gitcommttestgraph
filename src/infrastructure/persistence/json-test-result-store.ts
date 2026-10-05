import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";

export class JsonTestResultStore<T = unknown> {
  constructor(private readonly directory: string) {}
  async save(key: string, result: T): Promise<void> {
    const path = join(this.directory, encodeURIComponent(key) + ".json");
    await mkdir(dirname(path), { recursive: true });
    await writeFile(path, JSON.stringify(result), "utf8");
  }
  async get(key: string): Promise<T | null> {
    try { return JSON.parse(await readFile(join(this.directory, encodeURIComponent(key) + ".json"), "utf8")) as T; }
    catch { return null; }
  }
}
