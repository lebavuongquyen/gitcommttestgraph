import assert from "node:assert/strict";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { withHttpServer } from "./helpers.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");

test("0.8.4 HTTP security: execution requires explicit approval", async () => {
  await withHttpServer(root, 37884, async base => {
    const response = await fetch(base + "/api/run-execution-plan");
    assert.equal(response.status, 404);
    const post = await fetch(base + "/api/run-execution-plan", { method: "POST" });
    assert.equal(post.status, 403);
    const value = await post.json();
    assert.equal(value.error, "Execution approval is required.");
  });
});

test("0.8.4 HTTP security: malformed JSON is a client error", async () => {
  await withHttpServer(root, 37885, async base => {
    const response = await fetch(base + "/api/config", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: "{"
    });
    assert.equal(response.status, 400);
    const value = await response.json();
    assert.equal(value.error, "Malformed JSON request body.");
  });
});

test("0.8.4 HTTP security: oversized JSON is rejected", async () => {
  await withHttpServer(root, 37886, async base => {
    const response = await fetch(base + "/api/config", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ payload: "x".repeat(300000) })
    });
    assert.equal(response.status, 413);
    const value = await response.json();
    assert.equal(value.error, "Request body is too large.");
  });
});

test("0.8.4 HTTP security: internal failures do not expose internal error details", async () => {
  await withHttpServer(root, 37887, async base => {
    const response = await fetch(base + "/api/config?unexpected=1");
    assert.equal(response.status, 200);
    const value = await response.json();
    assert.equal(value.configuration.schemaVersion, 1);
  });
});
