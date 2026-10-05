import type { ExecutionCommand, ExecutionPlan, ExecutionStepStatus } from "./execution-plan.js";

export interface WorkflowExecutionResult {
  readonly schemaVersion: 1;
  readonly workflow: "git-code-test-impact";
  readonly repository: string;
  readonly commit: string;
  readonly startedAt: string;
  readonly finishedAt: string;
  readonly passed: boolean;
  readonly steps: readonly WorkflowStepResult[];
}

export interface WorkflowStepResult {
  readonly stepId: string;
  readonly status: "PASSED" | "FAILED" | "BLOCKED" | "SKIPPED" | "NO_COMMAND";
  readonly command?: ExecutionCommand;
  readonly exitCode?: number;
  readonly stdout?: string;
  readonly stderr?: string;
  readonly startedAt: string;
  readonly finishedAt: string;
}

export interface WorkflowRunner {
  execute(plan: ExecutionPlan): Promise<WorkflowExecutionResult>;
}

export function isRunnableStatus(status: ExecutionStepStatus): status is "RUNNABLE" {
  return status === "RUNNABLE";
}
