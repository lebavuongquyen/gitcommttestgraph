import assert from "node:assert/strict";
import test from "node:test";
import { IncrementalRepositoryIndexer, RepositoryIndexer, TypeScriptSemanticAnalyzer, JsonGraphStore } from "../../dist/index.js";
import { mkdtemp, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";

test("incremental semantic indexing matches a clean full index", async () => {
  const root = await mkdtemp(join(tmpdir(), "gctg-inc-equivalence-"));
  const fullRoot = await mkdtemp(join(tmpdir(), "gctg-full-equivalence-"));
  try {
    const files = ["package.json", "src/util.ts", "src/main.ts", "src/unrelated.ts"];
    const contents = {
      old: {
        "package.json": JSON.stringify({ name: "fixture" }),
        "src/util.ts": "export function add(a, b) { return a + b; }",
        "src/main.ts": "import { add } from './util.js'; export function run() { return add(1, 2); }",
        "src/unrelated.ts": "export const stable = 1;"
      },
      new: {
        "package.json": JSON.stringify({ name: "fixture" }),
        "src/util.ts": "export function add(a, b) { return a + b + 1; }",
        "src/main.ts": "import { add } from './util.js'; export function run() { return add(1, 2); }",
        "src/unrelated.ts": "export const stable = 1;"
      }
    };
    const git = {
      async getHead() { return "new"; },
      async getCommit(hash) { return { hash, parents: hash === "new" ? ["old"] : [], author: "", committer: "", timestamp: "", message: hash }; },
      async getChangedPaths() { return [{ status: "modified", path: "src/util.ts" }]; },
      async getDiff() { return { fromCommit: "old", toCommit: "new", paths: [{ status: "modified", path: "src/util.ts" }] }; },
      async listFilesAtCommit() { return files; },
      async readFileAtCommit(commit, path) { return contents[commit][path]; }
    };

    const config = {};
    const analyzerVersion = "incremental-equivalence";
    const parentStore = new JsonGraphStore(root);
    const parentIndexer = new RepositoryIndexer(git, new TypeScriptSemanticAnalyzer(), parentStore);
    const parent = await parentIndexer.index({ repository: "repo", commit: "old", configuration: config, analyzerVersion });

    const cleanStore = new JsonGraphStore(fullRoot);
    const cleanIndexer = new RepositoryIndexer(git, new TypeScriptSemanticAnalyzer(), cleanStore);
    const clean = await cleanIndexer.index({ repository: "repo", commit: "new", configuration: config, analyzerVersion });

    const incremental = new IncrementalRepositoryIndexer(
      git,
      parentIndexer,
      (repo, commit, version, fingerprint) => parentStore.getSnapshot(repo, commit, version, fingerprint)
    );
    const inc = await incremental.index({ repository: "repo", commit: "new", configuration: config, analyzerVersion });

    assert.equal(inc.incremental, true);
    assert.deepEqual(
      { nodes: inc.snapshot.nodes, edges: inc.snapshot.edges },
      { nodes: clean.snapshot.nodes, edges: clean.snapshot.edges }
    );
    assert.deepEqual(inc.snapshot.metadata.semanticAnalyzedPaths, ["src/main.ts", "src/util.ts"]);
    assert.deepEqual(inc.snapshot.metadata.semanticReusedPaths, ["src/unrelated.ts"]);
    assert.equal(parent.snapshot.metadata.incremental, undefined);
  } finally {
    await rm(root, { recursive: true, force: true });
    await rm(fullRoot, { recursive: true, force: true });
  }
});

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
