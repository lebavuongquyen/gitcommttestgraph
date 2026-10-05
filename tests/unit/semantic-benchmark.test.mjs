import assert from "node:assert/strict";
import test from "node:test";
import { TypeScriptProjectAnalyzer } from "../../dist/adapters/languages/typescript/semantic-project-analyzer.js";
import { EdgeType, NodeType } from "../../dist/domain/graph/model.js";

test("semantic benchmark covers true edges and forbidden cross-boundary links", () => {
  const result = new TypeScriptProjectAnalyzer().analyzeProject({
    pathAliases: { "@web/*": ["apps/web/src/*"] },
    packageRoots: { "@shared": "packages/shared" },
    packageEntrypoints: { "@shared": "packages/shared/src/index.ts" },
    files: [
      { path: "apps/web/src/page.ts", content: "import { value } from '@shared'; import type { Thing } from '@web/types'; export const page = value; export async function load() { return import('./lazy'); }" },
      { path: "apps/web/src/types.ts", content: "export interface Thing { value: string }" },
      { path: "apps/web/src/lazy.ts", content: "export const lazy = 1;" },
      { path: "apps/web/src/barrel.ts", content: "export { value } from '@shared';" },
      { path: "apps/api/src/controller.ts", content: "export function controller() { return 'api'; }" },
      { path: "packages/shared/src/index.ts", content: "export const value = 1;" }
    ]
  }, "benchmark");
  const file = path => result.nodes.find(node => node.type === NodeType.FILE && node.attributes.path === path);
  const web = file("apps/web/src/page.ts");
  const shared = file("packages/shared/src/index.ts");
  const types = file("apps/web/src/types.ts");
  const lazy = file("apps/web/src/lazy.ts");
  const barrel = file("apps/web/src/barrel.ts");
  const api = file("apps/api/src/controller.ts");
  assert.ok(web && shared && types && lazy && barrel && api);
  const has = (type, source, target) => result.edges.some(edge => edge.type === type && edge.source === source.id && edge.target === target.id);
  const trueCases = [
    has(EdgeType.IMPORTS, web, shared),
    has(EdgeType.IMPORTS, web, types),
    has(EdgeType.IMPORTS, web, lazy),
    has(EdgeType.EXPORTS, barrel, shared)
  ];
  const falseCases = [
    has(EdgeType.IMPORTS, web, api),
    has(EdgeType.CALLS, web, api)
  ];
  assert.equal(trueCases.filter(Boolean).length, trueCases.length);
  assert.equal(falseCases.filter(Boolean).length, 0);
  assert.equal(trueCases.length, 4);
  assert.equal(falseCases.length, 2);
});
