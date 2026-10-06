import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { OperationHistoryService, JsonOperationHistoryStore, OperationService } from "../../dist/index.js";

test("operation history persists bounded records and reloads them", async () => {
  const root = await mkdtemp(join(tmpdir(), "gctg-operations-"));
  try {
    const history = new OperationHistoryService(root, new JsonOperationHistoryStore(2), 2);
    const operations = new OperationService();
    const first = operations.begin("one");
    operations.succeed(first.id);
    const second = operations.begin("two");
    operations.fail(second.id, new Error("boom"));
    const third = operations.begin("three");
    operations.succeed(third.id);
    await history.record(operations.list());
    const restored = await history.load();
    assert.deepEqual(new Set(restored.map(item => item.name)), new Set(["two", "three"]));
    assert.equal(restored.length, 2);
    const raw = JSON.parse(await readFile(join(root, ".gctg", "operations.json"), "utf8"));
    assert.equal(raw.length, 2);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("operation history filters without exposing sensitive metadata", async () => {
  const root = await mkdtemp(join(tmpdir(), "gctg-operations-"));
  try {
    const history = new OperationHistoryService(root, new JsonOperationHistoryStore(), 100);
    const operations = new OperationService();
    const operation = operations.begin("secret-test", {
      token: "do-not-persist",
      nested: { password: "do-not-persist", safe: "ok" }
    });
    operations.fail(operation.id, new Error("Authorization: Bearer abc123"));
    await history.record(operations.list());
    const failed = await history.query({ state: "failed" });
    assert.equal(failed.length, 1);
    assert.equal(failed[0].metadata.token, undefined);
    assert.equal((failed[0].metadata.nested).password, undefined);
    assert.equal((failed[0].metadata.nested).safe, "ok");
    assert.match(failed[0].error ?? "", /\[REDACTED\]/);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
