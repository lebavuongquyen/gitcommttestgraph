import test from "node:test";
import assert from "node:assert/strict";
import { guiCapabilityContracts } from "../../dist/gui/contracts.js";

test("RCV02 GUI capability routes recovery through the HTTP capability", () => {
  const recovery = guiCapabilityContracts.find(item => item.id === "recovery");
  assert.deepEqual(recovery, { id: "recovery", path: "/api/recovery", browserKey: "recovery" });
});


