import assert from "node:assert/strict";
import test from "node:test";
import {
  createGuiState,
  beginGuiLoad,
  completeGuiLoad,
  failGuiLoad,
  markGuiStale,
  beginGuiExecution,
  completeGuiExecution,
  selectGuiNode
} from "../../dist/gui/state.js";

test("0.10 R10 GUI state model covers load lifecycle", () => {
  let state = createGuiState();
  assert.equal(state.load, "idle");
  state = beginGuiLoad(state, "commit-1");
  assert.equal(state.load, "loading");
  assert.equal(state.commit, "commit-1");
  state = completeGuiLoad(state);
  assert.equal(state.load, "ready");
  state = markGuiStale(state);
  assert.equal(state.load, "stale");
  assert.equal(state.stale, true);
  state = failGuiLoad(state, "load failed");
  assert.equal(state.load, "error");
  assert.equal(state.error, "load failed");
});

test("0.10 R10 GUI state model covers execution and selection", () => {
  let state = createGuiState();
  state = selectGuiNode(state, "node-1");
  assert.equal(state.selectedNode, "node-1");
  state = beginGuiExecution(state);
  assert.equal(state.execution, "running");
  state = completeGuiExecution(state, true);
  assert.equal(state.execution, "completed");
  state = beginGuiExecution(state);
  state = completeGuiExecution(state, false);
  assert.equal(state.execution, "failed");
});

test("0.10 R10 browser state script is exported from the GUI client", async () => {
  const { GUI_CLIENT_SCRIPT } = await import("../../dist/gui/client.js");
  assert.match(GUI_CLIENT_SCRIPT, /const createGuiState=/);
  assert.match(GUI_CLIENT_SCRIPT, /const beginGuiLoad=/);
  assert.match(GUI_CLIENT_SCRIPT, /const beginGuiExecution=/);
  assert.match(GUI_CLIENT_SCRIPT, /Object\.assign\(state,beginGuiLoad\(/);
  assert.match(GUI_CLIENT_SCRIPT, /Object\.assign\(state,completeGuiExecution\(/);
});
