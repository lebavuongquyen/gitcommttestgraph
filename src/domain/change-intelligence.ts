import type { ChangeSource } from "./change-set.js";
import type { Confidence, Evidence } from "./evidence/model.js";
import type { GraphDiff } from "../application/analysis/graph-diff.js";
import type { Impact } from "./impact/model.js";
import type { TestGapSummary } from "./impact/test-gap.js";
import type { TestImpactSummary } from "./impact/test-impact.js";
import type { ExecutionPlan } from "./workflow/execution-plan.js";

export type ChangeRisk = "LOW" | "MEDIUM" | "HIGH" | "UNKNOWN";

export interface ChangeUncertainty {
  readonly code: string;
  readonly message: string;
  readonly confidence: Confidence;
}

export interface UnifiedChange {
  readonly schemaVersion: 1;
  readonly source: ChangeSource;
  readonly base: string;
  readonly head: string;
  readonly mergeBase: string;
  readonly changedPathCount: number;
  readonly changedPaths: readonly ChangeSource["changedPaths"][number][];
  readonly commits: readonly string[];
  readonly diff: GraphDiff;
  readonly changedSymbolIds: readonly string[];
  readonly removedSymbolIds: readonly string[];
  readonly impact: readonly Impact[];
  readonly affectedSymbolIds: readonly string[];
  readonly testGaps: TestGapSummary;
  readonly testImpact: TestImpactSummary;
  readonly executionPlan: ExecutionPlan;
  readonly risk: ChangeRisk;
  readonly reasons: readonly string[];
  readonly uncertainty: readonly ChangeUncertainty[];
  readonly evidence: readonly Evidence[];
}

export interface ChangeIntelligenceResult {
  readonly schemaVersion: 1;
  readonly intelligence: UnifiedChange;
  readonly deterministic: true;
}
