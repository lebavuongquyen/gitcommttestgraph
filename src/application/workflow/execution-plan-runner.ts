import { runProcess } from "../../infrastructure/process/command-runner.js";
import type { ExecutionPlan, ExecutionStep } from "../../domain/workflow/execution-plan.js";
import type { WorkflowExecutionResult, WorkflowRunner, WorkflowStepResult } from "../../domain/workflow/execution-result.js";

export interface ProcessExecutor {
  run(command: { readonly executable: string; readonly args: readonly string[]; readonly cwd: string }): Promise<{ readonly exitCode: number; readonly stdout: string; readonly stderr: string }>;
}

export class DefaultProcessExecutor implements ProcessExecutor {
  async run(command: { readonly executable: string; readonly args: readonly string[]; readonly cwd: string }) {
    return runProcess(command);
  }
}

export class ExecutionPlanRunner implements WorkflowRunner {
  constructor(private readonly executor: ProcessExecutor = new DefaultProcessExecutor()) {}

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
      results.push({ stepId: step.id, status: "SKIPPED", startedAt: now, finishedAt: now });
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
      return { stepId: step.id, status: step.status === "IMPACTED_NO_COMMAND" ? "NO_COMMAND" : "BLOCKED", startedAt, finishedAt: new Date().toISOString() };
    }
    if (step.dependsOn.some(id => completed.get(id) !== "PASSED")) {
      return { stepId: step.id, status: "BLOCKED", command: step.command, startedAt, finishedAt: new Date().toISOString() };
    }
    try {
      const process = await this.executor.run(step.command);
      return {
        stepId: step.id,
        status: process.exitCode === 0 ? "PASSED" : "FAILED",
        command: step.command,
        exitCode: process.exitCode,
        stdout: process.stdout,
        stderr: process.stderr,
        startedAt,
        finishedAt: new Date().toISOString()
      };
    } catch (error) {
      return {
        stepId: step.id,
        status: "FAILED",
        command: step.command,
        exitCode: -1,
        stderr: error instanceof Error ? error.message : String(error),
        startedAt,
        finishedAt: new Date().toISOString()
      };
    }
  }
}
