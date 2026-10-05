import type { GraphSnapshot } from "../../domain/graph/model.js";
import type { AgentTask, AgentTaskPolicy, AgentTaskResult, AgentDecision } from "../../domain/agent/model.js";
import { TestGapAnalyzer } from "../impact/test-gap-analyzer.js";
import { TestImpactAnalyzer } from "../impact/test-impact-analyzer.js";
import { buildExecutionPlan } from "../workflow/execution-plan-builder.js";
import type { GraphDiff } from "../analysis/graph-diff.js";
import { ExecutionPlanRunner, type ProcessExecutor } from "../workflow/execution-plan-runner.js";
import type { WorkflowExecutionResult } from "../../domain/workflow/execution-result.js";

export interface AgentAnalysisInput {
  readonly taskId: string;
  readonly goal: string;
  readonly repository: string;
  readonly commit: string;
  readonly parentCommit?: string;
  readonly current: GraphSnapshot;
  readonly changedSymbolIds: readonly string[];
  readonly diff?: GraphDiff;
  readonly policy: AgentTaskPolicy;
}

export class AgentTaskService {
  private readonly tasks = new Map<string, AgentTask>();
  private readonly gapAnalyzer = new TestGapAnalyzer();
  private readonly impactAnalyzer = new TestImpactAnalyzer();

  analyze(input: AgentAnalysisInput): AgentTaskResult {
    const started = now();
    const task: AgentTask = {
      taskId: input.taskId,
      goal: input.goal,
      repository: input.repository,
      commit: input.commit,
      ...(input.parentCommit ? { parentCommit: input.parentCommit } : {}),
      policy: normalizePolicy(input.policy),
      status: "ANALYZING",
      reasons: [],
      uncertainty: [],
      changedSymbolIds: [...input.changedSymbolIds].sort(),
      ...(input.diff ? { diff: input.diff } : {}),
      evidence: [],
      createdAt: started,
      updatedAt: started
    };
    const coverage = this.gapAnalyzer.analyze(input.current, { changedNodeIds: input.changedSymbolIds });
    const testImpact = this.impactAnalyzer.analyze(input.current, { changedSymbolIds: input.changedSymbolIds, coverageLinks: coverage.coverageLinks });
    const executionPlan = buildExecutionPlan({
      repository: input.repository,
      commit: input.commit,
      nodes: input.current.nodes,
      edges: input.current.edges,
      impacts: testImpact.impacts
    });

    const reasons: string[] = [];
    const uncertainty: string[] = [];
    const runnable = executionPlan.steps.filter(step => step.status === "RUNNABLE");
    const noCommand = executionPlan.steps.filter(step => step.status === "IMPACTED_NO_COMMAND");
    const highGaps = coverage.gaps.filter(gap => input.changedSymbolIds.includes(gap.symbolId) && gap.severity === "HIGH");

    if (highGaps.length) reasons.push(highGaps.length + " changed symbols have HIGH test gaps.");
    if (input.policy.failOnNoCommand && noCommand.length) reasons.push(noCommand.length + " impacted test projects have no runnable command.");
    if (input.policy.failOnUnknown && coverage.unknown > 0) reasons.push(coverage.unknown + " testable areas have UNKNOWN coverage.");
    if (!input.policy.allowExecution) uncertainty.push("Runtime execution was not authorized; static analysis cannot prove test PASS.");
    if (!runnable.length && testImpact.impactedTestCases > 0) uncertainty.push("Impacted tests were discovered but no runnable execution step exists.");
    if (coverage.unknown > 0) uncertainty.push("Some coverage is UNKNOWN because static analysis cannot establish it.");

    let decision: AgentDecision = "INCONCLUSIVE";
    if (reasons.length) decision = "UNSAFE";
    else if (input.policy.allowExecution && runnable.length === 0 && testImpact.impactedTestCases === 0 && coverage.unknown === 0) decision = "SAFE";

    const status = input.policy.allowExecution && runnable.length ? "AWAITING_EXECUTION_APPROVAL" : "COMPLETED";
    const completed: AgentTask = {
      ...task,
      status,
      decision,
      reasons,
      uncertainty,
      testGaps: coverage,
      testImpact,
      executionPlan,
      updatedAt: now()
    };
    this.tasks.set(input.taskId, completed);
    return completed;
  }

  async execute(taskId: string, executor: ProcessExecutor): Promise<AgentTaskResult> {
    const current = this.tasks.get(taskId);
    if (!current) throw new Error("Agent task not found: " + taskId);
    if (!current.policy.allowExecution) throw new Error("Execution is not authorized by task policy.");
    if (!current.executionPlan) throw new Error("Agent task has no execution plan.");
    if (current.executionPlan.steps.length > current.policy.maxExecutionSteps) throw new Error("Execution plan exceeds policy maxExecutionSteps.");
    this.tasks.set(taskId, { ...current, status: "EXECUTING", updatedAt: now() });
    const executionResult = await new ExecutionPlanRunner(executor).execute(current.executionPlan);
    const decision = deriveRuntimeDecision(current, executionResult);
    const finalTask: AgentTask = {
      ...current,
      status: "COMPLETED",
      decision,
      executionResult,
      reasons: [...current.reasons, ...runtimeReasons(executionResult)],
      updatedAt: now()
    };
    this.tasks.set(taskId, finalTask);
    return finalTask;
  }

  get(taskId: string): AgentTaskResult | undefined {
    return this.tasks.get(taskId);
  }
}

function normalizePolicy(policy: AgentTaskPolicy): AgentTaskPolicy {
  return {
    allowExecution: Boolean(policy.allowExecution),
    requireAllImpactedTests: Boolean(policy.requireAllImpactedTests),
    failOnUnknown: Boolean(policy.failOnUnknown),
    failOnNoCommand: Boolean(policy.failOnNoCommand),
    maxExecutionSteps: Math.max(1, Math.floor(policy.maxExecutionSteps || 20))
  };
}

function deriveRuntimeDecision(task: AgentTask, result: WorkflowExecutionResult): AgentDecision {
  const expected = task.executionPlan?.steps.filter(step => step.status === "RUNNABLE").length ?? 0;
  const passed = result.steps.filter(step => step.status === "PASSED").length;
  const failed = result.steps.some(step => step.status === "FAILED" || step.status === "BLOCKED");
  if (failed) return "UNSAFE";
  if (task.policy.requireAllImpactedTests && passed < expected) return "INCONCLUSIVE";
  return result.passed ? "SAFE" : "INCONCLUSIVE";
}

function runtimeReasons(result: WorkflowExecutionResult): string[] {
  return result.steps.filter(step => step.status === "FAILED" || step.status === "BLOCKED").map(step => "Runtime step " + step.stepId + " finished with " + step.status + ".");
}

function now() {
  return new Date().toISOString();
}
