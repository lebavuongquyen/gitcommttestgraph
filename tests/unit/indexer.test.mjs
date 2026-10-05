import assert from "node:assert/strict";
import test from "node:test";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { RepositoryIndexer, TypeScriptSemanticAnalyzer, JsonGraphStore } from "../../dist/index.js";

test("indexer persists and reuses exact commit snapshots", async () => {
  const root = await mkdtemp(join(tmpdir(), "gctg-store-"));
  try {
    const git = {
      async getCommit(hash) { return { hash, parents: [], author: "a", committer: "c", timestamp: "2026-01-01T00:00:00Z", message: "test" }; },
      async listFilesAtCommit() { return ["src/a.ts"]; },
      async readFileAtCommit() { return "export function a() { return 1; }"; }
    };
    const store = new JsonGraphStore(root);
    const indexer = new RepositoryIndexer(git, new TypeScriptSemanticAnalyzer(), store);
    const first = await indexer.index({ repository: "repo", commit: "abc", configuration: {}, analyzerVersion: "0.2.0" });
    const second = await indexer.index({ repository: "repo", commit: "abc", configuration: {}, analyzerVersion: "0.2.0" });
    assert.equal(first.reused, false);
    assert.equal(second.reused, true);
    assert.equal(second.snapshot.commit, "abc");
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
