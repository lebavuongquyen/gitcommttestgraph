import test from "node:test";
import assert from "node:assert/strict";
import { RepairRehydrationService } from "../../dist/application/recovery/repair-rehydration-service.js";

test("RCV03 treats a missing manifest with valid physical snapshots as repairable", async () => {
  const runtime = {
    repository: { root: "/repo" },
    store: {
      async checkConsistency() {
        return [
          { kind: "manifest", path: "/repo/.gctg/graph/manifest.json", detail: "Manifest is missing." },
          { kind: "orphan_object", path: "/repo/.gctg/graph/snapshot.json", detail: "Physical snapshot object is not referenced by the manifest." }
        ];
      },
      async listSnapshots() {
        return [{ repository: "/repo", commit: "HEAD", analyzerVersion: "test", configurationFingerprint: "x", path: "snapshot.json", sizeBytes: 1 }];
      }
    },
    async head() { return "HEAD"; }
  };
  const plan = await new RepairRehydrationService(runtime).plan("/repo");
  assert.equal(plan.safe, true);
  assert.deepEqual(plan.actions.map(item => item.kind), ["rebuild_manifest"]);
});
