import assert from "node:assert/strict";
import test from "node:test";
import { TypeScriptProjectAnalyzer } from "../../dist/adapters/languages/typescript/semantic-project-analyzer.js";
import { EdgeType, NodeType } from "../../dist/domain/graph/model.js";

test("project analyzer resolves imports and calls", () => {
  const analyzer = new TypeScriptProjectAnalyzer();
  const result = analyzer.analyze([
    { path: "src/util.ts", content: "export function add(a: number, b: number) { return a + b; }" },
    { path: "src/main.ts", content: "import { add } from './util.js'; export function run() { return add(1, 2); }" }
  ], "commit-1");
  const importEdges = result.edges.filter(edge => edge.type === EdgeType.IMPORTS);
  const callEdges = result.edges.filter(edge => edge.type === EdgeType.CALLS);
  assert.equal(importEdges.length, 1);
  assert.equal(importEdges[0].confidence, "EXACT");
  assert.equal(callEdges.length, 1);
  assert.ok(result.nodes.some(node => node.type === NodeType.SYMBOL && node.attributes.name === "add"));
});

test("project analyzer keeps package boundaries", () => {
  const analyzer = new TypeScriptProjectAnalyzer();
  const result = analyzer.analyze([
    { path: "a/a.ts", content: "export const a = 1;", packageId: "pkg-a" },
    { path: "b/b.ts", content: "export const b = 2;", packageId: "pkg-b" }
  ], "commit-2");
  const files = result.nodes.filter(node => node.type === NodeType.FILE);
  assert.equal(files.find(node => node.attributes.path === "a/a.ts")?.attributes.packageId, "pkg-a");
  assert.equal(files.find(node => node.attributes.path === "b/b.ts")?.attributes.packageId, "pkg-b");
});
