import assert from "node:assert/strict";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { withHttpServer } from "./helpers.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");

test("HTTP diagnostic bundle exposes health, operations, configuration and reproducibility evidence", async () => {
  await withHttpServer(root, 37876, async base => {
    const response = await fetch(base + "/api/diagnostic-bundle");
    assert.equal(response.status, 200);
    const payload = await response.json();
    assert.equal(payload.schemaVersion, 1);
    assert.ok(payload.health);
    assert.ok(Array.isArray(payload.operations));
    assert.ok(payload.configuration);
    assert.ok(payload.storage);
    assert.ok(payload.reproducibility);
  });
});
