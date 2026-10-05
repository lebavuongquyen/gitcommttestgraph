import assert from "node:assert/strict";
import test from "node:test";
import { JsonGraphStore, IndexLock } from "../../dist/index.js";
import { mkdtemp, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";

test("graph store writes atomically and rejects malformed snapshots", async () => {
  const root = await mkdtemp(join(tmpdir(), "gctg-store-"));
  const store = new JsonGraphStore(root);
  const snapshot = {
    schemaVersion: 1,
    analyzerVersion: "test",
    repository: "repo",
    commit: "abc",
    configurationFingerprint: "fp",
    nodes: [{ id: "n", type: "Repository", attributes: {} }],
    edges: [],
    metadata: {}
  };
  try {
    await store.saveSnapshot(snapshot);
    assert.deepEqual(await store.getSnapshot("repo", "abc", "test", "fp"), snapshot);
    const listed = await store.query({ nodeType: "Repository" });
    assert.deepEqual(listed.nodes.map(node => node.id), ["n"]);
    const path = join(root, Buffer.from("repo").toString("base64url"), "test", "fp", "bad.json");
    await writeFile(path, JSON.stringify({ ...snapshot, edges: [{ id: "e", source: "missing", target: "n", type: "CONTAINS", sourceCommit: "abc", evidence: [] }] }));
    await assert.rejects(() => store.getSnapshot("repo", "bad", "test", "fp"), /Invalid graph snapshot/);
  } finally {
    const { rm } = await import("node:fs/promises");
    await rm(root, { recursive: true, force: true });
  }
});


test("index lock serializes concurrent writers and recovers stale locks", async () => {
  const root = await mkdtemp(join(tmpdir(), "gctg-lock-"));
  const lockPath = join(root, "index.lock");
  try {
    const first = new IndexLock(lockPath, { timeoutMs: 200, retryDelayMs: 20, staleAfterMs: 10_000 });
    const release = await first.acquire();
    const secondPromise = new IndexLock(lockPath, { timeoutMs: 60, retryDelayMs: 10, staleAfterMs: 10_000 }).acquire();
    await assert.rejects(() => secondPromise, /Timed out waiting for index lock/);
    await release();
    const secondRelease = await new IndexLock(lockPath, { timeoutMs: 200 }).acquire();
    await secondRelease();

    await writeFile(lockPath, JSON.stringify({ pid: 1, createdAt: new Date(Date.now() - 60_000).toISOString() }));
    const staleRelease = await new IndexLock(lockPath, { staleAfterMs: 10, timeoutMs: 200 }).acquire();
    await staleRelease();
  } finally {
    const { rm } = await import("node:fs/promises");
    await rm(root, { recursive: true, force: true });
  }
});


test("semantic cache reuses identical source artifacts", async () => {
  const root = await mkdtemp(join(tmpdir(), "gctg-semantic-cache-"));
  try {
    const { JsonSemanticCache, semanticCacheKey } = await import("../../dist/index.js");
    const cache = new JsonSemanticCache(root);
    const input = {
      analyzerVersion: "test",
      files: [{ path: "src/a.ts", content: "export const a = 1;", packageId: "pkg" }],
      pathAliases: {},
      packageRoots: { pkg: "." },
      packageEntrypoints: { pkg: "src/a.ts" }
    };
    const key = semanticCacheKey(input);
    const analysis = {
      nodes: [{ id: "file:a", type: "File", attributes: { path: "src/a.ts" } }],
      edges: [],
      analyzedPaths: ["src/a.ts"]
    };
    assert.equal(await cache.get(key), null);
    await cache.save(key, analysis);
    assert.deepEqual(await cache.get(key), analysis);
    assert.notEqual(key, semanticCacheKey({ ...input, files: [{ ...input.files[0], content: "export const a = 2;" }] }));
  } finally {
    const { rm } = await import("node:fs/promises");
    await rm(root, { recursive: true, force: true });
  }
});
