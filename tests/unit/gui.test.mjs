import assert from "node:assert/strict";
import test from "node:test";
import { renderGui } from "../../dist/gui/app.js";

test("GUI shell exposes repository explorer and graph workbench", () => {
  const html = renderGui();
  assert.match(html, /Recent commits/);
  assert.match(html, /Code and test impact graph/);
  assert.ok(html.includes("/api/graph-view"));
  assert.ok(html.includes("/api/test-impact"));
  assert.match(html, /Inspector/);
});
