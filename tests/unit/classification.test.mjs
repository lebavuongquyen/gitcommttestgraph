import test from "node:test";
import assert from "node:assert/strict";
import { classifyFile, FileKind } from "../../dist/domain/repository/file-classification.js";
import { buildClassifiedFileGraph } from "../../dist/application/indexing/classified-file-graph.js";

test("file classification distinguishes executable and non-executable artifacts", () => {
  assert.equal(classifyFile("src/a.ts"), FileKind.SOURCE);
  assert.equal(classifyFile("tests/a.test.ts"), FileKind.TEST);
  assert.equal(classifyFile("tsconfig.json"), FileKind.LANGUAGE_CONFIG);
  assert.equal(classifyFile("fixtures/user.json"), FileKind.FIXTURE);
});

test("classified graph creates config and data nodes without test-as-config pollution", () => {
  const graph = buildClassifiedFileGraph({
    files: ["package.json", "tsconfig.json", "tests/a.test.ts", "fixtures/user.json"],
    packages: [{ id: "pkg", rootPath: "." }],
    commit: "abc"
  });
  assert.equal(graph.nodes.filter(node => node.type === "Config").length, 2);
  assert.equal(graph.nodes.filter(node => node.type === "Fixture").length, 1);
});
