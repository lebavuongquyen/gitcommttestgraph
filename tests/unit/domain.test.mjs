import assert from "node:assert/strict";
import test from "node:test";
import {
  Confidence,
  EdgeType,
  NodeType,
  SymbolKind,
  createSnapshot,
  edgeId,
  stableId
} from "../../dist/index.js";

test("stableId is deterministic", () => {
  assert.equal(stableId("file", "src/a.ts"), stableId("file", "src/a.ts"));
  assert.notEqual(stableId("file", "src/a.ts"), stableId("file", "src/b.ts"));
});

test("edge identity includes commit", () => {
  const a = edgeId("a", EdgeType.IMPORTS, "b", "commit-a");
  const b = edgeId("a", EdgeType.IMPORTS, "b", "commit-b");
  assert.notEqual(a, b);
});

test("snapshot identity preserves commit and deterministic ordering", () => {
  const snapshot = createSnapshot({
    analyzerVersion: "0.2.0",
    repository: "repo",
    commit: "abc",
    configuration: { z: 1, a: 2 },
    nodes: [
      { id: "b", type: NodeType.FILE, attributes: {} },
      { id: "a", type: NodeType.SYMBOL, attributes: { kind: SymbolKind.FUNCTION } }
    ],
    edges: [
      {
        id: "e2",
        source: "b",
        target: "a",
        type: EdgeType.IMPORTS,
        confidence: Confidence.EXACT,
        evidence: [],
        sourceCommit: "abc"
      }
    ]
  });

  assert.equal(snapshot.commit, "abc");
  assert.equal(snapshot.schemaVersion, 1);
  assert.deepEqual(snapshot.nodes.map(node => node.id), ["a", "b"]);
  assert.equal(snapshot.edges[0].sourceCommit, "abc");
});
