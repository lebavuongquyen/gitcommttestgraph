import assert from "node:assert/strict";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { withHttpServer } from "./helpers.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");

test("HTTP operations endpoint exposes bounded persisted history and supports filters", async () => {
  await withHttpServer(root, 37874, async base => {
    const response = await fetch(base + "/api/operations?limit=10&state=succeeded");
    assert.equal(response.status, 200);
    const payload = await response.json();
    assert.ok(Array.isArray(payload));
    assert.ok(payload.every(item => item.state === "succeeded"));
  });
});

test("HTTP operations endpoint rejects invalid limits", async () => {
  await withHttpServer(root, 37875, async base => {
    const response = await fetch(base + "/api/operations?limit=101");
    assert.equal(response.status, 400);
  });
});
