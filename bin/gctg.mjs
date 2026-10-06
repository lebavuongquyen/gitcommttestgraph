#!/usr/bin/env node
import { readFile } from "node:fs/promises";
import { discoverRepository, CliGitRepository, TypeScriptProjectAnalyzer, JsonGraphStore, JsonSemanticCache, JsonTestResultStore, RepositoryIndexer, IncrementalRepositoryIndexer, GraphQueryService, ImpactQueryService, TestGapAnalyzer, TestImpactAnalyzer, ImpactEngine, buildWorkflowGraph, buildExecutionPlan, serializeExecutionPlan, ExecutionPlanRunner, buildWorkflowExecutionFeedback, diffSnapshots, configurationFingerprint, runProcess, IndexLock, BranchChangeSetService, BranchReviewService, PullRequestChangeSetService, PullRequestReviewService, GitHubPullRequestProvider, ChangeIntelligenceQueryService } from "../dist/index.js";

const packageJson = JSON.parse(await readFile(new URL("../package.json", import.meta.url), "utf8"));
const command = process.argv[2] ?? "help";
const root = process.cwd();
const analyzerVersion = packageJson.version;
const configuration = {};
const json = value => console.log(JSON.stringify(value, null, 2));

async function context() {
  const repository = await discoverRepository(root);
  const git = new CliGitRepository(repository.root);
  const store = new JsonGraphStore(repository.root + "/.gctg/graph");
  const semanticCache = new JsonSemanticCache(repository.root + "/.gctg/cache/semantic");
  return { repository, git, store, semanticCache };
}
async function indexAt(git, store, semanticCache, repository, commit) {
  const fullIndexer = new RepositoryIndexer(git, new TypeScriptProjectAnalyzer(), store, semanticCache);
  const incremental = new IncrementalRepositoryIndexer(
    git,
    fullIndexer,
    (repo, hash, version, fingerprint) => store.getSnapshot(repo, hash, version, fingerprint)
  );
  const release = await new IndexLock(repository + "/.gctg/index.lock").acquire();
  try {
    return await incremental.index({ repository, commit, configuration, analyzerVersion });
  } finally {
    await release();
  }
}

try {
  if (command === "--version" || command === "-v") {
    console.log(packageJson.version);
    process.exit(0);
  }
  if (command === "status") {
    const { repository, git } = await context();
    json({ root: repository.root, head: await git.getHead(), workspaceFiles: repository.workspaceFiles });
    process.exit(0);
  }
  if (command === "commits") {
    const { git } = await context();
    json(await git.listCommits(Number(process.argv[3] ?? 20)));
    process.exit(0);
  }
  if (command === "index") {
    const { repository, git, store, semanticCache } = await context();
    const commit = process.argv[3] ?? await git.getHead();
    const result = await indexAt(git, store, semanticCache, repository.root, commit);
    json({ commit, reused: result.reused, nodes: result.snapshot.nodes.length, edges: result.snapshot.edges.length, metadata: result.snapshot.metadata });
    process.exit(0);
  }
  if (command === "graph") {
    const { repository, git, store, semanticCache } = await context();
    const commit = process.argv[3] ?? await git.getHead();
    const result = await indexAt(git, store, semanticCache, repository.root, commit);
    const type = process.argv[4];
    json(type ? result.snapshot.nodes.filter(node => node.type === type) : result.snapshot);
    process.exit(0);
  }
  if (command === "diff") {
    const { repository, git, store, semanticCache } = await context();
    const from = process.argv[3];
    const to = process.argv[4] ?? await git.getHead();
    if (!from) throw new Error("Usage: gctg diff <fromCommit> <toCommit>");
    const a = await indexAt(git, store, semanticCache, repository.root, from);
    const b = await indexAt(git, store, semanticCache, repository.root, to);
    json(diffSnapshots(a.snapshot, b.snapshot));
    process.exit(0);
  }
  if (command === "impact") {
    const { repository, git, store, semanticCache } = await context();
    const commit = process.argv[3] ?? await git.getHead();
    const ids = process.argv.slice(4);
    if (!ids.length) throw new Error("Usage: gctg impact <commit> <nodeId> [nodeId...]");
    const result = await indexAt(git, store, semanticCache, repository.root, commit);
    json(new ImpactQueryService(store).analyze(result.snapshot, { changedNodeIds: ids }));
    process.exit(0);
  }
  if (command === "test-gaps") {
    const { repository, git, store, semanticCache } = await context();
    const commit = process.argv[3] ?? await git.getHead();
    const packageId = process.argv.includes("--package") ? process.argv[process.argv.indexOf("--package") + 1] : undefined;
    const result = await indexAt(git, store, semanticCache, repository.root, commit);
    const currentNodeIds = new Set(result.snapshot.nodes.map(node => node.id));
    let changedNodeIds = [];
    const commitInfo = await git.getCommit(commit);
    if (commitInfo.parents?.length) {
      const parent = await indexAt(git, store, semanticCache, repository.root, commitInfo.parents[0]);
      const diff = diffSnapshots(parent.snapshot, result.snapshot);
      changedNodeIds = [...new Set([...diff.addedNodes, ...diff.changedNodes])].filter(id => currentNodeIds.has(id));
    }
    const packageNode = packageId ? result.snapshot.nodes.find(node => node.type === "Package" && (node.id === packageId || node.attributes.name === packageId)) : undefined;
    const analysisPackageId = packageNode?.id ?? packageId;
    const analysis = new (await import("../dist/application/impact/test-gap-analyzer.js")).TestGapAnalyzer().analyze(result.snapshot, { changedNodeIds, packageId: analysisPackageId });
    json(analysis);
    process.exit(0);
  }
  if (command === "test-impact") {
    const { repository, git, store, semanticCache } = await context();
    const commit = process.argv[3] ?? await git.getHead();
    const packageId = process.argv.includes("--package") ? process.argv[process.argv.indexOf("--package") + 1] : undefined;
    const result = await indexAt(git, store, semanticCache, repository.root, commit);
    const commitInfo = await git.getCommit(commit);
    let changedSymbolIds = result.snapshot.nodes
      .filter(node => node.type === "Symbol")
      .filter(node => node.attributes.fileId)
      .filter(node => {
        if (!packageId) return true;
        const file = result.snapshot.nodes.find(candidate => candidate.id === node.attributes.fileId);
        return file?.attributes.packageId === packageId;
      })
      .map(node => node.id);
    if (commitInfo.parents?.length) {
      const parent = await indexAt(git, store, semanticCache, repository.root, commitInfo.parents[0]);
      const diff = diffSnapshots(parent.snapshot, result.snapshot);
      const changedIds = new Set([...diff.addedNodes, ...diff.changedNodes]);
      changedSymbolIds = result.snapshot.nodes
        .filter(node => node.type === "Symbol" && changedIds.has(node.id))
        .filter(node => {
          if (!packageId) return true;
          const file = result.snapshot.nodes.find(candidate => candidate.id === node.attributes.fileId);
          return file?.attributes.packageId === packageId;
        })
        .map(node => node.id);
    }
    const gapAnalysis = new TestGapAnalyzer().analyze(result.snapshot, { changedNodeIds: changedSymbolIds, packageId });
    json(new TestImpactAnalyzer().analyze(result.snapshot, { changedSymbolIds, coverageLinks: gapAnalysis.coverageLinks }));
    process.exit(0);
  }
  if (command === "pr-review") {
    const { repository, git, store, semanticCache } = await context();
    const ownerRepo = process.argv[3];
    const number = Number(process.argv[4]);
    if (!ownerRepo || !Number.isInteger(number) || number < 1) throw new Error("Usage: gctg pr-review <owner/repo> <number>");
    const pullRequest = await new GitHubPullRequestProvider().get(ownerRepo, number);
    if (!pullRequest.base || !pullRequest.head) throw new Error("Pull request metadata does not contain base/head refs");
    const changeSet = await new PullRequestChangeSetService(git).build({ repository: repository.root, pullRequest, base: pullRequest.base, head: pullRequest.head });
    const result = await indexAt(git, store, semanticCache, repository.root, changeSet.head);
    const baseResult = await indexAt(git, store, semanticCache, repository.root, changeSet.mergeBase);
    const diff = diffSnapshots(baseResult.snapshot, result.snapshot);
    const changedSymbolIds = result.snapshot.nodes.filter(node => node.type === "Symbol" && new Set([...diff.addedNodes, ...diff.changedNodes]).has(node.id)).map(node => node.id);
    const removedSymbolIds = (await import("../dist/application/analysis/graph-diff.js")).removedSymbolIdsFromDiff(baseResult.snapshot, result.snapshot, diff);
    json(new PullRequestReviewService().analyze({ changeSet, pullRequest, current: result.snapshot, changedSymbolIds, removedSymbolIds }));
    process.exit(0);
  }
  if (command === "branches") {
    const { git } = await context();
    json({ current: await git.getCurrentBranch(), branches: await git.listBranches() });
    process.exit(0);
  }
  if (command === "change-intelligence") {
    const { repository, git, store, semanticCache } = await context();
    const source = (process.argv[3] ?? "COMMIT").toUpperCase();
    if (!["COMMIT", "BRANCH"].includes(source)) throw new Error("Usage: gctg change-intelligence [COMMIT <commit>] | [BRANCH <base> [head]]");
    const commit = process.argv[4];
    const base = process.argv[4];
    const head = process.argv[5];
    const indexer = { index: (hash) => indexAt(git, store, semanticCache, repository.root, hash) };
    const intelligence = new ChangeIntelligenceQueryService(repository.root, git, indexer);
    json(await intelligence.analyze({
      source,
      ...(source === "COMMIT" && commit ? { commit } : {}),
      ...(source === "BRANCH" && base ? { base, ...(head ? { head } : {}) } : {})
    }));
    process.exit(0);
  }
  if (command === "branch-review") {
    const { repository, git, store, semanticCache } = await context();
    const base = process.argv[3];
    const head = process.argv[4] ?? await git.getCurrentBranch();
    if (!base) throw new Error("Usage: gctg branch-review <base> [head]");
    const changeSet = await new BranchChangeSetService(git).build({ repository: repository.root, base, head });
    const result = await indexAt(git, store, semanticCache, repository.root, changeSet.head);
    const baseResult = await indexAt(git, store, semanticCache, repository.root, changeSet.mergeBase);
    const diff = diffSnapshots(baseResult.snapshot, result.snapshot);
    const changedIds = new Set([...diff.addedNodes, ...diff.changedNodes]);
    const changedSymbolIds = result.snapshot.nodes.filter(node => node.type === "Symbol" && changedIds.has(node.id)).map(node => node.id);
    json(new BranchReviewService().analyze({ changeSet, current: result.snapshot, changedSymbolIds }));
    process.exit(0);
  }
  if (command === "workflow") {
    const { repository, git, store, semanticCache } = await context();
    const commit = process.argv[3] ?? await git.getHead();
    const result = await indexAt(git, store, semanticCache, repository.root, commit);
    const commitInfo = await git.getCommit(commit);
    let changedSymbolIds = result.snapshot.nodes.filter(node => node.type === "Symbol").map(node => node.id);
    if (commitInfo.parents?.length) {
      const parent = await indexAt(git, store, semanticCache, repository.root, commitInfo.parents[0]);
      const diff = diffSnapshots(parent.snapshot, result.snapshot);
      const changedIds = new Set([...diff.addedNodes, ...diff.changedNodes]);
      changedSymbolIds = result.snapshot.nodes.filter(node => node.type === "Symbol" && changedIds.has(node.id)).map(node => node.id);
    }
    const gapAnalysis = new TestGapAnalyzer().analyze(result.snapshot, { changedNodeIds: changedSymbolIds });
    const impact = new TestImpactAnalyzer().analyze(result.snapshot, { changedSymbolIds, coverageLinks: gapAnalysis.coverageLinks });
    const affectedSymbolIds = new ImpactEngine().analyze(result.snapshot, { changedNodeIds: changedSymbolIds, targetTypes: ["Symbol"] }).map(item => item.nodeId);
    json(buildWorkflowGraph({
      repository: result.snapshot.repository,
      commit: result.snapshot.commit,
      changedSymbolIds,
      affectedSymbolIds,
      impacts: impact.impacts,
      nodes: result.snapshot.nodes
    }));
    process.exit(0);
  }
  if (command === "execution-plan") {
    const { repository, git, store, semanticCache } = await context();
    const commit = process.argv[3] ?? await git.getHead();
    const formatIndex = process.argv.indexOf("--format");
    const format = formatIndex >= 0 ? process.argv[formatIndex + 1] : "json";
    if (!["json", "yaml", "md", "mermaid"].includes(format)) throw new Error("Usage: gctg execution-plan [commit] --format json|yaml|md|mermaid");
    const result = await indexAt(git, store, semanticCache, repository.root, commit);
    const commitInfo = await git.getCommit(commit);
    let changedSymbolIds = result.snapshot.nodes.filter(node => node.type === "Symbol").map(node => node.id);
    if (commitInfo.parents?.length) {
      const parent = await indexAt(git, store, semanticCache, repository.root, commitInfo.parents[0]);
      const diff = diffSnapshots(parent.snapshot, result.snapshot);
      const changedIds = new Set([...diff.addedNodes, ...diff.changedNodes]);
      changedSymbolIds = result.snapshot.nodes.filter(node => node.type === "Symbol" && changedIds.has(node.id)).map(node => node.id);
    }
    const gapAnalysis = new TestGapAnalyzer().analyze(result.snapshot, { changedNodeIds: changedSymbolIds });
    const impact = new TestImpactAnalyzer().analyze(result.snapshot, { changedSymbolIds, coverageLinks: gapAnalysis.coverageLinks });
    const plan = buildExecutionPlan({ repository: result.snapshot.repository, commit: result.snapshot.commit, nodes: result.snapshot.nodes, edges: result.snapshot.edges, impacts: impact.impacts });
    process.stdout.write(serializeExecutionPlan(plan, format));
    process.exit(0);
  }
  if (command === "run-plan") {
    const { repository, git, store, semanticCache } = await context();
    const commit = process.argv[3] ?? await git.getHead();
    const result = await indexAt(git, store, semanticCache, repository.root, commit);
    const commitInfo = await git.getCommit(commit);
    let changedSymbolIds = result.snapshot.nodes.filter(node => node.type === "Symbol").map(node => node.id);
    if (commitInfo.parents?.length) {
      const parent = await indexAt(git, store, semanticCache, repository.root, commitInfo.parents[0]);
      const diff = diffSnapshots(parent.snapshot, result.snapshot);
      const changedIds = new Set([...diff.addedNodes, ...diff.changedNodes]);
      changedSymbolIds = result.snapshot.nodes.filter(node => node.type === "Symbol" && changedIds.has(node.id)).map(node => node.id);
    }
    const gapAnalysis = new TestGapAnalyzer().analyze(result.snapshot, { changedNodeIds: changedSymbolIds });
    const impact = new TestImpactAnalyzer().analyze(result.snapshot, { changedSymbolIds, coverageLinks: gapAnalysis.coverageLinks });
    const plan = buildExecutionPlan({
      repository: result.snapshot.repository,
      commit: result.snapshot.commit,
      nodes: result.snapshot.nodes,
      edges: result.snapshot.edges,
      impacts: impact.impacts
    });
    const execution = await new ExecutionPlanRunner({ run: runProcess }).execute(plan);
    const feedback = buildWorkflowExecutionFeedback(plan, execution);
    const resultStore = new JsonTestResultStore(repository.root + "/.gctg/results/execution");
    const feedbackStore = new JsonTestResultStore(repository.root + "/.gctg/results/feedback");
    await resultStore.save(feedback.executionId, execution);
    await resultStore.save(`latest:${repository.root}:${commit}`, execution);
    await feedbackStore.save(feedback.executionId, feedback);
    await feedbackStore.save(`latest:${repository.root}:${commit}`, feedback);
    json({ execution, feedback });
    process.exit(execution.passed ? 0 : 1);
  }
  if (command === "execution-feedback") {
    const { repository, git } = await context();
    const commit = process.argv[3] ?? await git.getHead();
    const feedbackStore = new JsonTestResultStore(repository.root + "/.gctg/results/feedback");
    const feedback = await feedbackStore.get(`latest:${repository.root}:${commit}`);
    if (!feedback) throw new Error(`No execution feedback found for commit ${commit}`);
    json(feedback);
    process.exit(0);
  }
  if (command === "tests") {
    const { repository, git, store, semanticCache } = await context();
    const commit = process.argv[3] ?? await git.getHead();
    const result = await indexAt(git, store, semanticCache, repository.root, commit);
    json(result.snapshot.nodes.filter(node => ["TestProject", "TestFile", "TestCase"].includes(node.type)));
    process.exit(0);
  }
  if (command === "run") {
    const executable = process.argv[3];
    const args = process.argv.slice(4);
    if (!executable) throw new Error("Usage: gctg run <executable> [args...]");
    const result = await runProcess({ executable, args, cwd: root });
    json(result);
    process.exit(result.exitCode);
  }
  if (command === "serve") {
    const { startServer } = await import("../dist/infrastructure/http/server.js");
    const port = Number(process.argv[3] ?? 3717);
    await startServer(root, port);
    console.log("gctg server listening on http://127.0.0.1:" + port);
    await new Promise(() => {});
  }
  console.log("Usage: gctg [--version] | status | commits [limit] | branches | change-intelligence [COMMIT <commit>] | branch-review <base> [head] | pr-review <owner/repo> <number> | index [commit] | graph [commit] [type] | diff <from> <to> | impact <commit> <nodeId...> | test-gaps [commit] [--package <name-or-id>] | test-impact [commit] [--package <name-or-id>] | workflow [commit] | execution-plan [commit] [--format json|yaml|md|mermaid] | run-plan [commit] | execution-feedback [commit] | tests [commit] | run <executable> [args...] | serve [port]");
  process.exit(command === "help" ? 0 : 2);
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  console.error(message);
  process.exit(message.startsWith("Usage:") ? 2 : 1);
}
