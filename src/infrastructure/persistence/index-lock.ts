import { mkdir, open, readFile, rm } from "node:fs/promises";
import { dirname } from "node:path";

export interface IndexLockOptions {
  readonly staleAfterMs?: number;
  readonly retryDelayMs?: number;
  readonly timeoutMs?: number;
}

export class IndexLock {
  constructor(private readonly path: string, private readonly options: IndexLockOptions = {}) {}

  async acquire(): Promise<() => Promise<void>> {
    const staleAfterMs = this.options.staleAfterMs ?? 10 * 60_000;
    const retryDelayMs = this.options.retryDelayMs ?? 100;
    const timeoutMs = this.options.timeoutMs ?? 30_000;
    const deadline = Date.now() + timeoutMs;
    await mkdir(dirname(this.path), { recursive: true });

    while (true) {
      try {
        const handle = await open(this.path, "wx");
        await handle.writeFile(JSON.stringify({ pid: process.pid, createdAt: new Date().toISOString() }), "utf8");
        await handle.close();
        let released = false;
        return async () => {
          if (released) return;
          released = true;
          await rm(this.path, { force: true });
        };
      } catch (error) {
        if (!isAlreadyExists(error)) throw error;
        if (await this.isStale(staleAfterMs)) {
          await rm(this.path, { force: true });
          continue;
        }
        if (Date.now() >= deadline) throw new Error("Timed out waiting for index lock: " + this.path);
        await delay(retryDelayMs);
      }
    }
  }

  private async isStale(staleAfterMs: number): Promise<boolean> {
    try {
      const raw = await readFile(this.path, "utf8");
      const value = JSON.parse(raw) as { createdAt?: unknown };
      const createdAt = typeof value.createdAt === "string" ? Date.parse(value.createdAt) : NaN;
      return !Number.isFinite(createdAt) || Date.now() - createdAt > staleAfterMs;
    } catch {
      return true;
    }
  }
}

function isAlreadyExists(error: unknown): boolean {
  return !!error && typeof error === "object" && "code" in error && error.code === "EEXIST";
}

function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}
