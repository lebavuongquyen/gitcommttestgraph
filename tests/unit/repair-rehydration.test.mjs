import test from "node:test";
import assert from "node:assert/strict";
import { RepairRehydrationService } from "../../dist/application/recovery/repair-rehydration-service.js";

function runtimeWith({ issues, records = [], head = "HEAD", afterIssues = [] }) {
  let currentIssues = issues;
  return {
    repository: { root: "/repo" },
    store: {
      async checkConsistency() { return currentIssues; },
      async listSnapshots() { return records; },
      async rebuildManifestFromPhysicalSnapshots() { currentIssues = afterIssues; }
    },
    async head() { return head; },
    async index() { currentIssues = afterIssues; }
  };
}

test("RCV03 plans safe manifest rebuild for orphan-only evidence", async () => {
  const runtime = runtimeWith({
    issues: [{ kind: "orphan_object", path: "/repo/.gctg/graph/x.json", detail: "unreferenced" }],
    records: [{ repository: "/repo", commit: "HEAD", analyzerVersion: "0.9.8", configurationFingerprint: "x", path: "x", sizeBytes: 1 }]
  });
  const plan = await new RepairRehydrationService(runtime).plan("/repo");
  assert.equal(plan.safe, true);
  assert.deepEqual(plan.actions.map(x => x.kind), ["rebuild_manifest"]);
});

test("RCV03 blocks corrupt evidence", async () => {
  const runtime = runtimeWith({
    issues: [{ kind: "corrupt_object", path: "/repo/.gctg/graph/x.json", detail: "invalid" }]
  });
  const plan = await new RepairRehydrationService(runtime).plan("/repo");
  assert.equal(plan.safe, false);
  assert.match(plan.blockedReasons[0], /must be resolved/);
});

test("RCV03 rehydrates missing HEAD snapshot through Git-backed indexing", async () => {
  const runtime = runtimeWith({ issues: [], records: [], head: "abc123", afterIssues: [] });
  const applied = await new RepairRehydrationService(runtime).apply("/repo");
  assert.equal(applied.healthyBefore, true);
});
