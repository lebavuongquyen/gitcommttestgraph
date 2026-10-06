export type CapabilitySurface = "GUI" | "MCP" | "CLI" | "HTTP" | "PUBLIC_API";

export interface CapabilityDescriptor {
  readonly id: string;
  readonly applicationHandler: string;
  readonly surfaces: Readonly<Record<CapabilitySurface, string>>;
}

export const capabilityRegistry: readonly CapabilityDescriptor[] = Object.freeze([
  {
    id: "repository_status",
    applicationHandler: "RepositoryStatus",
    surfaces: { GUI: "/api/status", MCP: 'registerTool("repository_status"', CLI: 'command === "status"', HTTP: "/api/status" }
  },
  {
    id: "configuration",
    applicationHandler: "ConfigurationService",
    surfaces: { GUI: "/api/config", MCP: 'registerTool("configuration"', CLI: 'command === "config"', HTTP: "/api/config" }
  },
  {
    id: "repository_ecosystem",
    applicationHandler: "analyzeRepositoryEcosystem",
    surfaces: { GUI: "/api/ecosystem", MCP: 'registerTool("repository_ecosystem"', CLI: 'command === "ecosystem"', HTTP: "/api/ecosystem", PUBLIC_API: "analyzeRepositoryEcosystem" }
  },
  {
    id: "monorepo_intelligence",
    applicationHandler: "analyzeMonorepo",
    surfaces: { GUI: "/api/monorepo", MCP: 'registerTool("monorepo_intelligence"', CLI: 'command === "monorepo"', HTTP: "/api/monorepo", PUBLIC_API: "analyzeMonorepo" }
  },
  {
    id: "historical_intelligence",
    applicationHandler: "HistoricalIntelligenceService",
    surfaces: { GUI: "/api/historical-intelligence", MCP: 'registerTool("historical_intelligence"', CLI: 'command === "historical-intelligence"', HTTP: "/api/historical-intelligence", PUBLIC_API: "HistoricalIntelligenceService" }
  },
  {
    id: "ci_analysis",
    applicationHandler: "CiAnalysisService",
    surfaces: { GUI: "/api/ci", MCP: 'registerTool("ci_analysis"', CLI: 'command === "ci"', HTTP: "/api/ci", PUBLIC_API: "CiAnalysisContract" }
  },
  {
    id: "diagnostics",
    applicationHandler: "DiagnosticsService",
    surfaces: { GUI: "/api/diagnostics", MCP: 'registerTool("diagnostics"', CLI: 'command === "diagnostics"', HTTP: "/api/diagnostics", PUBLIC_API: "OperationDiagnostics" }
  },
  {
    id: "change_intelligence",
    applicationHandler: "ChangeIntelligenceQueryService",
    surfaces: { GUI: "/api/change-intelligence", MCP: 'registerTool("change_intelligence"', CLI: 'command === "change-intelligence"', HTTP: "/api/change-intelligence" }
  },
  {
    id: "test_gaps",
    applicationHandler: "TestGapAnalyzer",
    surfaces: { GUI: "/api/test-gaps", MCP: 'registerTool("test_gaps"', CLI: 'command === "test-gaps"', HTTP: "/api/test-gaps" }
  },
  {
    id: "test_impact",
    applicationHandler: "TestImpactAnalyzer",
    surfaces: { GUI: "/api/test-impact", MCP: 'registerTool("test_impact"', CLI: 'command === "test-impact"', HTTP: "/api/test-impact" }
  },
  {
    id: "execution_plan",
    applicationHandler: "buildExecutionPlan",
    surfaces: { GUI: "/api/execution-plan", MCP: 'registerTool("execution_plan"', CLI: 'command === "execution-plan"', HTTP: "/api/execution-plan" }
  },
  {
    id: "branch_review",
    applicationHandler: "BranchReviewService",
    surfaces: { GUI: "/api/branch-review", MCP: 'registerTool("branch_review"', CLI: 'command === "branch-review"', HTTP: "/api/branch-review" }
  },
  {
    id: "pull_request_review",
    applicationHandler: "PullRequestReviewService",
    surfaces: { GUI: "/api/pull-request-review", MCP: 'registerTool("pull_request_review"', CLI: 'command === "pr-review"', HTTP: "/api/pull-request-review" }
  }
]);

export interface CapabilityConformanceFailure {
  readonly capabilityId: string;
  readonly surface: CapabilitySurface;
  readonly marker: string;
}

export function validateCapabilityConformance(
  sources: Readonly<Record<CapabilitySurface, string>>,
  registry: readonly CapabilityDescriptor[] = capabilityRegistry
): readonly CapabilityConformanceFailure[] {
  const failures: CapabilityConformanceFailure[] = [];
  for (const capability of registry) {
    for (const [surface, marker] of Object.entries(capability.surfaces) as [CapabilitySurface, string][]) {
      if (!sources[surface]?.includes(marker)) failures.push({ capabilityId: capability.id, surface, marker });
    }
  }
  return failures;
}
