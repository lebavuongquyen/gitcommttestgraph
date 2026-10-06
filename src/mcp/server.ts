import { McpServer } from "@modelcontextprotocol/server";
import { serveStdio } from "@modelcontextprotocol/server/stdio";
import * as z from "zod/v4";
import {
  ImpactEngine, TestGapAnalyzer, TestImpactAnalyzer,
  buildExecutionPlan, serializeExecutionPlan, runProcess, ExecutionPlanRunner,
  buildWorkflowExecutionFeedback, JsonTestResultStore, diffSnapshots, changedSymbolIdsFromDiff, removedSymbolIdsFromDiff, AgentTaskService,
  BranchChangeSetService, BranchReviewService, PullRequestChangeSetService, PullRequestReviewService, GitHubPullRequestProvider,
  ChangeIntelligenceQueryService, analyzeRepositoryEcosystem, analyzeMonorepo, HistoricalIntelligenceService, CiAnalysisService, DiagnosticsService
} from "../index.js";
import type { AgentTaskPolicy } from "../domain/agent/model.js";
import type { NodeType } from "../domain/graph/model.js";
import { GCTG_VERSION } from "../version.js";
import { ApplicationRuntime } from "../runtime/application-runtime.js";

const serverVersion = GCTG_VERSION;
const agentTasks = new AgentTaskService();

async function context(root: string) {
  return ApplicationRuntime.create(root, { analyzerVersion: serverVersion });
}

async function indexAt(ctx: Awaited<ReturnType<typeof context>>, commit: string) {
  return ctx.index(commit);
}

function result(value: unknown) {
  return { content: [{ type: "text" as const, text: JSON.stringify(value, null, 2) }], structuredContent: value };
}

async function analyzeAgentChange(root: string, input: {
  taskId: string;
  goal: string;
  commit?: string;
  policy: AgentTaskPolicy;
}) {
  const ctx = await context(root);
  const target = input.commit ?? await ctx.git.getHead();
  const indexed = await indexAt(ctx, target);
  const commitInfo = await ctx.git.getCommit(target);
  const parentCommit = commitInfo.parents?.[0];
  let changedSymbolIds: readonly string[] = indexed.snapshot.nodes.filter(node => node.type === "Symbol").map(node => node.id);
  let diff;
  if (parentCommit) {
    const previous = await indexAt(ctx, parentCommit);
    diff = diffSnapshots(previous.snapshot, indexed.snapshot);
    changedSymbolIds = changedSymbolIdsFromDiff(previous.snapshot, indexed.snapshot, diff);
  }
  return agentTasks.analyze({
    taskId: input.taskId,
    goal: input.goal,
    repository: indexed.snapshot.repository,
    commit: target,
    ...(parentCommit ? { parentCommit } : {}),
    current: indexed.snapshot,
    ...(diff ? { diff } : {}),
    changedSymbolIds,
    policy: input.policy
  });
}

export function createGctgMcpServer(root: string) {
  const server = new McpServer({
    name: "git-commit-test-graph",
    version: serverVersion,
    description: "Graph-first Git, code, test-impact and execution intelligence for software-engineering agents."
  });

  server.registerTool("configuration", {
    title: "Configuration",
    description: "Read or update the repository GCTG configuration. Updates are validated and persisted as .gctg/config.json.",
    inputSchema: {
      operation: z.enum(["get", "update", "history", "reload"]).default("get"),
      configuration: z.unknown().optional()
    }
  }, async ({ operation, configuration }) => {
    const ctx = await context(root);
    if (operation === "update") {
      if (configuration === undefined) throw new Error("configuration is required for update.");
      return result(await ctx.updateConfiguration(configuration));
    }
    if (operation === "history") return result(await ctx.configurationHistory());
    if (operation === "reload") return result(await ctx.reloadConfiguration());
    return result(await ctx.resolveConfiguration());
  });

  server.registerTool("branch_lifecycle", {
    title: "Branch Lifecycle",
    description: "Observe current branch refs and available reflog lifecycle evidence without modifying Git history.",
    inputSchema: {}
  }, async () => {
    const ctx = await context(root);
    const { BranchLifecycleService } = await import("../application/history/branch-lifecycle-service.js");
    return result(await new BranchLifecycleService(ctx.git).analyze());
  });

  server.registerTool("reachability", {
    title: "Reachability",
    description: "Determine whether supplied commits are reachable from current branch refs or have explicit protection evidence.",
    inputSchema: { commits: z.array(z.string()).min(1), protectedCommits: z.array(z.string()).optional() }
  }, async ({ commits, protectedCommits }) => {
    const ctx = await context(root);
    const { ReachabilityService } = await import("../application/history/reachability-service.js");
    return result(await new ReachabilityService(ctx.git).analyze({ commits, ...(protectedCommits ? { protectedCommits } : {}) }));
  });

  server.registerTool("retention_plan", {
    title: "Retention Plan",
    description: "Produce a deterministic, read-only retention plan from configuration and supplied snapshot evidence.",
    inputSchema: { candidates: z.array(z.unknown()), now: z.string().optional() }
  }, async ({ candidates, now }) => {
    const ctx = await context(root);
    const { planRetention } = await import("../application/history/retention-planner.js");
    const resolved = await ctx.resolveConfiguration();
    return result(planRetention(resolved.configuration, candidates as never, now ?? new Date().toISOString()));
  });

  server.registerTool("cleanup_preview", {
    title: "Cleanup Preview",
    description: "Create a deterministic cleanup preview for exact snapshot commits without deleting anything.",
    inputSchema: { commits: z.array(z.string()), now: z.string().optional() }
  }, async ({ commits, now }) => {
    const ctx = await context(root);
    const { SnapshotCleanupService } = await import("../application/history/snapshot-cleanup-service.js");
    return result(await new SnapshotCleanupService(ctx.store).preview(commits, now ?? new Date().toISOString()));
  });

  server.registerTool("cleanup_apply", {
    title: "Cleanup Apply",
    description: "Apply an exact cleanup preview. The preview proof is checked before deletion and repeated application is idempotent.",
    inputSchema: { preview: z.unknown() }
  }, async ({ preview }) => {
    const ctx = await context(root);
    const { SnapshotCleanupService } = await import("../application/history/snapshot-cleanup-service.js");
    return result(await new SnapshotCleanupService(ctx.store).apply(preview as never));
  });

  server.registerTool("change_intelligence", {
    title: "Change Intelligence",
    description: "Analyze a commit or branch through the unified change intelligence contract. Read-only and deterministic.",
    inputSchema: {
      source: z.enum(["COMMIT", "BRANCH"]).default("COMMIT"),
      commit: z.string().optional(),
      base: z.string().optional(),
      head: z.string().optional()
    }
  }, async ({ source, commit, base, head }) => {
    const ctx = await context(root);
    const intelligence = new ChangeIntelligenceQueryService(
      ctx.repository.root,
      ctx.git,
      { index: (hash: string) => indexAt(ctx, hash) }
    );
    return result(await intelligence.analyze({
      source,
      ...(commit ? { commit } : {}),
      ...(base ? { base } : {}),
      ...(head ? { head } : {})
    }));
  });

  server.registerTool("monorepo_intelligence", {
    title: "Monorepo Intelligence",
    description: "Analyze workspace boundaries, package dependencies, package-level impact and package test projects for a repository commit.",
    inputSchema: { commit: z.string().optional(), changedNodeIds: z.array(z.string()).optional() }
  }, async ({ commit, changedNodeIds }) => {
    const ctx = await context(root);
    const indexed = await indexAt(ctx, commit ?? await ctx.git.getHead());
    return result(analyzeMonorepo(indexed.snapshot, changedNodeIds ?? []));
  });

  server.registerTool("diagnostics", {
    title: "Structured Diagnostics",
    description: "Return structured, secret-safe diagnostics for a repository index operation.",
    inputSchema: { commit: z.string().optional() }
  }, async ({ commit }) => {
    const ctx = await context(root);
    const target = commit ?? await ctx.git.getHead();
    const diagnostics = new DiagnosticsService();
    const operation = diagnostics.begin("index", ctx.repository.root, target);
    const indexed = await indexAt(ctx, target);
    return result(diagnostics.complete("index", operation, ctx.repository.root, serverVersion, indexed));
  });

  server.registerTool("ci_analysis", {
    title: "CI Analysis",
    description: "Produce deterministic CI status, risk, reasons and JSON/SARIF/summary output from Change Intelligence.",
    inputSchema: { source: z.enum(["COMMIT", "BRANCH"]).default("COMMIT"), commit: z.string().optional(), base: z.string().optional(), head: z.string().optional(), format: z.enum(["json", "sarif", "summary"]).default("json") }
  }, async ({ source, commit, base, head, format }) => {
    const ctx = await context(root);
    const intelligence = new ChangeIntelligenceQueryService(ctx.repository.root, ctx.git, { index: (hash: string) => indexAt(ctx, hash) });
    const ciResult = new CiAnalysisService().analyze(await intelligence.analyze({ source, ...(commit ? { commit } : {}), ...(base ? { base } : {}), ...(head ? { head } : {}) }));
    return result({ ...ciResult, rendered: new CiAnalysisService().serialize(ciResult, format) });
  });

  server.registerTool("historical_intelligence", {
    title: "Historical Intelligence",
    description: "Analyze deterministic semantic evolution between two Git commits, including symbol, dependency and test-impact transitions.",
    inputSchema: { from: z.string().min(1), to: z.string().optional(), maxCommits: z.number().int().min(2).max(200).default(50) }
  }, async ({ from, to, maxCommits }) => {
    const ctx = await context(root);
    const service = new HistoricalIntelligenceService(ctx.git, { load: async commit => (await indexAt(ctx, commit)).snapshot });
    return result(await service.analyze({ repository: ctx.repository.root, fromCommit: from, toCommit: to ?? await ctx.git.getHead(), maxCommits }));
  });

  server.registerTool("repository_ecosystem", {
    title: "Repository Ecosystem",
    description: "Detect package managers, languages and test frameworks for a repository commit. Unsupported or unknown environments are reported explicitly and never treated as positive intelligence.",
    inputSchema: { commit: z.string().optional() }
  }, async ({ commit }) => {
    const ctx = await context(root);
    const indexed = await indexAt(ctx, commit ?? await ctx.git.getHead());
    return result(analyzeRepositoryEcosystem(indexed.snapshot));
  });

  server.registerTool("repository_status", {
    title: "Repository Status",
    description: "Return repository root, HEAD and workspace discovery. Read-only.",
    inputSchema: {}
  }, async () => {
    const ctx = await context(root);
    return result({ root: ctx.repository.root, head: await ctx.git.getHead(), workspaceFiles: ctx.repository.workspaceFiles });
  });

  server.registerTool("commits", {
    title: "List Commits",
    description: "List recent Git commits for agent context. Read-only.",
    inputSchema: { limit: z.number().int().min(1).max(100).default(20) }
  }, async ({ limit }) => {
    const ctx = await context(root);
    return result(await ctx.git.listCommits(limit));
  });

  server.registerTool("branches", {
    title: "List Branches",
    description: "List local and remote Git branches with current-branch metadata. Read-only.",
    inputSchema: {}
  }, async () => {
    const ctx = await context(root);
    return result({ current: await ctx.git.getCurrentBranch(), branches: await ctx.git.listBranches() });
  });

  server.registerTool("branch_review", {
    title: "Review Branch",
    description: "Analyze a branch against a base branch and return merge-readiness, risk, changed symbols, downstream impact, test gaps, impacted tests and execution plan. Read-only.",
    inputSchema: {
      base: z.string().min(1),
      head: z.string().min(1).optional()
    }
  }, async ({ base, head }) => {
    const ctx = await context(root);
    const changeSet = await new BranchChangeSetService(ctx.git).build({
      repository: ctx.repository.root,
      base,
      ...(head ? { head } : {})
    });
    const indexed = await indexAt(ctx, changeSet.head);
    const baseIndexed = await indexAt(ctx, changeSet.mergeBase);
    const diff = diffSnapshots(baseIndexed.snapshot, indexed.snapshot);
    const changedSymbolIds = changedSymbolIdsFromDiff(baseIndexed.snapshot, indexed.snapshot, diff);
    const removedSymbolIds = removedSymbolIdsFromDiff(baseIndexed.snapshot, indexed.snapshot, diff);
    return result(new BranchReviewService().analyze({
      changeSet,
      current: indexed.snapshot,
      changedSymbolIds,
      removedSymbolIds
    }));
  });

  server.registerTool("pull_request_review", {
    title: "Review Pull Request",
    description: "Fetch pull request metadata, analyze its exact Git base/head change set, semantic impact, test impact and execution readiness. Read-only.",
    inputSchema: {
      ownerRepo: z.string().min(3),
      number: z.number().int().positive()
    }
  }, async ({ ownerRepo, number }) => {
    const ctx = await context(root);
    const pullRequest = await new GitHubPullRequestProvider().get(ownerRepo, number);
    await ctx.git.ensureCommit(pullRequest.baseSha);
    await ctx.git.ensureCommit(pullRequest.headSha, "https://github.com/" + pullRequest.headRepository + ".git");
    const changeSet = await new PullRequestChangeSetService(ctx.git).build({
      repository: ctx.repository.root,
      pullRequest,
      base: pullRequest.baseSha,
      head: pullRequest.headSha
    });
    const indexed = await indexAt(ctx, changeSet.head);
    const baseIndexed = await indexAt(ctx, changeSet.mergeBase);
    const diff = diffSnapshots(baseIndexed.snapshot, indexed.snapshot);
    const changedSymbolIds = changedSymbolIdsFromDiff(baseIndexed.snapshot, indexed.snapshot, diff);
    const removedSymbolIds = removedSymbolIdsFromDiff(baseIndexed.snapshot, indexed.snapshot, diff);
    return result(new PullRequestReviewService().analyze({
      changeSet,
      pullRequest,
      current: indexed.snapshot,
      base: baseIndexed.snapshot,
      changedSymbolIds,
      removedSymbolIds
    }));
  });

  server.registerTool("graph_query", {
    title: "Query Code Graph",
    description: "Index a commit and return graph nodes filtered by type, package or file.",
    inputSchema: { commit: z.string().optional(), nodeType: z.string().optional(), packageId: z.string().optional(), filePath: z.string().optional() }
  }, async ({ commit, nodeType, packageId, filePath }) => {
    const ctx = await context(root);
    const indexed = await indexAt(ctx, commit ?? await ctx.git.getHead());
    const nodes = indexed.snapshot.nodes.filter(node =>
      (!nodeType || node.type === nodeType) &&
      (!packageId || node.attributes.packageId === packageId) &&
      (!filePath || node.attributes.path === filePath)
    );
    return result({ nodes });
  });

  server.registerTool("impact_analyze", {
    title: "Analyze Change Impact",
    description: "Compute reverse semantic impact from changed graph node IDs and preserve evidence.",
    inputSchema: { commit: z.string().optional(), nodeIds: z.array(z.string()).min(1), targetTypes: z.array(z.string()).optional() }
  }, async ({ commit, nodeIds, targetTypes }) => {
    const ctx = await context(root);
    const indexed = await indexAt(ctx, commit ?? await ctx.git.getHead());
    const request = targetTypes ? { changedNodeIds: nodeIds, targetTypes: targetTypes as NodeType[] } : { changedNodeIds: nodeIds };
    return result(new ImpactEngine().analyze(indexed.snapshot, request));
  });

  server.registerTool("test_gaps", {
    title: "Test Gaps",
    description: "Analyze direct, indirect, untested and unknown test coverage for repository symbols. Read-only and deterministic.",
    inputSchema: { commit: z.string().optional(), packageId: z.string().optional() }
  }, async ({ commit, packageId }) => {
    const ctx = await context(root);
    const target = commit ?? await ctx.git.getHead();
    const indexed = await indexAt(ctx, target);
    const currentNodeIds = new Set(indexed.snapshot.nodes.map(node => node.id));
    let changedNodeIds: string[] = [];
    const commitInfo = await ctx.git.getCommit(target);
    const parentCommit = commitInfo.parents?.[0];
    if (parentCommit) {
      const parent = await indexAt(ctx, parentCommit);
      const diff = diffSnapshots(parent.snapshot, indexed.snapshot);
      changedNodeIds = [...new Set([...diff.addedNodes, ...diff.changedNodes])].filter(id => currentNodeIds.has(id));
    }
    const packageNode = packageId ? indexed.snapshot.nodes.find(node => node.type === "Package" && (node.id === packageId || String(node.attributes.name ?? "") === packageId)) : undefined;
    const analysisPackageId = packageNode?.id ?? packageId;
    const request = analysisPackageId ? { changedNodeIds, packageId: analysisPackageId } : { changedNodeIds };
    return result(new TestGapAnalyzer().analyze(indexed.snapshot, request));
  });

  server.registerTool("test_impact", {
    title: "Analyze Test Impact",
    description: "Map changed symbols to affected tests, test projects and runnable commands.",
    inputSchema: { commit: z.string().optional(), symbolIds: z.array(z.string()).min(1) }
  }, async ({ commit, symbolIds }) => {
    const ctx = await context(root);
    const indexed = await indexAt(ctx, commit ?? await ctx.git.getHead());
    const gaps = new TestGapAnalyzer().analyze(indexed.snapshot, { changedNodeIds: symbolIds });
    return result(new TestImpactAnalyzer().analyze(indexed.snapshot, { changedSymbolIds: symbolIds, coverageLinks: gaps.coverageLinks }));
  });

  server.registerTool("execution_plan", {
    title: "Build Execution Plan",
    description: "Build a deterministic test execution plan from changed symbols. Does not execute commands.",
    inputSchema: { commit: z.string().optional(), symbolIds: z.array(z.string()).min(1), format: z.enum(["json", "yaml", "md", "mermaid"]).default("json") }
  }, async ({ commit, symbolIds, format }) => {
    const ctx = await context(root);
    const indexed = await indexAt(ctx, commit ?? await ctx.git.getHead());
    const gaps = new TestGapAnalyzer().analyze(indexed.snapshot, { changedNodeIds: symbolIds });
    const impact = new TestImpactAnalyzer().analyze(indexed.snapshot, { changedSymbolIds: symbolIds, coverageLinks: gaps.coverageLinks });
    const plan = buildExecutionPlan({ repository: indexed.snapshot.repository, commit: indexed.snapshot.commit, nodes: indexed.snapshot.nodes, edges: indexed.snapshot.edges, impacts: impact.impacts });
    return result({ plan, rendered: serializeExecutionPlan(plan, format) });
  });

  server.registerTool("execution_feedback", {
    title: "Get Execution Feedback",
    description: "Read persisted runtime execution feedback for a commit. Read-only.",
    inputSchema: { commit: z.string().optional() }
  }, async ({ commit }) => {
    const ctx = await context(root);
    const target = commit ?? await ctx.git.getHead();
    const store = new JsonTestResultStore(ctx.repository.root + "/.gctg/results");
    return result(await store.get(`latest:${ctx.repository.root}:${target}`) ?? { found: false, commit: target });
  });

  server.registerTool("run_execution_plan", {
    title: "Run Impacted Tests",
    description: "Execute the deterministic impacted-test plan for a commit, persist execution result and feedback, and return both. This is the only side-effecting test tool.",
    inputSchema: { commit: z.string().optional(), symbolIds: z.array(z.string()).min(1), approved: z.boolean().default(false) }
  }, async ({ commit, symbolIds, approved }) => {
    if (!approved) throw new Error("Execution approval is required.");
    const ctx = await context(root);
    const target = commit ?? await ctx.git.getHead();
    const indexed = await indexAt(ctx, target);
    const gaps = new TestGapAnalyzer().analyze(indexed.snapshot, { changedNodeIds: symbolIds });
    const impact = new TestImpactAnalyzer().analyze(indexed.snapshot, { changedSymbolIds: symbolIds, coverageLinks: gaps.coverageLinks });
    const plan = buildExecutionPlan({ repository: indexed.snapshot.repository, commit: indexed.snapshot.commit, nodes: indexed.snapshot.nodes, edges: indexed.snapshot.edges, impacts: impact.impacts });
    const execution = await new ExecutionPlanRunner({ run: runProcess }).execute(plan);
    const feedback = buildWorkflowExecutionFeedback(plan, execution);
    const results = new JsonTestResultStore(ctx.repository.root + "/.gctg/results");
    await results.save(feedback.executionId, { execution, feedback });
    await results.save(`latest:${ctx.repository.root}:${target}`, { execution, feedback });
    return result({ execution, feedback });
  });

  server.registerTool("agent_analyze_change", {
    title: "Analyze Agent Change Task",
    description: "Create a deterministic agent task for a Git commit. Read-only. Returns decision, evidence, uncertainty, test gaps, test impact and execution plan. Runtime execution is never performed by this tool.",
    inputSchema: {
      taskId: z.string().min(1).optional(),
      goal: z.string().min(1).default("Determine whether the change is safe to merge."),
      commit: z.string().optional(),
      allowExecution: z.boolean().default(false),
      requireAllImpactedTests: z.boolean().default(true),
      failOnUnknown: z.boolean().default(false),
      failOnNoCommand: z.boolean().default(false),
      maxExecutionSteps: z.number().int().min(1).max(100).default(20)
    }
  }, async ({ taskId, goal, commit, allowExecution, requireAllImpactedTests, failOnUnknown, failOnNoCommand, maxExecutionSteps }) => {
    const target = commit ?? "HEAD";
    const id = taskId ?? `agent:${target}:${Date.now()}`;
    return result(await analyzeAgentChange(root, {
      taskId: id,
      goal,
      ...(commit ? { commit } : {}),
      policy: { allowExecution, requireAllImpactedTests, failOnUnknown, failOnNoCommand, maxExecutionSteps }
    }));
  });

  server.registerTool("agent_execute_task", {
    title: "Execute Agent Task",
    description: "Execute a previously analyzed agent task. Requires allowExecution=true in the task policy. This is an explicit side-effecting approval boundary.",
    inputSchema: { taskId: z.string().min(1) }
  }, async ({ taskId }) => {
    return result(await agentTasks.execute(taskId, { run: runProcess }));
  });

  server.registerTool("agent_task_result", {
    title: "Get Agent Task Result",
    description: "Read the current agent task state and decision. Read-only.",
    inputSchema: { taskId: z.string().min(1) }
  }, async ({ taskId }) => {
    const task = agentTasks.get(taskId);
    if (!task) return result({ found: false, taskId });
    return result(task);
  });

  server.registerResource("graph-snapshot", "gctg://graph/{commit}", {
    title: "Graph Snapshot",
    description: "Read-only graph snapshot for a Git commit.",
    mimeType: "application/json"
  }, async (uri) => {
    const commit = uri.pathname.split("/").filter(Boolean).at(-1);
    if (!commit) throw new Error("Missing commit");
    const ctx = await context(root);
    const indexed = await indexAt(ctx, commit);
    return { contents: [{ uri: uri.href, mimeType: "application/json", text: JSON.stringify(indexed.snapshot) }] };
  });

  return server;
}

export function startGctgMcpStdio(root: string) {
  return serveStdio(() => createGctgMcpServer(root));
}
