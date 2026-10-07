import assert from "node:assert/strict";
import test from "node:test";
import { withHttpServer } from "./helpers.mjs";

const root = new URL("../../", import.meta.url).pathname.replace(/^\//, "").replaceAll("/", "\\").replace(/^([A-Z]):/, "$1:");

test("RCV04 HTTP interrupted recovery exposes status", async () => {
  await withHttpServer(root, 37878, async base => {
    const response=await fetch(base+"/api/recovery/interrupted");
    assert.equal(response.status,200);
    const body=await response.json();
    assert.ok(["none","interrupted"].includes(body.status));
  });
});
