export type GuiCapabilityId =
  | "repository_status" | "configuration" | "repository_ecosystem" | "monorepo_intelligence"
  | "historical_intelligence" | "ci_analysis" | "diagnostics" | "change_intelligence"
  | "test_gaps" | "test_impact" | "execution_plan" | "branch_review" | "pull_request_review"
  | "commits" | "branches" | "node" | "execution_feedback" | "run_execution_plan"
  | "overview" | "graph_view";

export interface GuiCapabilityDescriptor {
  readonly id: GuiCapabilityId;
  readonly path: string;
}

const GUI_CAPABILITY_PATHS = [
  ["repository_status","/api/status"],["configuration","/api/config"],["repository_ecosystem","/api/ecosystem"],
  ["monorepo_intelligence","/api/monorepo"],["historical_intelligence","/api/historical-intelligence"],
  ["ci_analysis","/api/ci"],["diagnostics","/api/diagnostics"],["change_intelligence","/api/change-intelligence"],
  ["test_gaps","/api/test-gaps"],["test_impact","/api/test-impact"],["execution_plan","/api/execution-plan"],
  ["branch_review","/api/branch-review"],["pull_request_review","/api/pull-request-review"],
  ["commits","/api/commits"],["branches","/api/branches"],["node","/api/node"],
  ["execution_feedback","/api/execution-feedback"],["run_execution_plan","/api/run-execution-plan"],
  ["overview","/api/overview"],["graph_view","/api/graph-view"]
] as const;

export const guiCapabilityContracts: readonly GuiCapabilityDescriptor[] =
  Object.freeze(GUI_CAPABILITY_PATHS.map(([id,path]) => ({id,path})));

export type {
  GuiStatusViewModel, GuiCommitViewModel, GuiGraphViewModel, GuiExecutionViewModel,
  GuiChangeIntelligenceViewModel, GuiBranchViewModel, GuiBranchReviewViewModel,
  GuiPullRequestReviewViewModel, GuiConfigurationViewModel, GuiDiagnosticsViewModel,
  GuiCiViewModel, GuiEcosystemViewModel, GuiMonorepoViewModel, GuiHistoricalViewModel,
  GuiTestGapViewModel, GuiTestImpactViewModel, GuiOverviewViewModel
} from "./view-models.js";
