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
    const status = await api.json();
    const before = await (await fetch(base + "/api/operations?name=index&limit=100")).json();
    await fetch(base + "/api/graph-view?commit=" + encodeURIComponent(status.head));
    const afterFirst = await (await fetch(base + "/api/operations?name=index&limit=100")).json();
    await fetch(base + "/api/graph-view?commit=" + encodeURIComponent(status.head));
    const afterSecond = await (await fetch(base + "/api/operations?name=index&limit=100")).json();
    assert.ok(afterFirst.length >= before.length);
    assert.equal(afterSecond.length, afterFirst.length);
    assert.equal(afterSecond.at(-1)?.id, afterFirst.at(-1)?.id);

  });
});


test("0.11 GUI drill-down resolves changed files that are not indexed", async () => {
  await withHttpServer(root, 37877, async base => {
    const status = await (await fetch(base + "/api/status")).json();
    const graph = await (await fetch(base + "/api/graph-view?commit=" + encodeURIComponent(status.head))).json();
    const changedFile = graph.nodes.find(node => node.type === "File" && node.attributes?.changed);
    assert.ok(changedFile, "expected a changed file node");
    const dependencies = await fetch(base + "/api/graph-drilldown?commit=" + encodeURIComponent(status.head) + "&nodeId=" + encodeURIComponent(changedFile.id) + "&mode=dependencies");
    assert.equal(dependencies.status, 200);
    const dependencyGraph = await dependencies.json();
    assert.equal(dependencyGraph.selectedNodeId, changedFile.id);
    const tests = await fetch(base + "/api/graph-drilldown?commit=" + encodeURIComponent(status.head) + "&nodeId=" + encodeURIComponent(changedFile.id) + "&mode=tests");
    assert.equal(tests.status, 200);
    const testGraph = await tests.json();
    assert.equal(testGraph.selectedNodeId, changedFile.id);
  });
});
