import { mkdir, open, readFile, rename, rm } from "node:fs/promises";
import { randomUUID } from "node:crypto";
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
        const ownerId = randomUUID();
        const handle = await open(this.path, "wx");
        try {
          await handle.writeFile(JSON.stringify({ ownerId, pid: process.pid, createdAt: new Date().toISOString() }), "utf8");
        } finally {
          await handle.close();
        }
        let released = false;
        return async () => {
          if (released) return;
          released = true;
          await this.release(ownerId);
        };
      } catch (error) {
        if (!isAlreadyExists(error)) throw error;
        if (await this.takeOverIfStale(staleAfterMs)) continue;
        if (Date.now() >= deadline) throw new Error("Timed out waiting for index lock: " + this.path);
        await delay(retryDelayMs);
      }
    }
  }

  private async takeOverIfStale(staleAfterMs: number): Promise<boolean> {
    try {
      const raw = await readFile(this.path, "utf8");
      const value = JSON.parse(raw) as { createdAt?: unknown };
      const createdAt = typeof value.createdAt === "string" ? Date.parse(value.createdAt) : NaN;
      if (Number.isFinite(createdAt) && Date.now() - createdAt <= staleAfterMs) return false;
      const stalePath = this.path + ".stale-" + randomUUID();
      try {
        await rename(this.path, stalePath);
      } catch (error) {
        if (isAlreadyExists(error)) return false;
        const code = error && typeof error === "object" && "code" in error ? error.code : undefined;
        if (code === "ENOENT") return false;
        throw error;
      }
      await rm(stalePath, { force: true });
      return true;
    } catch {
      return false;
    }
  }

  private async release(ownerId: string): Promise<void> {
    try {
      const raw = await readFile(this.path, "utf8");
      const value = JSON.parse(raw) as { ownerId?: unknown };
      if (value.ownerId !== ownerId) return;
      await rm(this.path, { force: true });
    } catch {}
  }
}

function isAlreadyExists(error: unknown): boolean {
  return !!error && typeof error === "object" && "code" in error && error.code === "EEXIST";
}

function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}
