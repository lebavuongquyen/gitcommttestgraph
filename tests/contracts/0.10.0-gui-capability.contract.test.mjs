import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import { capabilityRegistry } from "../../dist/application/capabilities/capability-registry.js";
import { guiCapabilityContracts } from "../../dist/gui/contracts.js";

test("0.10 R06 typed GUI contracts cover every registered GUI capability", () => {
  const registry = capabilityRegistry.filter(capability => capability.surfaces.GUI);
  const typed = new Map(guiCapabilityContracts.map(capability => [capability.id, capability.path]));
  for (const capability of registry) {
    assert.equal(typed.get(capability.id), capability.surfaces.GUI, capability.id);
  }
});

test("0.10 R06 GUI client centralizes capability routes", async () => {
  const source = await readFile(new URL("../../src/gui/client.ts", import.meta.url), "utf8");
  assert.match(source, /GUI_CAPABILITIES=/);
  assert.match(source, /function capability\(name,queryString\)/);
  assert.match(source, /function query\(params\)/);
  assert.doesNotMatch(source, /api\("\/api\//);
});

test("0.10 R06 typed GUI contract is presentation-only", async () => {
  const source = await readFile(new URL("../../src/gui/contracts.ts", import.meta.url), "utf8");
  assert.doesNotMatch(source, /from ["']\.\.\/(?:application|domain|infrastructure)\//);
  assert.match(source, /GuiCapabilityId/);
  assert.match(source, /GuiCapabilityDescriptor/);
  assert.match(source, /GuiStatusViewModel/);
  assert.match(source, /GuiGraphViewModel/);
});
