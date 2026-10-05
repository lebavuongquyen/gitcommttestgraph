import test from "node:test";
import assert from "node:assert/strict";
import { JsonTestResultStore } from "../../dist/infrastructure/persistence/json-test-result-store.js";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

test("JSON result store persists and restores values", async () => {
  const root = await mkdtemp(join(tmpdir(), "gctg-result-"));
  try {
    const store = new JsonTestResultStore(root);
    await store.save("abc", { passed: true });
    assert.deepEqual(await store.get("abc"), { passed: true });
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
