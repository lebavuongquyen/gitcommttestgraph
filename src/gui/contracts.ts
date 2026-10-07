export type GuiCapabilityId =
  | "repository_status" | "configuration" | "repository_ecosystem" | "monorepo_intelligence"
  | "historical_intelligence" | "ci_analysis" | "diagnostics" | "change_intelligence"
  | "test_gaps" | "test_impact" | "execution_plan" | "branch_review" | "pull_request_review"
  | "commits" | "branches" | "node" | "execution_feedback" | "run_execution_plan"
  | "overview" | "graph_view" | "graph_drilldown" | "file_diff" | "recovery" | "recovery_repair" | "recovery_interrupted";

export interface GuiCapabilityDescriptor {
  readonly id: GuiCapabilityId;
  readonly path: string;
  readonly browserKey: string;
}

const GUI_CAPABILITY_PATHS = [
  ["repository_status","/api/status","status"],["configuration","/api/config","config"],["repository_ecosystem","/api/ecosystem","ecosystem"],
  ["monorepo_intelligence","/api/monorepo","monorepo"],["historical_intelligence","/api/historical-intelligence","historical"],
  ["ci_analysis","/api/ci","ci"],["diagnostics","/api/diagnostics","diagnostics"],["change_intelligence","/api/change-intelligence","changeIntelligence"],
  ["test_gaps","/api/test-gaps","testGaps"],["test_impact","/api/test-impact","testImpact"],["execution_plan","/api/execution-plan","executionPlan"],
  ["branch_review","/api/branch-review","branchReview"],["pull_request_review","/api/pull-request-review","pullRequestReview"],
  ["commits","/api/commits","commits"],["branches","/api/branches","branches"],["node","/api/node","node"],
  ["execution_feedback","/api/execution-feedback","executionFeedback"],["run_execution_plan","/api/run-execution-plan","runExecutionPlan"],
  ["overview","/api/overview","overview"],["graph_view","/api/graph-view","graphView"],["graph_drilldown","/api/graph-drilldown","graphDrilldown"],["file_diff","/api/file-diff","fileDiff"],["recovery","/api/recovery","recovery"],["recovery_repair","/api/recovery/repair","recoveryRepair"],["recovery_interrupted","/api/recovery/interrupted","recoveryInterrupted"]
] as const;

export const guiCapabilityContracts: readonly GuiCapabilityDescriptor[] =
  Object.freeze(GUI_CAPABILITY_PATHS.map(([id,path,browserKey]) => ({id,path,browserKey})));

export type {
  GuiStatusViewModel, GuiCommitViewModel, GuiGraphViewModel, GuiExecutionViewModel,
  GuiChangeIntelligenceViewModel, GuiBranchViewModel, GuiBranchReviewViewModel,
  GuiPullRequestReviewViewModel, GuiConfigurationViewModel, GuiDiagnosticsViewModel,
  GuiCiViewModel, GuiEcosystemViewModel, GuiMonorepoViewModel, GuiHistoricalViewModel,
  GuiTestGapViewModel, GuiTestImpactViewModel, GuiOverviewViewModel
} from "./view-models.js";
