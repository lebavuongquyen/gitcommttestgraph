import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

const files = [
  "../../bin/gctg.mjs",
  "../../src/mcp/server.ts",
  "../../src/infrastructure/http/server.ts"
];

const forbidden = [
  "new RepositoryIndexer",
  "new IncrementalRepositoryIndexer",
  "new JsonGraphStore",
  "new JsonSemanticCache",
  "new IndexLock",
  "new ConfigurationService",
  "new JsonConfigurationStore"
];

test("0.10 surfaces use the shared application runtime", async () => {
  for (const relative of files) {
    const source = await readFile(new URL(relative, import.meta.url), "utf8");
    assert.match(source, /ApplicationRuntime/);
    for (const expression of forbidden) assert.equal(source.includes(expression), false, relative + ": " + expression);
  }
});

test("0.10 runtime owns repository indexing composition", async () => {
  const source = await readFile(new URL("../../src/runtime/application-runtime.ts", import.meta.url), "utf8");
  for (const expression of [
    "discoverRepository",
    "RepositoryIndexer",
    "IncrementalRepositoryIndexer",
    "JsonGraphStore",
    "JsonSemanticCache",
    "IndexLock",
    "ConfigurationService"
  ]) assert.match(source, new RegExp(expression));
});
