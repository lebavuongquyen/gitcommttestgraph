import assert from "node:assert/strict";
import test from "node:test";
import { IncrementalRepositoryIndexer, RepositoryIndexer, TypeScriptSemanticAnalyzer, JsonGraphStore } from "../../dist/index.js";
import { mkdtemp, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";

test("incremental indexer reuses graph for non-executable changes", async () => {
  const root = await mkdtemp(join(tmpdir(), "gctg-inc-"));
  try {
    const git = {
      async getCommit(hash) { return { hash, parents: hash === "new" ? ["old"] : [], author: "", committer: "", timestamp: "", message: "" }; },
      async getDiff() { return { fromCommit: "old", toCommit: "new", paths: [{ status: "modified", path: "README.md" }] }; },
      async listFilesAtCommit() { return ["src/a.ts"]; },
      async readFileAtCommit() { return "export function a() { return 1; }"; }
    };
    const store = new JsonGraphStore(root);
    const full = new RepositoryIndexer(git, new TypeScriptSemanticAnalyzer(), store);
    const first = await full.index({ repository: "repo", commit: "old", configuration: {}, analyzerVersion: "0.2.0" });
    const incremental = new IncrementalRepositoryIndexer(git, full, (repo, commit, version, fingerprint) => store.getSnapshot(repo, commit, version, fingerprint));
    const second = await incremental.index({ repository: "repo", commit: "new", configuration: {}, analyzerVersion: "0.2.0" });
    assert.equal(second.incremental, true);
    assert.equal(second.snapshot.nodes.length, first.snapshot.nodes.length);
    assert.equal(second.snapshot.edges.every(edge => edge.sourceCommit === "new"), true);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
