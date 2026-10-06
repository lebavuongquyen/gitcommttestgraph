import test from "node:test";
import assert from "node:assert/strict";
import { BranchLifecycleService } from "../../dist/index.js";

test("branch lifecycle reports current, deleted and recreated evidence", async () => {
  const service = new BranchLifecycleService({
    listBranches: async () => [
      { name: "main", commit: "abc", current: true }
    ],
    listBranchLifecycleEvidence: async () => [
      { name: "feature/a", kind: "deleted", commit: "def", timestamp: "2026-10-07T00:00:00Z", source: "reflog" },
      { name: "feature/b", kind: "recreated", commit: "ghi", timestamp: "2026-10-07T01:00:00Z", source: "reflog" },
      { name: "main", kind: "updated", commit: "abc", timestamp: "2026-10-07T02:00:00Z", source: "reflog" }
    ]
  });

  const report = await service.analyze();
  assert.equal(report.current.length, 1);
  assert.equal(report.deleted.length, 1);
  assert.equal(report.deleted[0].name, "feature/a");
  assert.equal(report.recreated.length, 1);
  assert.equal(report.recreated[0].name, "feature/b");
});

test("branch lifecycle remains usable when reflog evidence is unavailable", async () => {
  const service = new BranchLifecycleService({
    listBranches: async () => [{ name: "main", commit: "abc", current: true }]
  });

  const report = await service.analyze();
  assert.equal(report.current.length, 1);
  assert.deepEqual(report.deleted, []);
  assert.deepEqual(report.recreated, []);
});
