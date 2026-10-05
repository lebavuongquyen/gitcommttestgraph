import assert from "node:assert/strict";
import test from "node:test";
import { TypeScriptProjectAnalyzer } from "../../dist/adapters/languages/typescript/semantic-project-analyzer.js";
import { EdgeType, NodeType } from "../../dist/domain/graph/model.js";

test("project analyzer resolves workspace package imports to package source", () => {
  const analyzer = new TypeScriptProjectAnalyzer();
  const result = analyzer.analyzeProject({
    packageRoots: { "@fixture/shared": "packages/shared" },
    packageEntrypoints: { "@fixture/shared": "packages/shared/src/index.ts" },
    files: [
      { path: "apps/web/src/page.ts", content: "import { sharedValue } from '@fixture/shared'; export const page = sharedValue;" },
      { path: "packages/shared/src/index.ts", content: "export const sharedValue = 'shared';" }
    ]
  }, "fixture");
  const source = result.nodes.find(node => node.type === NodeType.FILE && node.attributes.path === "apps/web/src/page.ts");
  const target = result.nodes.find(node => node.type === NodeType.FILE && node.attributes.path === "packages/shared/src/index.ts");
  assert.ok(source && target);
  assert.ok(result.edges.some(edge => edge.type === EdgeType.IMPORTS && edge.source === source.id && edge.target === target.id));
});
