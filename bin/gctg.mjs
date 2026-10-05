#!/usr/bin/env node
import { discoverRepository, CliGitRepository, TypeScriptSemanticAnalyzer, JsonGraphStore, RepositoryIndexer } from "../dist/index.js";

const command = process.argv[2] ?? "help";
const root = process.cwd();

try {
  if (command === "status") {
    const repository = await discoverRepository(root);
    console.log(JSON.stringify({ root: repository.root, head: await repository.git.getHead(), workspaceFiles: repository.workspaceFiles }, null, 2));
    process.exit(0);
  }

  if (command === "index") {
    const repository = await discoverRepository(root);
    const git = new CliGitRepository(repository.root);
    const commit = process.argv[3] ?? await git.getHead();
    const store = new JsonGraphStore(repository.root + "/.gctg/graph");
    const result = await new RepositoryIndexer(git, new TypeScriptSemanticAnalyzer(), store).index({
      repository: repository.root,
      commit,
      configuration: {},
      analyzerVersion: "0.2.0"
    });
    console.log(JSON.stringify({ commit, reused: result.reused, nodes: result.snapshot.nodes.length, edges: result.snapshot.edges.length }, null, 2));
    process.exit(0);
  }

  console.log("Usage: gctg status | gctg index [commit]");
  process.exit(command === "help" ? 0 : 2);
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
}
