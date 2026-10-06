import type { Evidence } from "./evidence/model.js";

export type HistoricalTransitionKind = "ADDED" | "REMOVED" | "CHANGED";
export type TestImpactTransitionKind = "BECAME_IMPACTED" | "CEASED_IMPACTED";
export type HistoricalConfidence = "EXACT" | "MEDIUM" | "LOW";

export interface HistoricalCommit {
  readonly hash: string;
  readonly parents: readonly string[];
  readonly timestamp: string;
  readonly message: string;
  readonly merge: boolean;
}

export interface HistoricalSymbolTransition {
  readonly kind: HistoricalTransitionKind;
  readonly fromCommit: string;
  readonly toCommit: string;
  readonly symbolId: string;
  readonly name: string;
  readonly symbolKind: string;
  readonly filePath?: string;
  readonly confidence: HistoricalConfidence;
  readonly evidence: readonly Evidence[];
}

export interface HistoricalDependencyTransition {
  readonly kind: HistoricalTransitionKind;
  readonly fromCommit: string;
  readonly toCommit: string;
  readonly edgeType: string;
  readonly sourceId: string;
  readonly targetId: string;
  readonly confidence: HistoricalConfidence;
  readonly evidence: readonly Evidence[];
}

export interface HistoricalTestImpactTransition {
  readonly kind: TestImpactTransitionKind;
  readonly fromCommit: string;
  readonly toCommit: string;
  readonly testCaseId: string;
  readonly changedSymbolIds: readonly string[];
  readonly evidence: readonly Evidence[];
}

export interface HistoricalUncertainty {
  readonly code: string;
  readonly message: string;
  readonly confidence: HistoricalConfidence;
}

export interface HistoricalIntelligence {
  readonly schemaVersion: 1;
  readonly repository: string;
  readonly fromCommit: string;
  readonly toCommit: string;
  readonly commits: readonly HistoricalCommit[];
  readonly symbolTransitions: readonly HistoricalSymbolTransition[];
  readonly dependencyTransitions: readonly HistoricalDependencyTransition[];
  readonly testImpactTransitions: readonly HistoricalTestImpactTransition[];
  readonly evidence: readonly Evidence[];
  readonly uncertainty: readonly HistoricalUncertainty[];
  readonly deterministic: true;
}
