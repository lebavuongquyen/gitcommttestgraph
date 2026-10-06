import test from "node:test";
import assert from "node:assert/strict";
import { ConsistencyChecker } from "../../dist/index.js";

test("consistency checker reports healthy store", async () => {
  const report = await new ConsistencyChecker({ checkConsistency: async () => [] }).check();
  assert.equal(report.healthy, true);
  assert.deepEqual(report.issues, []);
});

test("consistency checker preserves deterministic issues", async () => {
  const issues = [
    { kind: "orphan_object", path: "b.json", detail: "orphan" },
    { kind: "missing_object", path: "a.json", detail: "missing" }
  ];
  const report = await new ConsistencyChecker({ checkConsistency: async () => issues }).check();
  assert.equal(report.healthy, false);
  assert.deepEqual(report.issues, issues);
});
