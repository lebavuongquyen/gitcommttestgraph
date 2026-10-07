import assert from "node:assert/strict";
import test from "node:test";
import { renderGui } from "../../dist/gui/app.js";

test("GUI shell exposes repository explorer and graph workbench", () => {
  const html = renderGui();
  assert.match(html, /Recent commits/);
  assert.match(html, /Code and test impact graph/);
  assert.ok(html.includes("/api/graph-view"));
  assert.ok(html.includes("/api/test-impact"));
  assert.ok(html.includes("/api/execution-plan"));
  assert.ok(html.includes("/api/run-execution-plan"));
  assert.match(html, /Run impacted tests/);
  assert.match(html, /Execution/);
  assert.match(html, /Details/);
  assert.match(html, /Pull request intelligence/);
  assert.ok(html.includes("/api/pull-request-review"));
  assert.match(html, /Review PR/);
});
