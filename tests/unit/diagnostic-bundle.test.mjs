import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { buildDiagnosticBundle } from "../../dist/index.js";

test("diagnostic bundle is machine-readable and secret-safe", async () => {
  const root = await mkdtemp(join(tmpdir(), "gctg-bundle-"));
  try {
    const runtime = {
      head: async () => "abc123",
      resolveConfiguration: async () => ({
        configuration: {
          schemaVersion: 1,
          indexing: { maxHistoryDepth: null },
          historyRetention: { enabled: true, deletedBranchGracePeriodDays: 90, protectTags: true, protectReleases: true, protectPullRequestEvidence: true, protectAuditEvidence: true },
          performance: { maxWorkers: 4 },
          storage: { maxSizeMb: null, maxSnapshots: null },
          cleanup: { enabled: true, autoApply: false, requirePreview: true, mode: "conservative" }
        },
        sources: [{ kind: "DEFAULT", location: "built-in", values: {} }],
        migration: { fromVersion: 1, toVersion: 1, status: "CURRENT", backupCreated: false }
      }),
      operationsHistory: async () => [],
      operations: { list: () => [] },
      git: { getHead: async () => "abc123" },
      store: { listSnapshots: async () => [] },
      repository: { root },
      configuration: {
        schemaVersion: 1,
        indexing: { maxHistoryDepth: null },
        historyRetention: { enabled: true, deletedBranchGracePeriodDays: 90, protectTags: true, protectReleases: true, protectPullRequestEvidence: true, protectAuditEvidence: true },
        performance: { maxWorkers: 4 },
        storage: { maxSizeMb: null, maxSnapshots: null },
        cleanup: { enabled: true, autoApply: false, requirePreview: true, mode: "conservative" }
      },
      analyzerVersion: "test"
    };
    const bundle = await buildDiagnosticBundle(runtime);
    assert.equal(bundle.schemaVersion, 1);
    assert.equal(bundle.reproducibility.gitHead, "abc123");
    assert.equal(bundle.health.status, "HEALTHY");
    assert.ok(Array.isArray(bundle.operations));
    assert.equal(bundle.storage.available, true);
    assert.equal(bundle.storage.accounting.snapshotCount, 0);
    assert.ok(Array.isArray(bundle.configuration.values));
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
