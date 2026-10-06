export type CapabilitySurface = "GUI" | "MCP" | "CLI" | "HTTP" | "PUBLIC_API";

export interface CapabilityDescriptor {
  readonly id: string;
  readonly applicationHandler: string;
  readonly surfaces: Readonly<Partial<Record<CapabilitySurface, string>>>;
}

export const capabilityRegistry: readonly CapabilityDescriptor[] = Object.freeze([
  {
    id: "repository_status",
    applicationHandler: "RepositoryStatus",
    surfaces: { GUI: 'capability(\\"status\\"', MCP: 'registerTool("repository_status"', CLI: 'command === "status"', HTTP: "/api/status" }
  },
  {
    id: "configuration",
    applicationHandler: "ConfigurationService",
    surfaces: { GUI: 'capability(\\"config\\"', MCP: 'registerTool("configuration"', CLI: 'command === "config"', HTTP: "/api/config" }
  },
  {
    id: "repository_ecosystem",
    applicationHandler: "analyzeRepositoryEcosystem",
    surfaces: { GUI: 'capability(\\"ecosystem\\"', MCP: 'registerTool("repository_ecosystem"', CLI: 'command === "ecosystem"', HTTP: "/api/ecosystem", PUBLIC_API: "analyzeRepositoryEcosystem" }
  },
  {
    id: "monorepo_intelligence",
    applicationHandler: "analyzeMonorepo",
    surfaces: { GUI: 'capability(\\"monorepo\\"', MCP: 'registerTool("monorepo_intelligence"', CLI: 'command === "monorepo"', HTTP: "/api/monorepo", PUBLIC_API: "analyzeMonorepo" }
  },
  {
    id: "historical_intelligence",
    applicationHandler: "HistoricalIntelligenceService",
    surfaces: { GUI: 'capability(\\"historical\\"', MCP: 'registerTool("historical_intelligence"', CLI: 'command === "historical-intelligence"', HTTP: "/api/historical-intelligence", PUBLIC_API: "HistoricalIntelligenceService" }
  },
  {
    id: "ci_analysis",
    applicationHandler: "CiAnalysisService",
    surfaces: { GUI: 'capability(\\"ci\\"', MCP: 'registerTool("ci_analysis"', CLI: 'command === "ci"', HTTP: "/api/ci", PUBLIC_API: "CiAnalysisContract" }
  },
  {
    id: "diagnostics",
    applicationHandler: "DiagnosticsService",
    surfaces: { GUI: 'capability(\\"diagnostics\\"', MCP: 'registerTool("diagnostics"', CLI: 'command === "diagnostics"', HTTP: "/api/diagnostics", PUBLIC_API: "OperationDiagnostics" }
  },
  {
    id: "change_intelligence",
    applicationHandler: "ChangeIntelligenceQueryService",
    surfaces: { GUI: 'capability(\\"changeIntelligence\\"', MCP: 'registerTool("change_intelligence"', CLI: 'command === "change-intelligence"', HTTP: "/api/change-intelligence" }
  },
  {
    id: "test_gaps",
    applicationHandler: "TestGapAnalyzer",
    surfaces: { GUI: 'capability(\\"testGaps\\"', MCP: 'registerTool("test_gaps"', CLI: 'command === "test-gaps"', HTTP: "/api/test-gaps" }
  },
  {
    id: "test_impact",
    applicationHandler: "TestImpactAnalyzer",
    surfaces: { GUI: 'capability(\\"testImpact\\"', MCP: 'registerTool("test_impact"', CLI: 'command === "test-impact"', HTTP: "/api/test-impact" }
  },
  {
    id: "execution_plan",
    applicationHandler: "buildExecutionPlan",
    surfaces: { GUI: 'capability(\\"executionPlan\\"', MCP: 'registerTool("execution_plan"', CLI: 'command === "execution-plan"', HTTP: "/api/execution-plan" }
  },
  {
    id: "branch_lifecycle",
    applicationHandler: "BranchLifecycleService",
    surfaces: { MCP: 'registerTool("branch_lifecycle"', HTTP: "/api/branch-lifecycle" }
  },
  {
    id: "reachability",
    applicationHandler: "ReachabilityService",
    surfaces: { MCP: 'registerTool("reachability"', HTTP: "/api/reachability" }
  },
  {
    id: "retention_plan",
    applicationHandler: "planRetention",
    surfaces: { MCP: 'registerTool("retention_plan"', HTTP: "/api/retention-plan" }
  },
  {
    id: "cleanup_preview",
    applicationHandler: "SnapshotCleanupService.preview",
    surfaces: { MCP: 'registerTool("cleanup_preview"', HTTP: "/api/cleanup/preview" }
  },
  {
    id: "cleanup_apply",
    applicationHandler: "SnapshotCleanupService.apply",
    surfaces: { MCP: 'registerTool("cleanup_apply"', HTTP: "/api/cleanup/apply" }
  },
  {
    id: "snapshot_accounting",
    applicationHandler: "SnapshotAccountingService",
    surfaces: { MCP: 'registerTool("snapshot_accounting"', HTTP: "/api/snapshot-accounting" }
  },
  {
    id: "snapshot_compaction",
    applicationHandler: "SnapshotAccountingService.planCompaction",
    surfaces: { MCP: 'registerTool("snapshot_compaction"', HTTP: "/api/snapshot-compaction" }
  },
  {
    id: "progress",
    applicationHandler: "ProgressService",
    surfaces: { MCP: 'registerTool("progress"', HTTP: "/api/progress" }
  },
  {
    id: "operations",
    applicationHandler: "OperationService",
    surfaces: { MCP: 'registerTool("operations"', HTTP: "/api/operations" }
  },
  {
    id: "branch_review",
    applicationHandler: "BranchReviewService",
    surfaces: { GUI: 'capability(\\"branchReview\\"', MCP: 'registerTool("branch_review"', CLI: 'command === "branch-review"', HTTP: "/api/branch-review" }
  },
  {
    id: "pull_request_review",
    applicationHandler: "PullRequestReviewService",
    surfaces: { GUI: 'capability(\\"pullRequestReview\\"', MCP: 'registerTool("pull_request_review"', CLI: 'command === "pr-review"', HTTP: "/api/pull-request-review" }
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
