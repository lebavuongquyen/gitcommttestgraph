import type { Evidence } from "../evidence/model.js";

export type ExecutionStepStatus = "RUNNABLE" | "BLOCKED" | "IMPACTED_NO_COMMAND";

export interface ExecutionCommand {
  readonly executable: string;
  readonly args: readonly string[];
  readonly cwd: string;
}

export interface ExecutionStep {
  readonly id: string;
  readonly nodeId: string;
  readonly kind: "test";
  readonly status: ExecutionStepStatus;
  readonly command?: ExecutionCommand;
  readonly dependsOn: readonly string[];
  readonly affectedTestCaseIds: readonly string[];
  readonly affectedSymbolIds: readonly string[];
  readonly evidence: readonly Evidence[];
}

export interface ExecutionPlan {
  readonly schemaVersion: 1;
  readonly workflow: "git-code-test-impact";
  readonly repository: string;
  readonly commit: string;
  readonly steps: readonly ExecutionStep[];
}
