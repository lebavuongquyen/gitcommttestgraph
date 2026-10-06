import test from "node:test";
import assert from "node:assert/strict";
import { HealthService, OperationService } from "../../dist/index.js";

test("health is healthy when git and storage are available", async () => {
  const operations = new OperationService();
  const report = await new HealthService().check({
    git: { getHead: async () => "abc" },
    store: { listSnapshots: async () => [] },
    operations
  });
  assert.equal(report.status, "HEALTHY");
  assert.equal(report.checks.length, 3);
});

test("health degrades when an operation failed", async () => {
  const operations = new OperationService();
  const operation = operations.begin("index");
  operations.fail(operation.id, "boom");
  const report = await new HealthService().check({
    git: { getHead: async () => "abc" },
    store: { listSnapshots: async () => [] },
    operations
  });
  assert.equal(report.status, "DEGRADED");
});
