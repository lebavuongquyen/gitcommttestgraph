import type { Evidence } from "../evidence/model.js";

export type TestImpactRelation = "DIRECT" | "INDIRECT" | "BEHAVIORAL" | "UNKNOWN";

export interface TestImpact {
  readonly testProjectId: string;
  readonly testFileId: string;
  readonly testCaseId: string;
  readonly testCommand?: {
    readonly executable: string;
    readonly args: readonly string[];
    readonly cwd: string;
  };
  readonly relation: TestImpactRelation;
  readonly changedSymbolIds: readonly string[];
  readonly affectedSymbolIds: readonly string[];
  readonly evidence: readonly Evidence[];
}

export interface TestImpactSummary {
  readonly changedSymbols: number;
  readonly affectedSymbols: number;
  readonly impactedTestCases: number;
  readonly impactedTestFiles: number;
  readonly impactedTestProjects: number;
  readonly runnableCommands: readonly {
    readonly testProjectId: string;
    readonly executable: string;
    readonly args: readonly string[];
    readonly cwd: string;
  }[];
  readonly impacts: readonly TestImpact[];
}
