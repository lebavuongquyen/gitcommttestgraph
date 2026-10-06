import assert from "node:assert/strict";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { withHttpServer } from "./helpers.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");

test("HTTP consistency check is read-only and machine-readable", async () => {
  await withHttpServer(root, 37877, async base => {
    const response = await fetch(base + "/api/consistency-check");
    assert.equal(response.status, 200);
    const payload = await response.json();
    assert.equal(typeof payload.healthy, "boolean");
    assert.ok(Array.isArray(payload.issues));
  });
});
