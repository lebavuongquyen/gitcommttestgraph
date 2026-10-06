import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, mkdir, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { JsonGraphStore } from "../../dist/index.js";

test("graph store consistency check finds missing, corrupt and orphan objects", async () => {
  const root = await mkdtemp(join(tmpdir(), "gctg-consistency-"));
  try {
    const missing = join(root, "missing.json");
    const corrupt = join(root, "corrupt.json");
    const orphan = join(root, "orphan.json");
    await writeFile(corrupt, "{broken", "utf8");
    await writeFile(orphan, "{}", "utf8");
    await writeFile(join(root, "manifest.json"), JSON.stringify([
      { repository: "repo", commit: "a", analyzerVersion: "v", configurationFingerprint: "f", path: missing },
      { repository: "repo", commit: "b", analyzerVersion: "v", configurationFingerprint: "f", path: corrupt }
    ]), "utf8");
    const issues = await new JsonGraphStore(root).checkConsistency();
    assert.deepEqual(issues.map(issue => issue.kind), ["corrupt_object", "missing_object", "orphan_object"]);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
