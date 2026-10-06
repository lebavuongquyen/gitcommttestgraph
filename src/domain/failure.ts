import { sanitizeErrorMessage } from "./security/policy.js";
import type { GctgError } from "./errors.js";

export type FailureCategory =
  | "validation"
  | "git"
  | "analysis"
  | "storage"
  | "corruption"
  | "resource"
  | "execution"
  | "external_provider"
  | "recovery";

export interface FailureClassification {
  readonly category: FailureCategory;
  readonly code: string;
  readonly message: string;
  readonly retryable: boolean;
}

export function classifyFailure(error: unknown): FailureClassification {
  const candidate = error as Partial<GctgError> & { code?: unknown };
  const code = typeof candidate.code === "string" ? candidate.code : "UNKNOWN_ERROR";
  const message = sanitizeErrorMessage(
    error && typeof error === "object" && typeof (error as { message?: unknown }).message === "string"
      ? (error as { message: string }).message
      : error
  );
  const mapping: Record<string, FailureClassification["category"]> = {
    INVALID_COMMIT: "validation",
    UNSUPPORTED_LANGUAGE: "validation",
    UNSUPPORTED_FRAMEWORK: "validation",
    REPOSITORY_NOT_FOUND: "git",
    GIT_OPERATION_FAILED: "git",
    PARSE_FAILED: "analysis",
    RESOLUTION_FAILED: "analysis",
    INDEX_CORRUPT: "corruption",
    TEST_EXECUTION_FAILED: "execution"
  };
  const category = mapping[code] ?? inferCategory(message);
  return {
    category,
    code,
    message,
    retryable: category === "git" || category === "resource" || category === "external_provider"
  };
}

function inferCategory(message: string): FailureCategory {
  if (/github|pull request|provider|http 5\d\d/i.test(message)) return "external_provider";
  if (/out of memory|enospc|resource|worker|quota/i.test(message)) return "resource";
  if (/backup|restore|repair|rehydrat|recovery/i.test(message)) return "recovery";
  if (/json|snapshot|manifest|storage|disk|file/i.test(message)) return "storage";
  return "analysis";
}
