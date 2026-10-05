import test from "node:test";
import assert from "node:assert/strict";
import { buildExecutionPlan, serializeExecutionPlan } from "../../dist/index.js";

const nodes = [
  { id: "pkg-a", type: "Package", attributes: { name: "a", rootPath: "packages/a" } },
  { id: "pkg-b", type: "Package", attributes: { name: "b", rootPath: "packages/b" } },
  { id: "proj-a", type: "TestProject", attributes: { name: "a-tests", packageId: "pkg-a" } },
  { id: "proj-b", type: "TestProject", attributes: { name: "b-tests", packageId: "pkg-b" } }
];

const impacts = [
  {
    testProjectId: "proj-b",
    testFileId: "file-b",
    testCaseId: "case-b",
    relation: "DIRECT",
    changedSymbolIds: ["symbol-b"],
    affectedSymbolIds: ["symbol-b"],
    testCommand: { executable: "npm", args: ["test", "--", "b"], cwd: "packages/b" },
    evidence: []
  },
  {
    testProjectId: "proj-a",
    testFileId: "file-a",
    testCaseId: "case-a",
    relation: "INDIRECT",
    changedSymbolIds: ["symbol-a"],
    affectedSymbolIds: ["symbol-a"],
    evidence: []
  }
];

test("execution plan groups impacted tests and preserves dependency order", () => {
  const edges = [{
    id: "dep",
    source: "pkg-b",
    target: "pkg-a",
    type: "DEPENDS_ON",
    confidence: "EXACT",
    evidence: [],
    sourceCommit: "c1"
  }];
  const plan = buildExecutionPlan({ repository: "repo", commit: "c1", nodes, edges, impacts });
  assert.deepEqual(plan.steps.map(step => step.nodeId), ["proj-a", "proj-b"]);
  assert.equal(plan.steps[0].status, "IMPACTED_NO_COMMAND");
  assert.equal(plan.steps[1].status, "RUNNABLE");
  assert.deepEqual(plan.steps[1].dependsOn, ["execution:test:proj-a"]);
});

test("execution plan serializers are deterministic", () => {
  const plan = buildExecutionPlan({ repository: "repo", commit: "c1", nodes: [{ id: "p", type: "TestProject", attributes: { name: "unit" } }], edges: [], impacts: [{
    testProjectId: "p",
    testFileId: "f",
    testCaseId: "t",
    relation: "DIRECT",
    changedSymbolIds: ["s"],
    affectedSymbolIds: ["s"],
    testCommand: { executable: "npm", args: ["test"], cwd: "." },
    evidence: []
  }] });
  const formats = ["json", "yaml", "md", "mermaid"];
  for (const format of formats) {
    const first = serializeExecutionPlan(plan, format);
    const second = serializeExecutionPlan(plan, format);
    assert.equal(first, second);
    assert.ok(first.length > 0);
  }
  assert.match(serializeExecutionPlan(plan, "yaml"), /status: RUNNABLE/);
  assert.match(serializeExecutionPlan(plan, "md"), /Execution Plan/);
  assert.match(serializeExecutionPlan(plan, "mermaid"), /flowchart TD/);
});
