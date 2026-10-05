import { mkdir, readFile, rename, unlink, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";

export class JsonTestResultStore<T = unknown> {
  constructor(private readonly directory: string) {}

  async save(key: string, result: T): Promise<void> {
    const path = join(this.directory, encodeURIComponent(key) + ".json");
    await mkdir(dirname(path), { recursive: true });
    const temp = path + "." + process.pid + "." + Date.now() + ".tmp";
    try {
      await writeFile(temp, JSON.stringify(result), "utf8");
      await rename(temp, path);
    } catch (error) {
      await unlink(temp).catch(() => {});
      throw error;
    }
  }

  async get(key: string): Promise<T | null> {
    try {
      return JSON.parse(await readFile(join(this.directory, encodeURIComponent(key) + ".json"), "utf8")) as T;
    } catch {
      return null;
    }
  }
}
