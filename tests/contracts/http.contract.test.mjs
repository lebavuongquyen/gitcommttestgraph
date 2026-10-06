import assert from "node:assert/strict";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { withHttpServer } from "./helpers.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");

test("HTTP public contract: status endpoint returns JSON", async () => {
  await withHttpServer(root, 37871, async base => {
    const response = await fetch(base + "/api/status");
    assert.equal(response.status, 200);
    assert.match(response.headers.get("content-type") ?? "", /application\/json/);
    const value = await response.json();
    assert.equal(typeof value.root, "string");
    assert.equal(typeof value.head, "string");
    assert.ok(Array.isArray(value.workspaceFiles));
  });
});

test("HTTP public contract: configuration returns resolved settings", async () => {
  await withHttpServer(root, 37876, async base => {
    const response = await fetch(base + "/api/config");
    assert.equal(response.status, 200);
    const value = await response.json();
    assert.equal(value.configuration.schemaVersion, 1);
    assert.ok(Array.isArray(value.sources));
  });
});

test("HTTP public contract: missing node id is a client error", async () => {
  await withHttpServer(root, 37872, async base => {
    const response = await fetch(base + "/api/node");
    assert.equal(response.status, 400);
    const value = await response.json();
    assert.equal(typeof value.error, "string");
  });
});
