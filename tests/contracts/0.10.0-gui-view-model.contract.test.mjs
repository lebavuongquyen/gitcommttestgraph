import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import {
  toGuiStatusViewModel,
  toGuiCommitViewModels,
  toGuiGraphViewModel,
  toGuiExecutionViewModel,
  toGuiChangeIntelligenceViewModel
} from "../../dist/gui/view-models.js";

test("0.10 R07 status adapter normalizes transport payload", () => {
  assert.deepEqual(toGuiStatusViewModel({ root: "/repo", head: "abcdef123456" }), {
    repository: "/repo",
    head: "abcdef123456"
  });
});

test("0.10 R07 commit adapter normalizes missing values safely", () => {
  assert.deepEqual(toGuiCommitViewModels([{ hash: "abc", subject: "Commit" }, {}]), [
    { hash: "abc", subject: "Commit" },
    { hash: "", subject: "" }
  ]);
});

test("0.10 R07 graph adapter keeps only presentation-safe fields", () => {
  assert.deepEqual(toGuiGraphViewModel({
    schemaVersion: "1",
    repository: "/repo",
    commit: "abc",
    nodes: [{ id: "n1", kind: "symbol", label: "foo", attributes: { changed: true } }],
    edges: [{ source: "n1", target: "n2", relation: "AFFECTS" }]
  }), {
    schemaVersion: "1",
    repository: "/repo",
    commit: "abc",
    nodes: [{ id: "n1", kind: "symbol", label: "foo", attributes: { changed: true } }],
    edges: [{ source: "n1", target: "n2", relation: "AFFECTS" }]
  });
});

test("0.10 R07 graph adapter normalizes the public graph schema", () => {
  assert.deepEqual(toGuiGraphViewModel({
    schemaVersion: "1.0.0",
    repository: "E:/repo",
    commit: "abc",
    nodes: [{ id: "n1", type: "Symbol", attributes: { kind: "function", name: "App", changed: true } }],
    edges: []
  }), {
    schemaVersion: "1.0.0",
    repository: "E:/repo",
    commit: "abc",
    nodes: [{ id: "n1", kind: "function", label: "App", attributes: { kind: "function", name: "App", changed: true } }],
    edges: []
  });
});

test("0.10 R07 execution adapter separates plan view model from transport feedback", () => {
  assert.deepEqual(toGuiExecutionViewModel({
    steps: [{ id: "s1", affectedTestCaseIds: ["t1"], command: { executable: "npm", args: ["test"] } }]
  }, { execution: { status: "passed" } }), {
    steps: [{ id: "s1", affectedTestCaseIds: ["t1"], command: { executable: "npm", args: ["test"] } }],
    execution: { status: "passed" }
  });
});

test("0.10 R07 change intelligence adapter normalizes optional intelligence", () => {
  assert.deepEqual(toGuiChangeIntelligenceViewModel({ intelligence: { risk: "low" } }), {
    intelligence: { risk: "low" }
  });
  assert.deepEqual(toGuiChangeIntelligenceViewModel({}), { intelligence: null });
});

test("0.10 R07 adapters remain presentation-only and are consumed by the browser controller", async () => {
  const adapterSource = await readFile(new URL("../../src/gui/view-models.ts", import.meta.url), "utf8");
  const clientSource = await readFile(new URL("../../src/gui/client.ts", import.meta.url), "utf8");
  assert.doesNotMatch(adapterSource, /from ["']\.\.\/(?:application|domain|infrastructure)\//);
  assert.match(clientSource, /GUI_VIEW_MODEL_SCRIPT/);
  assert.match(clientSource, /toGuiStatusViewModel\(/);
  assert.match(clientSource, /toGuiCommitViewModels\(/);
  assert.match(clientSource, /toGuiGraphViewModel\(/);
  assert.match(clientSource, /toGuiExecutionViewModel\(/);
  assert.match(clientSource, /toGuiChangeIntelligenceViewModel\(/);
});

