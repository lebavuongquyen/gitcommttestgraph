import type { ChangeIntelligenceResult } from "./change-intelligence.js";

export type CiFormat = "json" | "sarif" | "summary";

export interface CiAnalysisResult {
  readonly schemaVersion: 1;
  readonly repository: string;
  readonly commit: string;
  readonly status: "PASS" | "FAIL" | "UNKNOWN";
  readonly exitCode: 0 | 1 | 2;
  readonly risk: "LOW" | "MEDIUM" | "HIGH" | "UNKNOWN";
  readonly reasons: readonly string[];
  readonly uncertainty: readonly { code: string; message: string }[];
  readonly changedPathCount: number;
  readonly changedSymbolCount: number;
  readonly impactedTestCases: number;
  readonly intelligence: ChangeIntelligenceResult;
  readonly deterministic: true;
}
