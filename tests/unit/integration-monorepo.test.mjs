import assert from "node:assert/strict";
import test from "node:test";
import { mkdtemp, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { RepositoryIndexer } from "../../dist/application/indexing/index-repository.js";
import { TypeScriptProjectAnalyzer } from "../../dist/adapters/languages/typescript/semantic-project-analyzer.js";
import { JsonGraphStore } from "../../dist/infrastructure/persistence/json-graph-store.js";
import { NodeType, EdgeType } from "../../dist/domain/graph/model.js";
import { ImpactEngine } from "../../dist/application/impact/impact-engine.js";

function fixtureGit() {
  const files = ["package.json", "pnpm-workspace.yaml", "apps/web/package.json", "apps/web/src/page.ts", "apps/web/tests/page.test.ts", "apps/api/package.json", "apps/api/src/controller.ts", "packages/shared/package.json", "packages/shared/src/index.ts"];
  const contents = {
    "package.json": JSON.stringify({ name: "fixture-root", private: true }),
    "pnpm-workspace.yaml": "packages:\n  - apps/*\n  - packages/*\n",
    "apps/web/package.json": JSON.stringify({ name: "@fixture/web", scripts: { test: "node --test" }, dependencies: { "@fixture/shared": "workspace:*" } }),
    "apps/web/src/page.ts": "import { sharedValue } from '@fixture/shared'; export function render() { return sharedValue; }",
    "apps/web/tests/page.test.ts": "import { render } from '../src/page'; test('render works', () => render());",
    "apps/api/package.json": JSON.stringify({ name: "@fixture/api", scripts: { test: "node --test" } }),
    "apps/api/src/controller.ts": "export function controller() { return 'api'; }",
    "packages/shared/package.json": JSON.stringify({ name: "@fixture/shared", exports: { ".": "./src/index.ts" } }),
    "packages/shared/src/index.ts": "export const sharedValue = 'shared'; export function helper() { return sharedValue; }"
  };
  return {
    async getCommit(hash) { return { hash, parents: [], author: "fixture", committer: "fixture", timestamp: "2026-10-05T00:00:00Z", message: "fixture" }; },
    async getHead() { return "fixture"; },
    async getChangedPaths() { return []; },
    async getDiff() { return { fromCommit: "", toCommit: "fixture", paths: [] }; },
    async listFilesAtCommit() { return files; },
    async readFileAtCommit(_commit, path) { if (!(path in contents)) throw new Error(`missing fixture path ${path}`); return contents[path]; }
  };
}

test("repository integration builds workspace and semantic impact without cross-app false links", async () => {
  const root = await mkdtemp(join(tmpdir(), "gctg-integration-"));
  try {
    const git = fixtureGit();
    const indexer = new RepositoryIndexer(git, new TypeScriptProjectAnalyzer(), new JsonGraphStore(root));
    const { snapshot } = await indexer.index({ repository: "fixture", commit: "fixture", configuration: {}, analyzerVersion: "integration-1" });
    const web = snapshot.nodes.find(node => node.type === NodeType.PACKAGE && node.attributes.name === "@fixture/web");
    const api = snapshot.nodes.find(node => node.type === NodeType.PACKAGE && node.attributes.name === "@fixture/api");
    const shared = snapshot.nodes.find(node => node.type === NodeType.PACKAGE && node.attributes.name === "@fixture/shared");
    assert.ok(web && api && shared);
    assert.equal(shared.attributes.rootPath, "packages/shared");
    assert.ok(snapshot.edges.some(edge => edge.source === web.id && edge.target === shared.id && edge.type === EdgeType.DEPENDS_ON));
    assert.equal(snapshot.edges.some(edge => edge.source === web.id && edge.target === api.id && edge.type === EdgeType.DEPENDS_ON), false);
    const pageFile = snapshot.nodes.find(node => node.type === NodeType.FILE && node.attributes.path === "apps/web/src/page.ts");
    const apiFile = snapshot.nodes.find(node => node.type === NodeType.FILE && node.attributes.path === "apps/api/src/controller.ts");
    assert.ok(pageFile && apiFile);
    assert.equal(snapshot.edges.some(edge => edge.source === pageFile.id && edge.target === apiFile.id && (edge.type === EdgeType.IMPORTS || edge.type === EdgeType.CALLS)), false);
    assert.ok(snapshot.nodes.some(node => node.type === NodeType.TEST_PROJECT && node.attributes.framework === "generic-script"));
    assert.ok(snapshot.nodes.some(node => node.type === NodeType.TEST_FILE && node.attributes.path === "apps/web/tests/page.test.ts"));
    assert.ok(snapshot.nodes.some(node => node.type === NodeType.TEST_CASE && node.attributes.title === "render works"));
    const impact = new ImpactEngine().analyze(snapshot, { changedNodeIds: [pageFile.id] });
    const testFile = snapshot.nodes.find(node => node.type === NodeType.TEST_FILE && node.attributes.path === "apps/web/tests/page.test.ts");
    assert.ok(testFile);
    assert.ok(impact.some(item => item.nodeId === testFile.id));
    assert.equal(snapshot.commit, "fixture");
    assert.ok(snapshot.edges.every(edge => edge.sourceCommit === "fixture"));
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("historical integration fixture preserves selected commit evidence", async () => {
  const root = await mkdtemp(join(tmpdir(), "gctg-history-"));
  try {
    const git = fixtureGit();
    const indexer = new RepositoryIndexer(git, new TypeScriptProjectAnalyzer(), new JsonGraphStore(root));
    const { snapshot } = await indexer.index({ repository: "fixture", commit: "fixture", configuration: {}, analyzerVersion: "integration-history-1" });
    const sharedImport = snapshot.edges.find(edge => edge.type === EdgeType.IMPORTS && edge.evidence.some(item => item.filePath === "apps/web/tests/page.test.ts"));
    assert.ok(sharedImport);
    assert.equal(sharedImport.sourceCommit, "fixture");
    assert.equal(sharedImport.evidence[0]?.startLine, 1);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
