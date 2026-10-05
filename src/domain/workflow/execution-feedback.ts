import type { WorkflowExecutionResult, WorkflowStepResult } from "./execution-result.js";

export type ExecutionFeedbackStatus = "PASSED" | "FAILED" | "BLOCKED" | "SKIPPED" | "NO_COMMAND";

export interface ExecutionFeedbackItem {
  readonly stepId: string;
  readonly status: ExecutionFeedbackStatus;
  readonly testCaseIds: readonly string[];
  readonly affectedSymbolIds: readonly string[];
}

export interface ExecutionFeedback {
  readonly schemaVersion: 1;
  readonly workflow: "git-code-test-impact";
  readonly repository: string;
  readonly commit: string;
  readonly executionId: string;
  readonly startedAt: string;
  readonly finishedAt: string;
  readonly passed: boolean;
  readonly passedTestCases: readonly string[];
  readonly failedTestCases: readonly string[];
  readonly skippedTestCases: readonly string[];
  readonly unexecutedTestCases: readonly string[];
  readonly affectedSymbolsWithPassingTests: readonly string[];
  readonly affectedSymbolsWithFailingTests: readonly string[];
  readonly items: readonly ExecutionFeedbackItem[];
}

export function executionId(result: WorkflowExecutionResult): string {
  return `execution:${result.repository}:${result.commit}:${result.startedAt}`;
}

export function buildExecutionFeedback(result: WorkflowExecutionResult, testCaseIdsByStep: ReadonlyMap<string, readonly string[]>, affectedSymbolIdsByStep: ReadonlyMap<string, readonly string[]>): ExecutionFeedback {
  const items = result.steps.map((step) => toFeedbackItem(step, testCaseIdsByStep.get(step.stepId) ?? [], affectedSymbolIdsByStep.get(step.stepId) ?? []));
  const passedTestCases = collect(items, "PASSED");
  const failedTestCases = collect(items, "FAILED");
  const skippedTestCases = collect(items, "SKIPPED");
  const unexecutedTestCases = unique(items.flatMap((item) => item.status === "NO_COMMAND" || item.status === "BLOCKED" ? item.testCaseIds : []));
  const affectedSymbolsWithPassingTests = unique(items.flatMap((item) => item.status === "PASSED" ? item.affectedSymbolIds : []));
  const affectedSymbolsWithFailingTests = unique(items.flatMap((item) => item.status === "FAILED" ? item.affectedSymbolIds : []));
  return {
    schemaVersion: 1,
    workflow: "git-code-test-impact",
    repository: result.repository,
    commit: result.commit,
    executionId: executionId(result),
    startedAt: result.startedAt,
    finishedAt: result.finishedAt,
    passed: result.passed,
    passedTestCases,
    failedTestCases,
    skippedTestCases,
    unexecutedTestCases,
    affectedSymbolsWithPassingTests,
    affectedSymbolsWithFailingTests,
    items,
  };
}

function toFeedbackItem(step: WorkflowStepResult, testCaseIds: readonly string[], affectedSymbolIds: readonly string[]): ExecutionFeedbackItem {
  return {
    stepId: step.stepId,
    status: step.status,
    testCaseIds: [...testCaseIds].sort(),
    affectedSymbolIds: [...affectedSymbolIds].sort(),
  };
}

function collect(items: readonly ExecutionFeedbackItem[], status: ExecutionFeedbackStatus): string[] {
  return unique(items.flatMap((item) => item.status === status ? item.testCaseIds : []));
}

function unique(values: readonly string[]): string[] {
  return [...new Set(values)].sort();
}
