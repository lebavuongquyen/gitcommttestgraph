import assert from "node:assert/strict";
import test from "node:test";
import { JsonGraphStore } from "../../dist/infrastructure/persistence/json-graph-store.js";
import { JsonSemanticCache } from "../../dist/infrastructure/persistence/json-semantic-cache.js";

test("0.10 JSON graph store implements capability-based storage", () => {
  const store = new JsonGraphStore(".gctg-test");
  assert.equal(typeof store.saveSnapshot, "function");
  assert.equal(typeof store.getSnapshot, "function");
  assert.equal(typeof store.getNode, "function");
  assert.equal(typeof store.query, "function");
  assert.equal(store.snapshots, store);
  assert.equal(store.nodes, store);
});

test("0.10 JSON semantic cache implements reader and writer capabilities", () => {
  const cache = new JsonSemanticCache(".gctg-cache-test");
  assert.equal(typeof cache.get, "function");
  assert.equal(typeof cache.save, "function");
});
