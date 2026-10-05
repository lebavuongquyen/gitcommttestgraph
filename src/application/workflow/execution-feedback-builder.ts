import type { ExecutionPlan } from "../../domain/workflow/execution-plan.js";
import type { WorkflowExecutionResult } from "../../domain/workflow/execution-result.js";
import { buildExecutionFeedback, type ExecutionFeedback } from "../../domain/workflow/execution-feedback.js";

export function buildWorkflowExecutionFeedback(plan: ExecutionPlan, result: WorkflowExecutionResult): ExecutionFeedback {
  const testCaseIdsByStep = new Map(plan.steps.map((step) => [step.id, step.affectedTestCaseIds]));
  const affectedSymbolIdsByStep = new Map(plan.steps.map((step) => [step.id, step.affectedSymbolIds]));
  return buildExecutionFeedback(result, testCaseIdsByStep, affectedSymbolIdsByStep);
}
