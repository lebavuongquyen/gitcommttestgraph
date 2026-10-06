import { McpServer } from "@modelcontextprotocol/server";
import { serveStdio } from "@modelcontextprotocol/server/stdio";
import * as z from "zod/v4";
import {
  discoverRepository, CliGitRepository, TypeScriptProjectAnalyzer, JsonGraphStore, JsonSemanticCache,
  RepositoryIndexer, IncrementalRepositoryIndexer, ImpactEngine, TestGapAnalyzer, TestImpactAnalyzer,
  buildExecutionPlan, serializeExecutionPlan, IndexLock, runProcess, ExecutionPlanRunner,
  buildWorkflowExecutionFeedback, JsonTestResultStore, diffSnapshots, changedSymbolIdsFromDiff, removedSymbolIdsFromDiff, AgentTaskService,
  BranchChangeSetService, BranchReviewService, PullRequestChangeSetService, PullRequestReviewService, GitHubPullRequestProvider,
  ChangeIntelligenceQueryService
} from "../index.js";
import type { AgentTaskPolicy } from "../domain/agent/model.js";
import type { NodeType } from "../domain/graph/model.js";
import { GCTG_VERSION } from "../version.js";

const serverVersion = GCTG_VERSION;
const configuration = {};
const agentTasks = new AgentTaskService();

async function context(root: string) {
  const repository = await discoverRepository(root);
  const git = new CliGitRepository(repository.root);
  const store = new JsonGraphStore(repository.root + "/.gctg/graph");
  const cache = new JsonSemanticCache(repository.root + "/.gctg/cache/semantic");
  return { repository, git, store, cache };
}

async function indexAt(ctx: Awaited<ReturnType<typeof context>>, commit: string) {
  const full = new RepositoryIndexer(ctx.git, new TypeScriptProjectAnalyzer(), ctx.store, ctx.cache);
  const incremental = new IncrementalRepositoryIndexer(ctx.git, full, (repo, hash, version, fingerprint) => ctx.store.getSnapshot(repo, hash, version, fingerprint));
  const release = await new IndexLock(ctx.repository.root + "/.gctg/index.lock").acquire();
  try {
    return await incremental.index({ repository: ctx.repository.root, commit, configuration, analyzerVersion: serverVersion });
  } finally {
    await release();
  }
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
    inputSchema: { commit: z.string().optional(), symbolIds: z.array(z.string()).min(1) }
  }, async ({ commit, symbolIds }) => {
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
