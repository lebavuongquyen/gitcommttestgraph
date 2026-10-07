import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const client = fs.readFileSync(new URL("../src/gui/client.ts", import.meta.url), "utf8");
const interaction = fs.readFileSync(new URL("../src/gui/graph-interaction.ts", import.meta.url), "utf8");
const state = fs.readFileSync(new URL("../src/gui/state.ts", import.meta.url), "utf8");
const app = fs.readFileSync(new URL("../src/gui/app.ts", import.meta.url), "utf8");

test("0.11 graph interaction has an explicit camera model", () => {
  assert.match(state, /camera:\s*GuiCameraState/);
  assert.match(state, /camera:\s*\{ x: 0, y: 0, scale: 1 \}/);
  assert.match(interaction, /state\.camera\.x/);
  assert.match(interaction, /state\.camera\.y/);
  assert.match(interaction, /state\.camera\.scale/);
});

test("0.11 graph interaction supports wheel zoom and pointer pan", () => {
  assert.match(interaction, /addEventListener\("wheel"/);
  assert.match(interaction, /setScaleAt\(event\.clientX,event\.clientY/);
  assert.match(interaction, /pointerdown/);
  assert.match(interaction, /pointermove/);
  assert.match(interaction, /setPointerCapture/);
});

test("0.11 graph interaction supports node selection, drag and focus", () => {
  assert.match(interaction, /beginNodeDrag/);
  assert.match(interaction, /const originX=event\.clientX,originY=event\.clientY/);
  assert.match(interaction, /const originGraphX=p\.x,originGraphY=p\.y/);
  assert.match(interaction, /p\.x=originGraphX\+dx;p\.y=originGraphY\+dy/);
  assert.match(interaction, /dblclick/);
  assert.match(interaction, /focusNode/);
  assert.match(interaction, /selectNode\(node\.dataset\.id\)/);
});

test("0.11 graph interaction has fit/reset and keyboard controls", () => {
  assert.match(interaction, /fitGraph/);
  assert.match(interaction, /resetCamera/);
  assert.match(interaction, /event\.key==="Escape"/);
  assert.match(interaction, /event\.key==="\+"/);
  assert.match(interaction, /event\.key==="0"/);
});

test("0.11 graph uses drill-down information architecture", () => {
  assert.match(interaction, /graphMode/);
  assert.match(interaction, /edited-files/);
  assert.match(interaction, /Changed files/);
  assert.match(interaction, /Changed symbols/);
  assert.match(interaction, /View Dependencies/);
  assert.match(interaction, /View Tests/);
  assert.match(interaction, /View Diff/);
  assert.match(interaction, /graphDrilldown/);
  assert.match(interaction, /fileDiff/);
});

test("0.11 GUI graph viewport is not scrollbar-driven", () => {
  assert.match(app, /svg\{[^}]*width:100%;height:100%;display:block;touch-action:none;cursor:grab\}/);
  assert.match(app, /touch-action:none/);
  assert.match(interaction, /renderGraph=function/);
  assert.match(client, /GUI_GRAPH_INTERACTION_SCRIPT/);
});

test("0.11 graph semantics distinguish unavailable relationships from valid graphs", () => {
  assert.match(state, /GuiGraphStatus/);
  assert.match(interaction, /relationships-unavailable/);
  assert.match(interaction, /Relationships are unavailable for this commit/);
  assert.match(interaction, /changed-code evidence/);
});

test("0.11 selection is immediate and enrichment is secondary", () => {
  assert.match(interaction, /selectGuiNode\(state,id\)/);
  assert.match(interaction, /applySelection\(\)/);
  assert.match(interaction, /Selected\. Loading additional evidence/);
  assert.match(interaction, /previousSelectNode\(id\)/);
});
