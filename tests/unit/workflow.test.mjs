import assert from "node:assert/strict";
import test from "node:test";
import { buildWorkflowGraph } from "../../dist/index.js";

test("workflow graph is deterministic and executable-oriented", () => {
  const result = buildWorkflowGraph({
    repository: "repo",
    commit: "c1",
    changedSymbolIds: ["s1"],
    affectedSymbolIds: ["s1", "s2"],
    nodes: [
      { id: "s1", type: "Symbol", attributes: { name: "changed" } },
      { id: "s2", type: "Symbol", attributes: { name: "affected" } },
      { id: "p", type: "TestProject", attributes: { name: "unit", packageId: "pkg" } },
      { id: "f", type: "TestFile", attributes: { path: "a.test.ts", testProjectId: "p" } },
      { id: "t", type: "TestCase", attributes: { title: "works", testFileId: "f" } }
    ],
    impacts: [{
      testProjectId: "p",
      testFileId: "f",
      testCaseId: "t",
      testCommand: { executable: "npm", args: ["test"], cwd: "." },
      relation: "DIRECT",
      changedSymbolIds: ["s1"],
      affectedSymbolIds: ["s2"]
    }]
  });
  assert.equal(result.workflow, "git-code-test-impact");
  assert.deepEqual(result.nodes.filter(n => n.kind === "command").map(n => n.label), ["npm test"]);
  assert.ok(result.edges.some(e => e.relation === "CHANGED"));
  assert.ok(result.edges.some(e => e.relation === "AFFECTS"));
  assert.ok(result.edges.some(e => e.relation === "TESTS"));
  assert.ok(result.edges.some(e => e.relation === "RUNS"));
});
