import test from "node:test";
import assert from "node:assert/strict";
import { SnapshotCleanupService } from "../../dist/index.js";

function record(commit, sizeBytes) {
  return {
    repository: "repo",
    commit,
    analyzerVersion: "1",
    configurationFingerprint: "f",
    path: "snapshot-" + commit,
    sizeBytes
  };
}

test("cleanup preview is deterministic and exact", async () => {
  const records = [record("b", 20), record("a", 10)];
  const store = {
    listSnapshots: async () => records,
    deleteSnapshot: async () => {}
  };
  const service = new SnapshotCleanupService(store);
  const one = await service.preview(["a", "b"], "2026-10-07T00:00:00Z");
  const two = await service.preview(["b", "a"], "2026-10-07T00:00:00Z");
  assert.equal(one.previewId, two.previewId);
  assert.deepEqual(one.items.map(item => item.commit), ["a", "b"]);
});

test("cleanup apply rejects stale proof", async () => {
  const records = [record("a", 10)];
  const store = {
    listSnapshots: async () => records,
    deleteSnapshot: async () => {}
  };
  const service = new SnapshotCleanupService(store);
  const preview = await service.preview(["a"], "2026-10-07T00:00:00Z");
  const stale = { ...preview, items: [{ ...preview.items[0], sizeBytes: 99 }] };
  await assert.rejects(() => service.apply(stale), /proof is invalid/i);
});

test("cleanup apply is idempotent when an item is already missing", async () => {
  let records = [record("a", 10)];
  const store = {
    listSnapshots: async () => records,
    deleteSnapshot: async item => { records = records.filter(record => record.path !== item.path); }
  };
  const service = new SnapshotCleanupService(store);
  const preview = await service.preview(["a"], "2026-10-07T00:00:00Z");
  const first = await service.apply(preview);
  const second = await service.apply(preview);
  assert.deepEqual(first.deleted, ["snapshot-a"]);
  assert.deepEqual(second.alreadyMissing, ["snapshot-a"]);
});
