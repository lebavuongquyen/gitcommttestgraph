import assert from "node:assert/strict";
import test from "node:test";
import { TypeScriptProjectAnalyzer } from "../../dist/adapters/languages/typescript/semantic-project-analyzer.js";
import { EdgeType, NodeType } from "../../dist/domain/graph/model.js";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

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


test("semantic cache benchmark avoids re-analysis for unchanged 120-file history", async () => {
  const root = await mkdtemp(join(tmpdir(), "gctg-semantic-benchmark-"));
  try {
    const { RepositoryIndexer, TypeScriptProjectAnalyzer, JsonGraphStore, JsonSemanticCache } = await import("../../dist/index.js");
    const files = ["package.json", ...Array.from({ length: 120 }, (_, i) => "src/file" + i + ".ts")];
    const contents = new Map(files.map(path => [path, path === "package.json" ? JSON.stringify({ name: "benchmark" }) : "export const value = 1;"]));
    const git = {
      async getCommit(hash) { return { hash, parents: [], author: "a", committer: "c", timestamp: "2026-01-01T00:00:00Z", message: hash }; },
      async listFilesAtCommit() { return files; },
      async readFileAtCommit(commit, path) { return contents.get(path); }
    };
    class CountingAnalyzer extends TypeScriptProjectAnalyzer {
      calls = 0;
      analyzeProject(input, commit) { this.calls++; return super.analyzeProject(input, commit); }
    }
    const analyzer = new CountingAnalyzer();
    const indexer = new RepositoryIndexer(git, analyzer, new JsonGraphStore(join(root, "graph")), new JsonSemanticCache(join(root, "cache")));
    const start = performance.now();
    await indexer.index({ repository: "benchmark", commit: "a", configuration: {}, analyzerVersion: "benchmark" });
    const firstMs = performance.now() - start;
    const cachedStart = performance.now();
    await indexer.index({ repository: "benchmark", commit: "b", configuration: {}, analyzerVersion: "benchmark" });
    const cachedMs = performance.now() - cachedStart;
    assert.equal(analyzer.calls, 1);
    assert.ok(firstMs >= 0);
    assert.ok(cachedMs >= 0);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
