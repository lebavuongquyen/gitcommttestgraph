import { createServer } from "node:http";
import { discoverRepository, CliGitRepository, TypeScriptSemanticAnalyzer, JsonGraphStore, RepositoryIndexer, ImpactQueryService, diffSnapshots } from "../../index.js";

export async function startServer(root: string, port: number): Promise<void> {
  const repository = await discoverRepository(root);
  const git = new CliGitRepository(repository.root);
  const store = new JsonGraphStore(repository.root + "/.gctg/graph");
  const indexer = new RepositoryIndexer(git, new TypeScriptSemanticAnalyzer(), store);
  const analyzerVersion = "0.2.0";
  const configuration = {};
  const index = async (commit: string) => indexer.index({ repository: repository.root, commit, configuration, analyzerVersion });

  const server = createServer(async (request, response) => {
    try {
      const url = new URL(request.url ?? "/", "http://127.0.0.1");
      const send = (status: number, value: unknown) => {
        response.writeHead(status, { "content-type": "application/json; charset=utf-8" });
        response.end(JSON.stringify(value));
      };
      if (url.pathname === "/api/status") return send(200, { root: repository.root, head: await git.getHead(), workspaceFiles: repository.workspaceFiles });
      if (url.pathname === "/api/commits") return send(200, await git.listCommits(Number(url.searchParams.get("limit") ?? 20)));
      if (url.pathname === "/api/graph") {
        const commit = url.searchParams.get("commit") ?? await git.getHead();
        const result = await index(commit);
        const type = url.searchParams.get("type");
        return send(200, type ? result.snapshot.nodes.filter(node => node.type === type) : result.snapshot);
      }
      if (url.pathname === "/api/tests") {
        const commit = url.searchParams.get("commit") ?? await git.getHead();
        const result = await index(commit);
        return send(200, result.snapshot.nodes.filter(node => ["TestProject", "TestFile", "TestCase"].includes(node.type)));
      }
      if (url.pathname === "/api/diff") {
        const from = url.searchParams.get("from");
        const to = url.searchParams.get("to") ?? await git.getHead();
        if (!from) return send(400, { error: "Missing from commit" });
        const [a, b] = await Promise.all([index(from), index(to)]);
        return send(200, diffSnapshots(a.snapshot, b.snapshot));
      }
      if (url.pathname === "/api/impact") {
        const commit = url.searchParams.get("commit") ?? await git.getHead();
        const ids = url.searchParams.getAll("nodeId");
        if (!ids.length) return send(400, { error: "Missing nodeId" });
        const result = await index(commit);
        return send(200, new ImpactQueryService(store).analyze(result.snapshot, { changedNodeIds: ids }));
      }
      return send(404, { error: "Not found" });
    } catch (error) {
      return send(500, { error: error instanceof Error ? error.message : String(error) });
    }
  });
  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(port, "127.0.0.1", () => resolve());
  });
}
