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
    await store.save("abc", { passed: false, attempt: 2 });
    assert.deepEqual(await store.get("abc"), { passed: false, attempt: 2 });
    const entries = await (await import("node:fs/promises")).readdir(root);
    assert.equal(entries.some(name => name.endsWith(".tmp")), false);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
