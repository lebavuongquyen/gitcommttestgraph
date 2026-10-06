export type PullRequestReviewState = "APPROVED" | "CHANGES_REQUESTED" | "COMMENTED" | "PENDING" | "UNKNOWN";

export interface PullRequestCheck {
  readonly name: string;
  readonly status: "QUEUED" | "IN_PROGRESS" | "COMPLETED" | "UNKNOWN";
  readonly conclusion?: string;
}

export interface PullRequestMetadata {
  readonly number: number;
  readonly title: string;
  readonly body?: string;
  readonly author?: string;
  readonly draft: boolean;
  readonly labels: readonly string[];
  readonly reviewers: readonly string[];
  readonly reviewState: PullRequestReviewState;
  readonly checks: readonly PullRequestCheck[];
  readonly mergeable?: boolean;
  readonly url?: string;
}

export interface PullRequestReview {
  readonly schemaVersion: 1;
  readonly decision: "READY" | "NEEDS_REVIEW" | "HIGH_RISK" | "BLOCKED" | "INCONCLUSIVE";
  readonly risk: "LOW" | "MEDIUM" | "HIGH" | "UNKNOWN";
  readonly reasons: readonly string[];
  readonly uncertainty: readonly string[];
  readonly pullRequest: PullRequestMetadata;
  readonly changeSet: import("../change-set.js").PullRequestChangeSet;
  readonly changedSymbolIds: readonly string[];
  readonly removedSymbolIds: readonly string[];
  readonly affectedSymbolIds: readonly string[];
  readonly testGaps: import("../impact/test-gap.js").TestGapSummary;
  readonly testImpact: import("../impact/test-impact.js").TestImpactSummary;
  readonly executionPlan: import("../workflow/execution-plan.js").ExecutionPlan;
}
