import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

const packageJson = JSON.parse(await readFile(new URL("../../package.json", import.meta.url), "utf8"));
const root = await import("git-commit-test-graph");
const api = await import("git-commit-test-graph/api");

const forbidden = [
  "CliGitRepository",
  "JsonGraphStore",
  "JsonSemanticCache",
  "JsonConfigurationStore",
  "JsonTestResultStore",
  "RepositoryIndexer",
  "IncrementalRepositoryIndexer",
  "IndexLock",
  "runProcess",
  "startServer",
  "GitHubPullRequestProvider",
  "TypeScriptProjectAnalyzer"
];

test("0.10 public package root resolves to the public SDK", () => {
  assert.equal(packageJson.main, "./dist/public/index.js");
  assert.equal(packageJson.types, "./dist/public/index.d.ts");
  assert.equal(packageJson.exports["."], "./dist/public/index.js");
  assert.equal(packageJson.exports["./api"], "./dist/public/index.js");
});

test("0.10 package root and ./api expose the same runtime contract", () => {
  assert.deepEqual(Object.keys(root).sort(), Object.keys(api).sort());
});

test("0.10 public package root does not expose infrastructure symbols", () => {
  for (const symbol of forbidden) assert.equal(symbol in root, false, symbol);
});
