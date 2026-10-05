#!/usr/bin/env node
import { readFile } from "node:fs/promises";
import { discoverRepository, CliGitRepository, TypeScriptProjectAnalyzer, JsonGraphStore, RepositoryIndexer, IncrementalRepositoryIndexer, GraphQueryService, ImpactQueryService, diffSnapshots, configurationFingerprint, runProcess, IndexLock } from "../dist/index.js";

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
  return { repository, git, store };
}
async function indexAt(git, store, repository, commit) {
  const fullIndexer = new RepositoryIndexer(git, new TypeScriptProjectAnalyzer(), store);
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
    const { repository, git, store } = await context();
    const commit = process.argv[3] ?? await git.getHead();
    const result = await indexAt(git, store, repository.root, commit);
    json({ commit, reused: result.reused, nodes: result.snapshot.nodes.length, edges: result.snapshot.edges.length, metadata: result.snapshot.metadata });
    process.exit(0);
  }
  if (command === "graph") {
    const { repository, git, store } = await context();
    const commit = process.argv[3] ?? await git.getHead();
    const result = await indexAt(git, store, repository.root, commit);
    const type = process.argv[4];
    json(type ? result.snapshot.nodes.filter(node => node.type === type) : result.snapshot);
    process.exit(0);
  }
  if (command === "diff") {
    const { repository, git, store } = await context();
    const from = process.argv[3];
    const to = process.argv[4] ?? await git.getHead();
    if (!from) throw new Error("Usage: gctg diff <fromCommit> <toCommit>");
    const a = await indexAt(git, store, repository.root, from);
    const b = await indexAt(git, store, repository.root, to);
    json(diffSnapshots(a.snapshot, b.snapshot));
    process.exit(0);
  }
  if (command === "impact") {
    const { repository, git, store } = await context();
    const commit = process.argv[3] ?? await git.getHead();
    const ids = process.argv.slice(4);
    if (!ids.length) throw new Error("Usage: gctg impact <commit> <nodeId> [nodeId...]");
    const result = await indexAt(git, store, repository.root, commit);
    json(new ImpactQueryService(store).analyze(result.snapshot, { changedNodeIds: ids }));
    process.exit(0);
  }
  if (command === "tests") {
    const { repository, git, store } = await context();
    const commit = process.argv[3] ?? await git.getHead();
    const result = await indexAt(git, store, repository.root, commit);
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
  console.log("Usage: gctg [--version] | status | commits [limit] | index [commit] | graph [commit] [type] | diff <from> <to> | impact <commit> <nodeId...> | tests [commit] | run <executable> [args...] | serve [port]");
  process.exit(command === "help" ? 0 : 2);
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
}
