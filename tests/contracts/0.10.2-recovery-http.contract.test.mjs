import assert from "node:assert/strict";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { withHttpServer } from "./helpers.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");

test("HTTP recovery endpoint exposes backup capability", async () => {
  await withHttpServer(root, 37876, async base => {
    const response = await fetch(base + "/api/recovery");
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), { supported: true, format: "gctg-backup", schemaVersion: 1 });
  });
});
