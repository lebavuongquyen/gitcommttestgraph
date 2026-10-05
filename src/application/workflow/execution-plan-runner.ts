import type { ExecutionPlan, ExecutionStep } from "../../domain/workflow/execution-plan.js";
import type { WorkflowExecutionResult, WorkflowRunner, WorkflowStepResult } from "../../domain/workflow/execution-result.js";

export interface ProcessExecutor {
  run(command: { readonly executable: string; readonly args: readonly string[]; readonly cwd: string }): Promise<{ readonly exitCode: number; readonly stdout: string; readonly stderr: string }>;
}

export class ExecutionPlanRunner implements WorkflowRunner {
  constructor(private readonly executor: ProcessExecutor) {}

  async execute(plan: ExecutionPlan): Promise<WorkflowExecutionResult> {
    const startedAt = new Date().toISOString();
    const results: WorkflowStepResult[] = [];
    const completed = new Map<string, WorkflowStepResult["status"]>();

    for (const step of plan.steps) {
      const result = await this.executeStep(step, completed);
      results.push(result);
      completed.set(step.id, result.status);
      if (result.status === "FAILED") break;
    }

    for (const step of plan.steps.slice(results.length)) {
      const now = new Date().toISOString();
      results.push(this.baseResult(step, "SKIPPED", now, now));
    }

    const finishedAt = new Date().toISOString();
    return {
      schemaVersion: 1,
      workflow: "git-code-test-impact",
      repository: plan.repository,
      commit: plan.commit,
      startedAt,
      finishedAt,
      passed: results.every(result => result.status === "PASSED" || result.status === "NO_COMMAND"),
      steps: results
    };
  }

  private async executeStep(step: ExecutionStep, completed: Map<string, WorkflowStepResult["status"]>): Promise<WorkflowStepResult> {
    const startedAt = new Date().toISOString();
    if (step.status !== "RUNNABLE" || !step.command) {
      return this.baseResult(step, step.status === "IMPACTED_NO_COMMAND" ? "NO_COMMAND" : "BLOCKED", startedAt, new Date().toISOString());
    }
    if (step.dependsOn.some(id => completed.get(id) !== "PASSED")) {
      return { ...this.baseResult(step, "BLOCKED", startedAt, new Date().toISOString()), command: step.command };
    }
    try {
      const process = await this.executor.run(step.command);
      return {
        ...this.baseResult(step, process.exitCode === 0 ? "PASSED" : "FAILED", startedAt, new Date().toISOString()),
        command: step.command,
        exitCode: process.exitCode,
        stdout: process.stdout,
        stderr: process.stderr
      };
    } catch (error) {
      return {
        ...this.baseResult(step, "FAILED", startedAt, new Date().toISOString()),
        command: step.command,
        exitCode: -1,
        stderr: error instanceof Error ? error.message : String(error)
      };
    }
  }

  private baseResult(step: ExecutionStep, status: WorkflowStepResult["status"], startedAt: string, finishedAt: string): WorkflowStepResult {
    return {
      stepId: step.id,
      status,
      testCaseIds: [...step.affectedTestCaseIds],
      affectedSymbolIds: [...step.affectedSymbolIds],
      startedAt,
      finishedAt
    };
  }
}
