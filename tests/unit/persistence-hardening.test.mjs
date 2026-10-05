import assert from "node:assert/strict";
import test from "node:test";
import { JsonGraphStore } from "../../dist/index.js";
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
    const path = join(root, Buffer.from("repo").toString("base64url"), "test", "fp", "bad.json");
    await writeFile(path, JSON.stringify({ ...snapshot, edges: [{ id: "e", source: "missing", target: "n", type: "CONTAINS", sourceCommit: "abc", evidence: [] }] }));
    await assert.rejects(() => store.getSnapshot("repo", "bad", "test", "fp"), /Invalid graph snapshot/);
  } finally {
    const { rm } = await import("node:fs/promises");
    await rm(root, { recursive: true, force: true });
  }
});
