import type { BranchChangeSet } from "../change-set.js";
import type { TestGapSummary } from "../impact/test-gap.js";
import type { TestImpactSummary } from "../impact/test-impact.js";
import type { ExecutionPlan } from "../workflow/execution-plan.js";

export type ReviewDecision = "READY" | "NEEDS_REVIEW" | "HIGH_RISK" | "BLOCKED" | "INCONCLUSIVE";
export type ReviewRisk = "LOW" | "MEDIUM" | "HIGH" | "UNKNOWN";

export interface BranchReview {
  readonly schemaVersion: 1;
  readonly decision: ReviewDecision;
  readonly risk: ReviewRisk;
  readonly reasons: readonly string[];
  readonly uncertainty: readonly string[];
  readonly changeSet: BranchChangeSet;
  readonly changedSymbolIds: readonly string[];
  readonly removedSymbolIds?: readonly string[];
  readonly affectedSymbolIds: readonly string[];
  readonly testGaps: TestGapSummary;
  readonly testImpact: TestImpactSummary;
  readonly executionPlan: ExecutionPlan;
}
