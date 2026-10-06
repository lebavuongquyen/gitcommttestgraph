import test from "node:test";
import assert from "node:assert/strict";
import { DEFAULT_CONFIGURATION, SnapshotAccountingService } from "../../dist/index.js";

function record(path, sizeBytes) {
  return { repository: "repo", commit: path, analyzerVersion: "1", configurationFingerprint: "f", path, sizeBytes };
}

test("snapshot accounting reports count, size and limits", async () => {
  const service = new SnapshotAccountingService({
    listSnapshots: async () => [record("a", 10), record("b", 20)],
    deleteSnapshot: async () => {}
  });
  const config = { ...DEFAULT_CONFIGURATION, storage: { maxSnapshots: 1, maxSizeMb: null } };
  const accounting = await service.account(config);
  assert.equal(accounting.snapshotCount, 2);
  assert.equal(accounting.totalSizeBytes, 30);
  assert.equal(accounting.countExceeded, true);
  assert.equal(accounting.sizeExceeded, false);
});

test("snapshot compaction preserves protected paths and is deterministic", async () => {
  const records = [record("b", 20), record("a", 10), record("c", 30)];
  const service = new SnapshotAccountingService({
    listSnapshots: async () => records,
    deleteSnapshot: async () => {}
  });
  const config = { ...DEFAULT_CONFIGURATION, storage: { maxSnapshots: 1, maxSizeMb: null } };
  const plan = await service.planCompaction(config, ["a"]);
  assert.deepEqual(plan.protectedPaths, ["a"]);
  assert.deepEqual(plan.candidates.map(item => item.path), ["b", "c"]);
});
