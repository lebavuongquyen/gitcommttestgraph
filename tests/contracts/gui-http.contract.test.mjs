import assert from "node:assert/strict";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { withHttpServer } from "./helpers.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");

test("GUI HTTP smoke: browser entry and API are reachable through the real server", async () => {
  await withHttpServer(root, 37873, async base => {
    const page = await fetch(base + "/");
    assert.equal(page.status, 200);
    assert.match(page.headers.get("content-type") ?? "", /text\/html/);
    const html = await page.text();
    assert.match(html, /Git Commit Test Graph/);
    assert.match(html, /Recent commits/);
    assert.ok(html.includes("/api/graph-view"));
    assert.ok(html.includes("/api/config"));
    assert.ok(html.includes("Configuration"));
    const api = await fetch(base + "/api/status");
    assert.equal(api.status, 200);
    assert.match(api.headers.get("content-type") ?? "", /application\/json/);
  });
});
