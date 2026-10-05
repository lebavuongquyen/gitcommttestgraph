import test from "node:test";
import assert from "node:assert/strict";
import { buildDataReferenceGraph } from "../../dist/application/indexing/data-reference-graph.js";

test("data references create fixture and schema edges", () => {
  const graph = buildDataReferenceGraph({
    files: ["tests/a.test.ts", "fixtures/user.json", "schemas/user.schema.json"],
    contents: new Map([["tests/a.test.ts", "load fixtures/user.json"], ["src/a.ts", "use schemas/user.schema.json"]]),
    commit: "abc"
  });
  assert.equal(graph.nodes.filter(node => node.type === "Fixture").length, 1);
  assert.equal(graph.nodes.filter(node => node.type === "Schema").length, 1);
  assert.equal(graph.edges.filter(edge => edge.type === "USES_FIXTURE").length, 1);
  assert.equal(graph.edges.filter(edge => edge.type === "USES_SCHEMA").length, 1);
});
