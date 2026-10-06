import test from "node:test";
import assert from "node:assert/strict";
import { classifyFailure, OperationService } from "../../dist/index.js";

test("failure taxonomy classifies typed errors deterministically", () => {
  assert.equal(classifyFailure(new Error("x")).category, "analysis");
  assert.equal(classifyFailure({ code: "GIT_OPERATION_FAILED", message: "x" }).category, "git");
  assert.equal(classifyFailure({ code: "INDEX_CORRUPT", message: "x" }).category, "corruption");
  assert.equal(classifyFailure({ code: "TEST_EXECUTION_FAILED", message: "x" }).category, "execution");
});

test("failed operations persist a failure category", () => {
  const service = new OperationService();
  const operation = service.begin("index");
  const failed = service.fail(operation.id, { code: "INDEX_CORRUPT", message: "broken snapshot" });
  assert.equal(failed.failureCategory, "corruption");
  assert.equal(failed.error, "broken snapshot");
});
