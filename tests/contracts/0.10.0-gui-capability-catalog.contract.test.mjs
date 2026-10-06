import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import { guiCapabilityContracts } from "../../dist/gui/contracts.js";
import {
  toGuiStatusViewModel,toGuiCommitViewModels,toGuiGraphViewModel,
  toGuiExecutionViewModel,toGuiChangeIntelligenceViewModel
} from "../../dist/gui/view-models.js";

test("0.10 R08 GUI capability catalog covers every browser route", async () => {
  const client = await readFile(new URL("../../src/gui/client.ts", import.meta.url), "utf8");
  for (const descriptor of guiCapabilityContracts) assert.match(client, new RegExp(descriptor.path.replaceAll("/", "\\/")));
  assert.equal(new Set(guiCapabilityContracts.map(x => x.path)).size, guiCapabilityContracts.length);
});

test("0.10 R08 GUI capability catalog has no duplicate ids", () => {
  assert.equal(new Set(guiCapabilityContracts.map(x => x.id)).size, guiCapabilityContracts.length);
});

test("0.10 R08 existing R07 adapters remain deterministic", () => {
  assert.deepEqual(toGuiStatusViewModel({root:"r",head:"h"}), {repository:"r",head:"h"});
  assert.deepEqual(toGuiCommitViewModels([{hash:"h",subject:"s"}]), [{hash:"h",subject:"s"}]);
  assert.deepEqual(toGuiGraphViewModel({nodes:[],edges:[],schemaVersion:"1",repository:"r",commit:"c"}).nodes, []);
  assert.deepEqual(toGuiExecutionViewModel({steps:[]}), {steps:[],execution:undefined});
  assert.deepEqual(toGuiChangeIntelligenceViewModel({}), {intelligence:null});
});

