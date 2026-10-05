import assert from "node:assert/strict";
import test from "node:test";
import { createSnapshot, EdgeType, NodeType, Confidence, TestImpactAnalyzer } from "../../dist/index.js";

const n = (id, type, attributes = {}) => ({ id, type, attributes });

test("test impact maps changed and downstream symbols to runnable test cases", () => {
  const snapshot = createSnapshot({
    analyzerVersion: "test", repository: "repo", commit: "c1", configuration: {},
    nodes: [
      n("project", NodeType.TEST_PROJECT, {
        framework: "node:test",
        packageId: "pkg",
        testCommand: { executable: "pnpm", args: ["test"], cwd: "packages/a" }
      }),
      n("file", NodeType.TEST_FILE, { fileId: "source", path: "packages/a/a.test.ts", testProjectId: "project", packageId: "pkg" }),
      n("source", NodeType.FILE, { path: "packages/a/a.test.ts", packageId: "pkg" }),
      n("changed", NodeType.SYMBOL, { fileId: "prod", name: "changed", kind: "function" }),
      n("affected", NodeType.SYMBOL, { fileId: "prod", name: "affected", kind: "function" }),
      n("prod", NodeType.FILE, { path: "packages/a/a.ts", packageId: "pkg" }),
      n("case-direct", NodeType.TEST_CASE, { testFileId: "file", title: "direct", startLine: 1, endLine: 10 }),
      n("case-indirect", NodeType.TEST_CASE, { testFileId: "file", title: "indirect", startLine: 12, endLine: 20 })
    ],
    edges: [
      { id: "e1", source: "affected", target: "changed", type: EdgeType.CALLS, confidence: Confidence.EXACT, evidence: [], sourceCommit: "c1" }
    ]
  });
  const result = new TestImpactAnalyzer().analyze(snapshot, {
    changedSymbolIds: ["changed"],
    coverageLinks: [
      { testCaseId: "case-direct", symbolId: "changed", coverage: "DIRECT", evidence: [] },
      { testCaseId: "case-indirect", symbolId: "affected", coverage: "INDIRECT", evidence: [] }
    ]
  });
  assert.equal(result.changedSymbols, 1);
  assert.equal(result.affectedSymbols, 2);
  assert.equal(result.impactedTestCases, 2);
  assert.equal(result.impactedTestFiles, 1);
  assert.equal(result.impactedTestProjects, 1);
  assert.deepEqual(result.runnableCommands, [{
    testProjectId: "project", executable: "pnpm", args: ["test"], cwd: "packages/a"
  }]);
  assert.equal(result.impacts.find(item => item.testCaseId === "case-direct")?.relation, "DIRECT");
  assert.equal(result.impacts.find(item => item.testCaseId === "case-indirect")?.relation, "INDIRECT");
});
