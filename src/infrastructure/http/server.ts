import { createServer } from "node:http";
import {
  ImpactQueryService, ImpactEngine, TestGapAnalyzer,
  TestImpactAnalyzer, buildExecutionPlan, diffSnapshots, changedSymbolIdsFromDiff, removedSymbolIdsFromDiff,
  JsonTestResultStore, ExecutionPlanRunner, runProcess, buildWorkflowExecutionFeedback,
  BranchChangeSetService, BranchReviewService, PullRequestChangeSetService, PullRequestReviewService, GitHubPullRequestProvider,
  ChangeIntelligenceQueryService, analyzeRepositoryEcosystem, analyzeMonorepo, HistoricalIntelligenceService, CiAnalysisService, DiagnosticsService
} from "../../index.js";
import { renderGui } from "../../gui/app.js";
import { GCTG_VERSION } from "../../version.js";
import { ApplicationRuntime } from "../../runtime/application-runtime.js";
import { SECURITY_POLICY, sanitizeErrorMessage } from "../../domain/security/policy.js";
import { BackupRestoreService } from "../../application/recovery/backup-restore-service.js";
import { RepairRehydrationService } from "../../application/recovery/repair-rehydration-service.js";

const analyzerVersion = GCTG_VERSION;

export async function startServer(root: string, port: number): Promise<void> {
  const runtime = await ApplicationRuntime.create(root, { analyzerVersion });
  const repository = runtime.repository;
  const git = runtime.git;
  const store = runtime.store;
  const cache = runtime.cache;
  const indexAt = async (commit: string) => runtime.index(commit);

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
        send(response, 200, await runtime.resolveConfiguration());
        return;
      }
      if (url.pathname === "/api/config" && request.method === "POST") {
        const update = await runtime.updateConfiguration(await readJsonBody(request));
        send(response, 200, update);
        return;
      }
      if (url.pathname === "/api/monorepo") {
        const commit = url.searchParams.get("commit") ?? await git.getHead();
        const indexed = await indexAt(commit);
        send(response, 200, analyzeMonorepo(indexed.snapshot));
        return;
      }
      if (url.pathname === "/api/diagnostics") {
        const commit = url.searchParams.get("commit") ?? await git.getHead();
        const diagnostics = new DiagnosticsService();
        const operation = diagnostics.begin("index", repository.root, commit);
        const indexed = await indexAt(commit);
        send(response, 200, diagnostics.complete("index", operation, repository.root, analyzerVersion, indexed));
        return;
      }
      if (url.pathname === "/api/ci") {
        const source = (url.searchParams.get("source") ?? "COMMIT").toUpperCase();
        const format = (url.searchParams.get("format") ?? "json") as "json" | "sarif" | "summary";
        if (!["COMMIT", "BRANCH"].includes(source)) return send(response, 400, { error: "source must be COMMIT or BRANCH" });
        if (!["json", "sarif", "summary"].includes(format)) return send(response, 400, { error: "format must be json, sarif or summary" });
        const intelligence = new ChangeIntelligenceQueryService(repository.root, git, { index: indexAt });
        const result = new CiAnalysisService().analyze(await intelligence.analyze({ source: source as "COMMIT" | "BRANCH", ...(url.searchParams.get("commit") ? { commit: url.searchParams.get("commit")! } : {}), ...(url.searchParams.get("base") ? { base: url.searchParams.get("base")!, ...(url.searchParams.get("head") ? { head: url.searchParams.get("head")! } : {}) } : {}) }));
        if (format === "json") return send(response, 200, result);
        response.writeHead(result.exitCode === 0 ? 200 : result.exitCode === 1 ? 422 : 409, { "content-type": format === "sarif" ? "application/sarif+json; charset=utf-8" : "text/plain; charset=utf-8", "cache-control": "no-store" });
        response.end(new CiAnalysisService().serialize(result, format));
        return;
      }
      if (url.pathname === "/api/historical-intelligence") {
        const from = url.searchParams.get("from");
        const to = url.searchParams.get("to") ?? await git.getHead();
        const maxCommits = Number(url.searchParams.get("maxCommits") ?? 50);
        if (!from) return send(response, 400, { error: "Missing from commit" });
        if (!Number.isInteger(maxCommits) || maxCommits < 2 || maxCommits > 200) return send(response, 400, { error: "Invalid maxCommits" });
        const service = new HistoricalIntelligenceService(git, { load: async commit => (await indexAt(commit)).snapshot });
        send(response, 200, await service.analyze({ repository: repository.root, fromCommit: from, toCommit: to, maxCommits }));
        return;
      }
      if (url.pathname === "/api/ecosystem") {
        const commit = url.searchParams.get("commit") ?? await git.getHead();
        const indexed = await indexAt(commit);
        send(response, 200, analyzeRepositoryEcosystem(indexed.snapshot));
        return;
      }
      if (url.pathname === "/api/health") {
        const { HealthService } = await import("../../application/operations/health-service.js");
        send(response, 200, await new HealthService().check(runtime));
        return;
      }
      if (url.pathname === "/api/diagnostic-bundle") {
        const { buildDiagnosticBundle } = await import("../../application/operations/diagnostic-bundle-service.js");
        send(response, 200, await buildDiagnosticBundle(runtime));
        return;
      }
      if (url.pathname === "/api/consistency-check") {
        const { ConsistencyChecker } = await import("../../application/recovery/consistency-checker.js");
        send(response, 200, await new ConsistencyChecker(runtime.store).check());
        return;
      }
      if (url.pathname === "/api/recovery" && request.method === "GET") {
        send(response, 200, { supported: true, format: "gctg-backup", schemaVersion: 1 });
        return;
      }
      if (url.pathname === "/api/recovery/interrupted" && request.method === "GET") {
        send(response, 200, await runtime.recovery.status());
        return;
      }
      if (url.pathname === "/api/recovery/interrupted" && request.method === "POST") {
        const body = await readJsonBody(request) as { operation?: string };
        const operation = body.operation ?? "status";
        if (operation === "status") send(response, 200, await runtime.recovery.status());
        else if (operation === "resume") send(response, 200, await runtime.recovery.resume());
        else if (operation === "rollback") send(response, 200, await runtime.recovery.rollback());
        else return send(response, 400, { error: "operation must be status, resume or rollback" });
        return;
      }
      if (url.pathname === "/api/recovery/repair" && request.method === "POST") {
        const body = await readJsonBody(request) as { operation?: string };
        const operation = body.operation ?? "plan";
        if (operation !== "plan" && operation !== "apply") return send(response, 400, { error: "operation must be plan or apply" });
        const service = new RepairRehydrationService(runtime);
        const plan = operation === "plan" ? await service.plan(repository.root) : await service.apply(repository.root);
        send(response, 200, { operation, plan });
        return;
      }
      if (url.pathname === "/api/recovery" && request.method === "POST") {
        const body = await readJsonBody(request) as { operation?: string; backupPath?: string };
        const operation = body.operation ?? "create";
        if (operation === "repair_plan" || operation === "repair_apply") {
          const service = new RepairRehydrationService(runtime);
          const plan = operation === "repair_plan" ? await service.plan(repository.root) : await service.apply(repository.root);
          send(response, 200, { operation, plan });
          return;
        }
        const service = new BackupRestoreService();
        if (operation === "create") {
          const backupPath = body.backupPath ?? repository.root + "/.gctg/backups/gctg-backup-" + Date.now() + ".json";
          send(response, 200, { operation, backupPath, manifest: await service.create(repository.root, backupPath) });
          return;
        }
        if (operation === "inspect" || operation === "restore") {
          if (typeof body.backupPath !== "string" || !body.backupPath) return send(response, 400, { error: "backupPath is required" });
          const manifest = operation === "inspect" ? await service.inspect(body.backupPath) : await service.restore(repository.root, body.backupPath);
          send(response, 200, { operation, backupPath: body.backupPath, manifest });
          return;
        }
        return send(response, 400, { error: "operation must be create, inspect or restore" });
      }
      if (url.pathname === "/api/operations") {
        const limit = url.searchParams.get("limit");
        const parsedLimit = limit === null ? undefined : Number(limit);
        if (parsedLimit !== undefined && (!Number.isInteger(parsedLimit) || parsedLimit < 0 || parsedLimit > 100)) {
          return send(response, 400, { error: "limit must be an integer between 0 and 100" });
        }
        const requestedState = url.searchParams.get("state");
        const validStates = ["queued", "running", "succeeded", "failed", "cancelled", "recovered"];
        if (requestedState !== null && !validStates.includes(requestedState)) {
          return send(response, 400, { error: "state is invalid" });
        }
        send(response, 200, await runtime.operationsHistory({
          ...(url.searchParams.get("name") ? { name: url.searchParams.get("name")! } : {}),
          ...(requestedState ? { state: requestedState as import("../../domain/operation.js").OperationState } : {}),
          ...(parsedLimit !== undefined ? { limit: parsedLimit } : {})
        }));
        return;
      }
      if (url.pathname === "/api/progress") {
        const id = url.searchParams.get("id");
        send(response, 200, id ? runtime.progress.snapshot(id) : []);
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
      if (url.pathname === "/api/branch-lifecycle") {
        const { BranchLifecycleService } = await import("../../application/history/branch-lifecycle-service.js");
        send(response, 200, await new BranchLifecycleService(git).analyze());
        return;
      }
      if (url.pathname === "/api/branches") {
        send(response, 200, {
          current: await git.getCurrentBranch(),
          branches: await git.listBranches()
        });
        return;
      }
      if (url.pathname === "/api/reachability") {
        const commits = (url.searchParams.get("commits") ?? "").split(",").map(value => value.trim()).filter(Boolean);
        if (!commits.length) return send(response, 400, { error: "Missing commits" });
        const { ReachabilityService } = await import("../../application/history/reachability-service.js");
        send(response, 200, await new ReachabilityService(git).analyze({ commits }));
        return;
      }
      if (url.pathname === "/api/retention-plan" && request.method === "POST") {
        const body = await readJsonBody(request);
        if (!body || typeof body !== "object" || Array.isArray(body)) return send(response, 400, { error: "Invalid retention plan request" });
        const input = body as Record<string, unknown>;
        const { planRetention } = await import("../../application/history/retention-planner.js");
        const resolved = await runtime.resolveConfiguration();
        const now = typeof input.now === "string" ? input.now : new Date().toISOString();
        const candidates = Array.isArray(input.candidates) ? input.candidates : [];
        send(response, 200, planRetention(resolved.configuration, candidates as never, now));
        return;
      }
      if (url.pathname === "/api/cleanup/preview" && request.method === "POST") {
        const body = await readJsonBody(request);
        const input = body as Record<string, unknown>;
        const commits = Array.isArray(input.commits) ? input.commits.filter(value => typeof value === "string") as string[] : [];
        const { SnapshotCleanupService } = await import("../../application/history/snapshot-cleanup-service.js");
        send(response, 200, await new SnapshotCleanupService(runtime.store).preview(commits, typeof input.now === "string" ? input.now : new Date().toISOString()));
        return;
      }
      if (url.pathname === "/api/cleanup/apply" && request.method === "POST") {
        const body = await readJsonBody(request);
        const { SnapshotCleanupService } = await import("../../application/history/snapshot-cleanup-service.js");
        send(response, 200, await new SnapshotCleanupService(runtime.store).apply(body as never));
        return;
      }
      if (url.pathname === "/api/snapshot-accounting") {
        const { SnapshotAccountingService } = await import("../../application/history/snapshot-accounting-service.js");
        const resolved = await runtime.resolveConfiguration();
        send(response, 200, await new SnapshotAccountingService(runtime.store).account(resolved.configuration));
        return;
      }
      if (url.pathname === "/api/snapshot-compaction") {
        const body = request.method === "POST" ? await readJsonBody(request) : {};
        const input = body && typeof body === "object" && !Array.isArray(body) ? body as Record<string, unknown> : {};
        const protectedPaths = Array.isArray(input.protectedPaths) ? input.protectedPaths.filter(value => typeof value === "string") as string[] : [];
        const { SnapshotAccountingService } = await import("../../application/history/snapshot-accounting-service.js");
        const resolved = await runtime.resolveConfiguration();
        send(response, 200, await new SnapshotAccountingService(runtime.store).planCompaction(resolved.configuration, protectedPaths));
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
