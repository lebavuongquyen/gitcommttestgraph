export type GuiCapabilityId =
  | "repository_status"
  | "configuration"
  | "repository_ecosystem"
  | "monorepo_intelligence"
  | "historical_intelligence"
  | "ci_analysis"
  | "diagnostics"
  | "change_intelligence"
  | "test_gaps"
  | "test_impact"
  | "execution_plan"
  | "branch_review"
  | "pull_request_review";

export interface GuiCapabilityDescriptor {
  readonly id: GuiCapabilityId;
  readonly path: string;
}

export const guiCapabilityContracts: readonly GuiCapabilityDescriptor[] = Object.freeze([
  { id: "repository_status", path: "/api/status" },
  { id: "configuration", path: "/api/config" },
  { id: "repository_ecosystem", path: "/api/ecosystem" },
  { id: "monorepo_intelligence", path: "/api/monorepo" },
  { id: "historical_intelligence", path: "/api/historical-intelligence" },
  { id: "ci_analysis", path: "/api/ci" },
  { id: "diagnostics", path: "/api/diagnostics" },
  { id: "change_intelligence", path: "/api/change-intelligence" },
  { id: "test_gaps", path: "/api/test-gaps" },
  { id: "test_impact", path: "/api/test-impact" },
  { id: "execution_plan", path: "/api/execution-plan" },
  { id: "branch_review", path: "/api/branch-review" },
  { id: "pull_request_review", path: "/api/pull-request-review" }
]);

export type {
  GuiStatusViewModel,
  GuiCommitViewModel,
  GuiGraphViewModel,
  GuiExecutionViewModel,
  GuiChangeIntelligenceViewModel
} from "./view-models.js";
