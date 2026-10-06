import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import type { OperationHistoryStore } from "../../application/ports/operation-history.js";
import type { OperationRecord } from "../../domain/operation.js";
import { assertSafeRepositoryPath, sanitizeErrorMessage } from "../../domain/security/policy.js";

const DEFAULT_LIMIT = 100;

export class JsonOperationHistoryStore implements OperationHistoryStore {
  constructor(private readonly limit = DEFAULT_LIMIT) {}

  async load(repositoryRoot: string): Promise<readonly OperationRecord[]> {
    const path = assertSafeRepositoryPath(repositoryRoot, ".gctg/operations.json");
    try {
      const parsed = JSON.parse(await readFile(path, "utf8")) as unknown;
      if (!Array.isArray(parsed)) return [];
      return parsed.filter(isOperationRecord).slice(-this.limit);
    } catch (error) {
      if (isMissing(error)) return [];
      throw new Error("Unable to read GCTG operation history.");
    }
  }

  async save(repositoryRoot: string, records: readonly OperationRecord[]): Promise<void> {
    const directory = assertSafeRepositoryPath(repositoryRoot, ".gctg");
    const path = assertSafeRepositoryPath(repositoryRoot, ".gctg/operations.json");
    const temporary = assertSafeRepositoryPath(repositoryRoot, ".gctg/operations.json.tmp");
    const bounded = records.slice(-this.limit).map(sanitizeOperation);
    await mkdir(directory, { recursive: true });
    await writeFile(temporary, JSON.stringify(bounded, null, 2) + "\n", "utf8");
    await rename(temporary, path);
  }
}

function sanitizeOperation(operation: OperationRecord): OperationRecord {
  return {
    ...operation,
    ...(operation.error ? { error: sanitizeErrorMessage(operation.error) } : {}),
    metadata: sanitizeMetadata(operation.metadata)
  };
}

function sanitizeMetadata(value: Readonly<Record<string, unknown>>): Readonly<Record<string, unknown>> {
  const result: Record<string, unknown> = {};
  for (const [key, item] of Object.entries(value)) {
    if (/token|secret|password|authorization|cookie|api[_-]?key|credential/i.test(key)) continue;
    result[key] = sanitizeValue(item, 0);
  }
  return result;
}

function sanitizeValue(value: unknown, depth: number): unknown {
  if (depth > 3) return "[TRUNCATED]";
  if (value === null || typeof value === "string" || typeof value === "number" || typeof value === "boolean") return value;
  if (Array.isArray(value)) return value.slice(0, 20).map(item => sanitizeValue(item, depth + 1));
  if (typeof value === "object") {
    const result: Record<string, unknown> = {};
    for (const [key, item] of Object.entries(value as Record<string, unknown>)) {
      if (/token|secret|password|authorization|cookie|api[_-]?key|credential/i.test(key)) continue;
      result[key] = sanitizeValue(item, depth + 1);
    }
    return result;
  }
  return String(value);
}

function isOperationRecord(value: unknown): value is OperationRecord {
  if (!value || typeof value !== "object") return false;
  const item = value as Record<string, unknown>;
  return typeof item.id === "string" &&
    typeof item.name === "string" &&
    ["queued", "running", "succeeded", "failed", "cancelled", "recovered"].includes(String(item.state)) &&
    typeof item.startedAt === "string" &&
    (!("finishedAt" in item) || typeof item.finishedAt === "string") &&
    (!("parentId" in item) || typeof item.parentId === "string") &&
    (!("error" in item) || typeof item.error === "string") &&
    (!("failureCategory" in item) || ["validation", "git", "analysis", "storage", "corruption", "resource", "execution", "external_provider", "recovery"].includes(String(item.failureCategory))) &&
    !!item.metadata && typeof item.metadata === "object" && !Array.isArray(item.metadata);
}

function isMissing(error: unknown): boolean {
  return !!error && typeof error === "object" && "code" in error && error.code === "ENOENT";
}
