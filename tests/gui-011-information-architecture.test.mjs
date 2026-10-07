import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const app = fs.readFileSync(new URL("../src/gui/app.ts", import.meta.url), "utf8");
const client = fs.readFileSync(new URL("../src/gui/client.ts", import.meta.url), "utf8");

test("0.11 information architecture makes graph workflow primary", () => {
  assert.match(app, /<h3>Details<\/h3>/);
  assert.match(app, /Additional intelligence/);
  assert.doesNotMatch(app, /Repository intelligence/);
  assert.equal((app.match(/id="inspector"/g) || []).length, 1);
  assert.equal((app.match(/id="tests"/g) || []).length, 1);
  assert.equal((app.match(/id="execution"/g) || []).length, 1);
});

test("0.11 secondary intelligence is deferred from initial commit load", () => {
  assert.match(client, /overview/);
  assert.match(client, /graphView/);
  assert.match(client, /graphMode=\\"edited-files\\"/);
  assert.match(client, /Choose View Tests from a changed file/);
});

test("0.11 commit list exposes message metadata", () => {
  assert.match(client, /c\.subject/);
  assert.match(client, /c\.author/);
  assert.match(client, /c\.timestamp/);
  assert.match(client, /commitParents/);
});

test("0.11 file drill-down and diff capabilities are exposed", () => {
  assert.match(fs.readFileSync(new URL("../src/gui/graph-interaction.ts", import.meta.url), "utf8"), /graphDrilldown/);
  assert.match(fs.readFileSync(new URL("../src/gui/graph-interaction.ts", import.meta.url), "utf8"), /fileDiff/);
  assert.match(app, /graphBack/);
  assert.match(app, /diffPanel/);
});
