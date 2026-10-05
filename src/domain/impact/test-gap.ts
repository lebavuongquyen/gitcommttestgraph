import type { Evidence } from "../evidence/model.js";

export type TestCoverageKind = "DIRECT" | "INDIRECT" | "BEHAVIORAL" | "UNTESTED" | "UNKNOWN";
export type TestGapSeverity = "HIGH" | "MEDIUM" | "LOW";

export interface TestGap {
  readonly symbolId: string;
  readonly filePath: string;
  readonly symbolName: string;
  readonly packageId?: string;
  readonly severity: TestGapSeverity;
  readonly coverage: TestCoverageKind;
  readonly evidence: readonly Evidence[];
  readonly suggestedTestFiles: readonly string[];
}

export interface TestGapSummary {
  readonly symbols: number;
  readonly tested: number;
  readonly indirectlyTested: number;
  readonly untested: number;
  readonly unknown: number;
  readonly gaps: readonly TestGap[];
}
