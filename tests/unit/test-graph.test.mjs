import test from "node:test";
import assert from "node:assert/strict";
import { buildTestGraph } from "../../dist/application/tests/test-graph-builder.js";

test("test graph creates project file and case nodes", async () => {
  const adapter = {
    id: "fake",
    async detect() { return { detected: true, confidence: "EXACT" }; },
    async discoverTests() { return ["tests/example.test.ts"]; },
    async extractCases() { return [{ title: "works", startLine: 2, endLine: 4 }]; },
    async resolveCommand() { return { executable: "node", args: ["test"], cwd: "." }; }
  };
  const graph = await buildTestGraph(adapter, {
    files: ["tests/example.test.ts"],
    packageId: "package",
    root: ".",
    commit: "abc",
    packageScripts: { test: "node --test" },
    dependencies: {},
    readFile: async () => "test('works', () => {})"
  });
  assert.equal(graph.nodes.filter(node => node.type === "TestProject").length, 1);
  assert.equal(graph.nodes.filter(node => node.type === "TestFile").length, 1);
  assert.equal(graph.nodes.filter(node => node.type === "TestCase").length, 1);
});
