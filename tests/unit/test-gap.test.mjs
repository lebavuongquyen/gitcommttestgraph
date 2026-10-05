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

test("test gap analyzer excludes non-testable declarations and honors package filters", () => {
  const snapshot = createSnapshot({
    analyzerVersion: "test", repository: "repo", commit: "c2", configuration: {},
    nodes: [
      n("testFile", NodeType.TEST_FILE, { fileId: "testSource", path: "packages/a/a.test.ts", packageId: "pkg-a" }),
      n("testSource", NodeType.FILE, { path: "packages/a/a.test.ts", packageId: "pkg-a" }),
      n("prod", NodeType.FILE, { path: "packages/a/a.ts", packageId: "pkg-a" }),
      n("other", NodeType.FILE, { path: "packages/b/b.ts", packageId: "pkg-b" }),
      n("fn", NodeType.SYMBOL, { fileId: "prod", name: "fn", kind: "function", exported: true }),
      n("typeOnly", NodeType.SYMBOL, { fileId: "prod", name: "Data", kind: "interface", exported: true }),
      n("otherFn", NodeType.SYMBOL, { fileId: "other", name: "otherFn", kind: "function", exported: true })
    ],
    edges: []
  });
  const result = new TestGapAnalyzer().analyze(snapshot, { packageId: "pkg-a" });
  assert.equal(result.symbols, 1);
  assert.equal(result.untested, 1);
  assert.equal(result.gaps[0]?.symbolId, "fn");
  assert.equal(result.gaps.some(g => g.symbolId === "typeOnly"), false);
  assert.equal(result.gaps.some(g => g.symbolId === "otherFn"), false);
});

test("test gap analyzer reports unknown coverage for generic script projects", () => {
  const snapshot = createSnapshot({
    analyzerVersion: "test", repository: "repo", commit: "c3", configuration: {},
    nodes: [
      n("project", NodeType.TEST_PROJECT, { framework: "generic-script", packageId: "pkg-a" }),
      n("testFile", NodeType.TEST_FILE, { fileId: "testSource", path: "packages/a/test-script.mjs", packageId: "pkg-a" }),
      n("testSource", NodeType.FILE, { path: "packages/a/test-script.mjs", packageId: "pkg-a" }),
      n("prod", NodeType.FILE, { path: "packages/a/a.ts", packageId: "pkg-a" }),
      n("fn", NodeType.SYMBOL, { fileId: "prod", name: "fn", kind: "function", exported: true })
    ],
    edges: []
  });
  const result = new TestGapAnalyzer().analyze(snapshot, { packageId: "pkg-a" });
  assert.equal(result.unknown, 1);
  assert.equal(result.untested, 0);
  assert.equal(result.gaps.length, 0);
});
