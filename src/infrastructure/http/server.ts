import { createServer } from "node:http";
import {
  discoverRepository, CliGitRepository, TypeScriptProjectAnalyzer, JsonGraphStore, JsonSemanticCache,
  RepositoryIndexer, IncrementalRepositoryIndexer, ImpactQueryService, ImpactEngine, TestGapAnalyzer,
  TestImpactAnalyzer, buildExecutionPlan, diffSnapshots, changedSymbolIdsFromDiff, removedSymbolIdsFromDiff, configurationFingerprint, IndexLock,
  JsonTestResultStore, ExecutionPlanRunner, runProcess, buildWorkflowExecutionFeedback,
  BranchChangeSetService, BranchReviewService, PullRequestChangeSetService, PullRequestReviewService, GitHubPullRequestProvider,
  ChangeIntelligenceQueryService, ConfigurationService, JsonConfigurationStore, analyzeRepositoryEcosystem, analyzeMonorepo
} from "../../index.js";
import { renderGui } from "../../gui/app.js";
import { GCTG_VERSION } from "../../version.js";
import { SECURITY_POLICY, sanitizeErrorMessage } from "../../domain/security/policy.js";

const analyzerVersion = GCTG_VERSION;

export async function startServer(root: string, port: number): Promise<void> {
  const repository = await discoverRepository(root);
  let configuration = (await new ConfigurationService(new JsonConfigurationStore()).resolve(repository.root)).configuration;
  const git = new CliGitRepository(repository.root);
  const store = new JsonGraphStore(repository.root + "/.gctg/graph");
  const cache = new JsonSemanticCache(repository.root + "/.gctg/cache/semantic");
  const fullIndexer = new RepositoryIndexer(git, new TypeScriptProjectAnalyzer(), store, cache);
  const indexAt = async (commit: string) => {
    const incremental = new IncrementalRepositoryIndexer(
      git,
      fullIndexer,
      (repo, hash, version, fingerprint) => store.getSnapshot(repo, hash, version, fingerprint)
    );
    const release = await new IndexLock(repository.root + "/.gctg/index.lock").acquire();
    try {
      return await incremental.index({
        repository: repository.root,
        commit,
        configuration,
        analyzerVersion
      });
    } finally {
      await release();
    }
  };

  const changedSymbols = async (commit: string, snapshot: Awaited<ReturnType<typeof indexAt>>["snapshot"]) => {
    const info = await git.getCommit(commit);
    if (!info.parents?.length) return snapshot.nodes.filter(node => node.type === "Symbol").map(node => node.id);
    const parent = await indexAt(info.parents[0]!);
    const diff = diffSnapshots(parent.snapshot, snapshot);
    return changedSymbolIdsFromDiff(parent.snapshot, snapshot, diff);
  };

  const buildChangeContext = async (commit: string) => {
    const indexed = await indexAt(commit);
    const symbolIds = await changedSymbols(commit, indexed.snapshot);
    const gaps = new TestGapAnalyzer().analyze(indexed.snapshot, { changedNodeIds: symbolIds });
    const testImpact = new TestImpactAnalyzer().analyze(indexed.snapshot, {
      changedSymbolIds: symbolIds,
      coverageLinks: gaps.coverageLinks
    });
    const affected = new ImpactEngine().analyze(indexed.snapshot, {
      changedNodeIds: symbolIds,
      targetTypes: ["Symbol"]
    }).map(item => item.nodeId);
    const info = await git.getCommit(commit);
    const diff = info.parents?.length
      ? diffSnapshots((await indexAt(info.parents[0]!)).snapshot, indexed.snapshot)
      : undefined;
    return { indexed, info, symbolIds, gaps, testImpact, affected, diff };
  };

  const buildBranchReview = async (base: string, head?: string) => {
    const branchService = new BranchChangeSetService(git);
    const changeSet = await branchService.build({ repository: repository.root, base, ...(head ? { head } : {}) });
    const indexed = await indexAt(changeSet.head);
    const baseIndexed = await indexAt(changeSet.mergeBase);
    const diff = diffSnapshots(baseIndexed.snapshot, indexed.snapshot);
    const changedSymbolIds = changedSymbolIdsFromDiff(baseIndexed.snapshot, indexed.snapshot, diff);
    const removedSymbolIds = removedSymbolIdsFromDiff(baseIndexed.snapshot, indexed.snapshot, diff);
    return new BranchReviewService().analyze({
      changeSet,
      current: indexed.snapshot,
      changedSymbolIds,
      removedSymbolIds
    });
  };

  const buildPullRequestReview = async (ownerRepo: string, number: number) => {
    const pullRequest = await new GitHubPullRequestProvider().get(ownerRepo, number);
    await git.ensureCommit(pullRequest.baseSha);
    const headRemoteUrl = "https://github.com/" + pullRequest.headRepository + ".git";
    await git.ensureCommit(pullRequest.headSha, headRemoteUrl);
    const changeSet = await new PullRequestChangeSetService(git).build({ repository: repository.root, pullRequest, base: pullRequest.baseSha, head: pullRequest.headSha });
    const indexed = await indexAt(changeSet.head);
    const baseIndexed = await indexAt(changeSet.mergeBase);
    const diff = diffSnapshots(baseIndexed.snapshot, indexed.snapshot);
    const changedSymbolIds = changedSymbolIdsFromDiff(baseIndexed.snapshot, indexed.snapshot, diff);
    const removedSymbolIds = removedSymbolIdsFromDiff(baseIndexed.snapshot, indexed.snapshot, diff);
    return new PullRequestReviewService().analyze({ changeSet, pullRequest, current: indexed.snapshot, base: baseIndexed.snapshot, changedSymbolIds, removedSymbolIds });
  };

  const configurationService = new ConfigurationService(new JsonConfigurationStore());
  const send = (response: import("node:http").ServerResponse, status: number, value: unknown) => {
    response.writeHead(status, { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" });
    response.end(JSON.stringify(value));
  };
  const readJsonBody = async (request: import("node:http").IncomingMessage): Promise<unknown> => {
    const declaredLength = Number(request.headers["content-length"] ?? 0);
    if (Number.isFinite(declaredLength) && declaredLength > SECURITY_POLICY.maxHttpBodyBytes) {
      const error = new Error("Request body is too large.");
      (error as Error & { statusCode?: number }).statusCode = 413;
      throw error;
    }
    const chunks: Buffer[] = [];
    let total = 0;
    for await (const chunk of request) {
      const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
      total += buffer.length;
      if (total > SECURITY_POLICY.maxHttpBodyBytes) {
        const error = new Error("Request body is too large.");
        (error as Error & { statusCode?: number }).statusCode = 413;
        throw error;
      }
      chunks.push(buffer);
    }
    if (!chunks.length) throw new Error("Request body is required.");
    try {
      return JSON.parse(Buffer.concat(chunks).toString("utf8")) as unknown;
    } catch {
      const error = new Error("Malformed JSON request body.");
      (error as Error & { statusCode?: number }).statusCode = 400;
      throw error;
    }
  };

  const server = createServer(async (request, response) => {
    try {
      const url = new URL(request.url ?? "/", "http://127.0.0.1");
      if (url.pathname === "/") {
        response.writeHead(200, { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" });
        response.end(renderGui());
        return;
      }
      if (url.pathname === "/api/config" && request.method === "GET") {
        send(response, 200, await configurationService.resolve(repository.root));
        return;
      }
      if (url.pathname === "/api/config" && request.method === "POST") {
        const update = await configurationService.update(repository.root, await readJsonBody(request));
        configuration = update.configuration;
        send(response, 200, update);
        return;
      }
      if (url.pathname === "/api/monorepo") {
        const commit = url.searchParams.get("commit") ?? await git.getHead();
        const indexed = await indexAt(commit);
        send(response, 200, analyzeMonorepo(indexed.snapshot));
        return;
      }
      if (url.pathname === "/api/ecosystem") {
        const commit = url.searchParams.get("commit") ?? await git.getHead();
        const indexed = await indexAt(commit);
        send(response, 200, analyzeRepositoryEcosystem(indexed.snapshot));
        return;
      }
      if (url.pathname === "/api/status") {
        send(response, 200, { root: repository.root, head: await git.getHead(), workspaceFiles: repository.workspaceFiles });
        return;
      }
      if (url.pathname === "/api/commits") {
        send(response, 200, await git.listCommits(Number(url.searchParams.get("limit") ?? 20)));
        return;
      }
      if (url.pathname === "/api/branches") {
        send(response, 200, {
          current: await git.getCurrentBranch(),
          branches: await git.listBranches()
        });
        return;
      }
      if (url.pathname === "/api/branch-review") {
        const base = url.searchParams.get("base");
        if (!base) return send(response, 400, { error: "Missing base branch" });
        const head = url.searchParams.get("head") ?? undefined;
        send(response, 200, await buildBranchReview(base, head));
        return;
      }
      if (url.pathname === "/api/pull-request-review") {
        const ownerRepo = url.searchParams.get("ownerRepo");
        const number = Number(url.searchParams.get("number"));
        if (!ownerRepo || !Number.isInteger(number) || number < 1) return send(response, 400, { error: "Missing ownerRepo or valid number" });
        send(response, 200, await buildPullRequestReview(ownerRepo, number));
        return;
      }
      if (url.pathname === "/api/change-intelligence") {
        const requestedSource = (url.searchParams.get("source") ?? "COMMIT").toUpperCase();
        if (requestedSource !== "COMMIT" && requestedSource !== "BRANCH") return send(response, 400, { error: "source must be COMMIT or BRANCH" });
        const source = requestedSource as "COMMIT" | "BRANCH";
        const commit = url.searchParams.get("commit") ?? undefined;
        const base = url.searchParams.get("base") ?? undefined;
        const head = url.searchParams.get("head") ?? undefined;
        const intelligence = new ChangeIntelligenceQueryService(repository.root, git, { index: indexAt });
        send(response, 200, await intelligence.analyze({
          source,
          ...(commit ? { commit } : {}),
          ...(base ? { base } : {}),
          ...(head ? { head } : {})
        }));
        return;
      }
      if (url.pathname === "/api/overview") {
        const commit = url.searchParams.get("commit") ?? await git.getHead();
        const c = await buildChangeContext(commit);
        send(response, 200, {
          repository: c.indexed.snapshot.repository,
          commit,
          subject: c.info.message.split("\\n")[0],
          changedFiles: c.diff ? c.diff.addedNodes.length + c.diff.removedNodes.length + c.diff.changedNodes.length : 0,
          changedSymbols: c.symbolIds.length,
          affectedSymbols: c.affected.length,
          impactedTestCases: c.testImpact.impactedTestCases
        });
        return;
      }
      if (url.pathname === "/api/graph-view") {
        const commit = url.searchParams.get("commit") ?? await git.getHead();
        const c = await buildChangeContext(commit);
        const interesting = new Set([
          ...c.symbolIds,
          ...c.affected,
          ...c.testImpact.impacts.flatMap(item => [item.testProjectId, item.testFileId, item.testCaseId])
        ]);
        const nodes = c.indexed.snapshot.nodes.filter(node =>
          interesting.has(node.id) ||
          (node.type === "TestProject" && c.testImpact.impacts.some(item => item.testProjectId === node.id))
        ).map(node => ({
          ...node,
          attributes: {
            ...node.attributes,
            ...(c.symbolIds.includes(node.id) ? { changed: true } : {}),
            ...(c.affected.includes(node.id) ? { affected: true } : {})
          }
        }));
        const ids = new Set(nodes.map(node => node.id));
        const edges = c.indexed.snapshot.edges.filter(edge => ids.has(edge.source) && ids.has(edge.target));
        send(response, 200, { schemaVersion: "1.0.0", repository: c.indexed.snapshot.repository, commit, nodes, edges });
        return;
      }
      if (url.pathname === "/api/node") {
        const commit = url.searchParams.get("commit") ?? await git.getHead();
        const nodeId = url.searchParams.get("nodeId");
        if (!nodeId) return send(response, 400, { error: "Missing nodeId" });
        const indexed = await indexAt(commit);
        const node = indexed.snapshot.nodes.find(candidate => candidate.id === nodeId);
        if (!node) return send(response, 404, { error: "Node not found" });
        const incoming = indexed.snapshot.edges.filter(edge => edge.target === nodeId);
        const outgoing = indexed.snapshot.edges.filter(edge => edge.source === nodeId);
        send(response, 200, { node, incoming, outgoing });
        return;
      }
      if (url.pathname === "/api/test-impact") {
        const commit = url.searchParams.get("commit") ?? await git.getHead();
        const c = await buildChangeContext(commit);
        send(response, 200, c.testImpact);
        return;
      }
      if (url.pathname === "/api/test-gaps") {
        const commit = url.searchParams.get("commit") ?? await git.getHead();
        const c = await buildChangeContext(commit);
        send(response, 200, c.gaps);
        return;
      }
      if (url.pathname === "/api/execution-plan") {
        const commit = url.searchParams.get("commit") ?? await git.getHead();
        const c = await buildChangeContext(commit);
        send(response, 200, buildExecutionPlan({
          repository: c.indexed.snapshot.repository,
          commit,
          nodes: c.indexed.snapshot.nodes,
          edges: c.indexed.snapshot.edges,
          impacts: c.testImpact.impacts
        }));
        return;
      }
      if (url.pathname === "/api/run-execution-plan" && request.method === "POST") {
        if (request.headers["x-gctg-execution-approval"] !== "true") return send(response, 403, { error: "Execution approval is required." });
        const commit = url.searchParams.get("commit") ?? await git.getHead();
        const c = await buildChangeContext(commit);
        const plan = buildExecutionPlan({
          repository: c.indexed.snapshot.repository,
          commit,
          nodes: c.indexed.snapshot.nodes,
          edges: c.indexed.snapshot.edges,
          impacts: c.testImpact.impacts
        });
        const execution = await new ExecutionPlanRunner({ run: runProcess }).execute(plan);
        const feedback = buildWorkflowExecutionFeedback(plan, execution);
        const resultStore = new JsonTestResultStore(repository.root + "/.gctg/results");
        await resultStore.save(feedback.executionId, { execution, feedback });
        await resultStore.save("latest:" + repository.root + ":" + commit, { execution, feedback });
        send(response, 200, { execution, feedback });
        return;
      }
      if (url.pathname === "/api/execution-feedback") {
        const commit = url.searchParams.get("commit") ?? await git.getHead();
        const resultStore = new JsonTestResultStore(repository.root + "/.gctg/results");
        send(response, 200, await resultStore.get("latest:" + repository.root + ":" + commit) ?? { found: false, commit });
        return;
      }
      if (url.pathname === "/api/graph") {
        const commit = url.searchParams.get("commit") ?? await git.getHead();
        const indexed = await indexAt(commit);
        const type = url.searchParams.get("type");
        send(response, 200, type ? indexed.snapshot.nodes.filter(node => node.type === type) : indexed.snapshot);
        return;
      }
      if (url.pathname === "/api/tests") {
        const commit = url.searchParams.get("commit") ?? await git.getHead();
        const indexed = await indexAt(commit);
        send(response, 200, indexed.snapshot.nodes.filter(node => ["TestProject", "TestFile", "TestCase"].includes(node.type)));
        return;
      }
      if (url.pathname === "/api/diff") {
        const from = url.searchParams.get("from");
        const to = url.searchParams.get("to") ?? await git.getHead();
        if (!from) return send(response, 400, { error: "Missing from commit" });
        const [a, b] = await Promise.all([indexAt(from), indexAt(to)]);
        send(response, 200, diffSnapshots(a.snapshot, b.snapshot));
        return;
      }
      if (url.pathname === "/api/impact") {
        const commit = url.searchParams.get("commit") ?? await git.getHead();
        const ids = url.searchParams.getAll("nodeId");
        if (!ids.length) return send(response, 400, { error: "Missing nodeId" });
        const indexed = await indexAt(commit);
        send(response, 200, new ImpactQueryService(store).analyze(indexed.snapshot, { changedNodeIds: ids }));
        return;
      }
      send(response, 404, { error: "Not found" });
    } catch (error) {
      const statusCode = error && typeof error === "object" && "statusCode" in error && typeof error.statusCode === "number" ? error.statusCode : 500;
      const publicMessage = statusCode === 400 || statusCode === 413 ? sanitizeErrorMessage(error) : "Internal server error.";
      send(response, statusCode, { error: publicMessage });
    }
  });

  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(port, "127.0.0.1", resolve);
  });
}
