import assert from "node:assert/strict";
import test from "node:test";
import { createSnapshot, EdgeType, NodeType, Confidence, TestGapAnalyzer } from "../../dist/index.js";

const n = (id, type, attributes = {}) => ({ id, type, attributes });

test("test gap analyzer reports direct indirect and untested symbols", () => {
  const snapshot = createSnapshot({
    analyzerVersion: "test", repository: "repo", commit: "c1", configuration: {},
    nodes: [
      n("testFile", NodeType.TEST_FILE, { fileId: "testSource", path: "src/a.test.ts" }),
      n("testSource", NodeType.FILE, { path: "src/a.test.ts" }),
      n("prod", NodeType.FILE, { path: "src/a.ts" }),
      n("direct", NodeType.SYMBOL, { fileId: "prod", name: "direct", kind: "function", exported: true }),
      n("indirect", NodeType.SYMBOL, { fileId: "prod", name: "indirect", kind: "function", exported: true }),
      n("missing", NodeType.SYMBOL, { fileId: "prod", name: "missing", kind: "function", exported: true }),
      n("helper", NodeType.SYMBOL, { fileId: "prod", name: "helper", kind: "function", exported: false })
    ],
    edges: [
      { id: "e1", source: "testSource", target: "direct", type: EdgeType.CALLS, confidence: Confidence.EXACT, evidence: [], sourceCommit: "c1" },
      { id: "e2", source: "testSource", target: "helper", type: EdgeType.CALLS, confidence: Confidence.EXACT, evidence: [], sourceCommit: "c1" },
      { id: "e3", source: "helper", target: "indirect", type: EdgeType.CALLS, confidence: Confidence.EXACT, evidence: [], sourceCommit: "c1" }
    ]
  });
  const result = new TestGapAnalyzer().analyze(snapshot, { changedNodeIds: ["missing"] });
  assert.equal(result.tested, 2);
  assert.equal(result.indirectlyTested, 1);
  assert.equal(result.gaps.find(g => g.symbolId === "missing")?.severity, "HIGH");
  assert.equal(result.gaps.find(g => g.symbolId === "missing")?.coverage, "UNTESTED");
});
