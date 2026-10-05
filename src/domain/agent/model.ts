import type { Evidence } from "../evidence/model.js";
import type { TestGapSummary } from "../impact/test-gap.js";
import type { TestImpactSummary } from "../impact/test-impact.js";
import type { ExecutionPlan } from "../workflow/execution-plan.js";
import type { WorkflowExecutionResult } from "../workflow/execution-result.js";

export interface AgentGraphDiff {
  readonly fromCommit: string;
  readonly toCommit: string;
  readonly addedNodes: readonly string[];
  readonly removedNodes: readonly string[];
  readonly changedNodes: readonly string[];
  readonly addedEdges: readonly string[];
  readonly removedEdges: readonly string[];
}

export type AgentTaskStatus = "PLANNED" | "ANALYZING" | "AWAITING_EXECUTION_APPROVAL" | "EXECUTING" | "COMPLETED" | "FAILED" | "BLOCKED";
export type AgentDecision = "SAFE" | "UNSAFE" | "INCONCLUSIVE";

export interface AgentTaskPolicy {
  readonly allowExecution: boolean;
  readonly requireAllImpactedTests: boolean;
  readonly failOnUnknown: boolean;
  readonly failOnNoCommand: boolean;
  readonly maxExecutionSteps: number;
}

export interface AgentTask {
  readonly taskId: string;
  readonly goal: string;
  readonly repository: string;
  readonly commit: string;
  readonly parentCommit?: string;
  readonly policy: AgentTaskPolicy;
  readonly status: AgentTaskStatus;
  readonly decision?: AgentDecision;
  readonly reasons: readonly string[];
  readonly uncertainty: readonly string[];
  readonly changedSymbolIds: readonly string[];
  readonly diff?: AgentGraphDiff;
  readonly testGaps?: TestGapSummary;
  readonly testImpact?: TestImpactSummary;
  readonly executionPlan?: ExecutionPlan;
  readonly executionResult?: WorkflowExecutionResult;
  readonly evidence: readonly Evidence[];
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface AgentTaskResult extends AgentTask {}
