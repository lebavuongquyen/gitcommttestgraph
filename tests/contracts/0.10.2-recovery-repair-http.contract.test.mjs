import assert from "node:assert/strict";
import test from "node:test";
import { withHttpServer } from "./helpers.mjs";

const root = new URL("../../", import.meta.url).pathname.replace(/^\//, "").replaceAll("/", "\\").replace(/^([A-Z]):/, "$1:");

test("RCV03 HTTP recovery repair exposes plan operation", async () => {
  await withHttpServer(root, 37877, async base => {
    const response = await fetch(base + "/api/recovery/repair", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ operation: "plan" })
    });
    assert.equal(response.status, 200);
    const body = await response.json();
    assert.equal(body.operation, "plan");
    assert.ok(body.plan);
    assert.equal(typeof body.plan.safe, "boolean");
  });
});
