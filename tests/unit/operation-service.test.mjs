import test from "node:test";
import assert from "node:assert/strict";
import { OperationService } from "../../dist/index.js";

test("operation lifecycle reaches succeeded", () => {
  const service = new OperationService();
  const operation = service.begin("index", { commit: "abc" });
  assert.equal(operation.state, "queued");
  assert.equal(service.start(operation.id).state, "running");
  assert.equal(service.succeed(operation.id).state, "succeeded");
  assert.ok(service.get(operation.id)?.finishedAt);
});

test("operation lifecycle records failure", () => {
  const service = new OperationService();
  const operation = service.begin("index");
  service.start(operation.id);
  const failed = service.fail(operation.id, new Error("boom"));
  assert.equal(failed.state, "failed");
  assert.equal(failed.error, "boom");
});

test("operation list is deterministic", () => {
  const service = new OperationService();
  const first = service.begin("one");
  const second = service.begin("two", {}, first.id);
  assert.equal(second.parentId, first.id);
  assert.deepEqual(new Set(service.list().map(item => item.id)), new Set([first.id, second.id]));
});
