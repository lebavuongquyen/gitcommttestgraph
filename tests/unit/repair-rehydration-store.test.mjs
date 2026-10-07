import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { JsonGraphStore, createSnapshot } from "../../dist/index.js";

test("RCV03 rebuilds the derived manifest from valid physical snapshots", async () => {
  const directory = await mkdtemp(join(tmpdir(), "gctg-rcv03-"));
  const store = new JsonGraphStore(directory);
  const snapshot = createSnapshot({
    analyzerVersion: "test",
    repository: "/repo",
    commit: "abc123",
    configuration: { test: true },
    nodes: [],
    edges: []
  });
  await store.saveSnapshot(snapshot);
  await writeFile(join(directory, "manifest.json"), "[]", "utf8");
  await store.rebuildManifestFromPhysicalSnapshots();
  const manifest = JSON.parse(await readFile(join(directory, "manifest.json"), "utf8"));
  assert.equal(manifest.length, 1);
  assert.equal(manifest[0].commit, "abc123");
});
