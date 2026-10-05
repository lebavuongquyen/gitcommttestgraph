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


test("indexer deduplicates classified data nodes", async () => {
  const root = await mkdtemp(join(tmpdir(), "gctg-dedupe-"));
  try {
    const git = {
      async getCommit(hash) { return { hash, parents: [], author: "a", committer: "c", timestamp: "2026-01-01T00:00:00Z", message: "test" }; },
      async listFilesAtCommit() { return ["package.json", "src/a.ts", "fixtures/fixture.json", "fixtures/fixture.schema.json"]; },
      async readFileAtCommit(commit, path) {
        if (path === "package.json") return JSON.stringify({ name: "repo" });
        if (path.endsWith("fixture.json")) return JSON.stringify({ value: 1 });
        if (path.endsWith("fixture.schema.json")) return JSON.stringify({ type: "object" });
        return "export function a() { return 1; }";
      }
    };
    const snapshot = (await new RepositoryIndexer(git, new TypeScriptSemanticAnalyzer(), new JsonGraphStore(root)).index({ repository: "repo", commit: "abc", configuration: {}, analyzerVersion: "dedupe-test" })).snapshot;
    assert.equal(new Set(snapshot.nodes.map(node => node.id)).size, snapshot.nodes.length);
    assert.equal(snapshot.nodes.filter(node => node.attributes.path === "fixtures/fixture.json").length, 1);
    assert.equal(snapshot.nodes.filter(node => node.attributes.path === "fixtures/fixture.schema.json").length, 1);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("indexer reuses semantic cache across commits with identical source", async () => {
  const root = await mkdtemp(join(tmpdir(), "gctg-cache-"));
  try {
    const git = {
      async getCommit(hash) { return { hash, parents: [], author: "a", committer: "c", timestamp: "2026-01-01T00:00:00Z", message: hash }; },
      async listFilesAtCommit() { return ["package.json", "src/a.ts"]; },
      async readFileAtCommit(commit, path) {
        if (path === "package.json") return JSON.stringify({ name: "repo" });
        return "export function a() { return 1; }";
      }
    };
    class CountingAnalyzer extends TypeScriptSemanticAnalyzer {
      calls = 0;
      analyzeProject(input, commit) {
        this.calls++;
        return super.analyzeProject(input, commit);
      }
    }
    const analyzer = new CountingAnalyzer();
    const cache = new (await import("../../dist/index.js")).JsonSemanticCache(join(root, "cache"));
    const store = new JsonGraphStore(join(root, "graph"));
    const indexer = new RepositoryIndexer(git, analyzer, store, cache);
    const first = await indexer.index({ repository: "repo", commit: "a", configuration: {}, analyzerVersion: "cache-test" });
    const second = await indexer.index({ repository: "repo", commit: "b", configuration: {}, analyzerVersion: "cache-test" });
    assert.equal(first.reused, false);
    assert.equal(second.reused, false);
    assert.equal(analyzer.calls, 1);
    assert.ok(second.snapshot.edges.every(edge => edge.sourceCommit === "b"));
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
