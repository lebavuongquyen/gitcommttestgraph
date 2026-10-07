import assert from "node:assert/strict";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { runCli, withHttpServer, mcpRequest } from "./helpers.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");

test("0.8.1 CLI contract: change-intelligence rejects invalid source with usage exit code", async () => {
  const result = await runCli(root, ["change-intelligence", "INVALID"]);
  assert.equal(result.code, 2);
  assert.match(result.stderr, /Usage: gctg change-intelligence/);
});

test("0.8.1 CLI contract: change-intelligence result is deterministic and versioned", async () => {
  const first = await runCli(root, ["change-intelligence"]);
  const second = await runCli(root, ["change-intelligence"]);
  assert.equal(first.code, 0, first.stderr);
  assert.equal(second.code, 0, second.stderr);
  const a = JSON.parse(first.stdout);
  const b = JSON.parse(second.stdout);
  assert.equal(a.schemaVersion, 1);
  assert.equal(a.deterministic, true);
  assert.deepEqual(a, b);
});

test("0.8.1 HTTP contract: invalid change-intelligence source is a client error", async () => {
  await withHttpServer(root, 37881, async base => {
    const response = await fetch(base + "/api/change-intelligence?source=INVALID");
    assert.equal(response.status, 400);
    assert.match(response.headers.get("content-type") ?? "", /application\/json/);
    const value = await response.json();
    assert.equal(value.error, "source must be COMMIT or BRANCH");
  });
});

test("0.8.1 HTTP contract: change-intelligence returns its public schema", async () => {
  await withHttpServer(root, 37882, async base => {
    const response = await fetch(base + "/api/change-intelligence");
    assert.equal(response.status, 200);
    const value = await response.json();
    assert.equal(value.schemaVersion, 1);
    assert.equal(value.deterministic, true);
    assert.equal(value.intelligence.schemaVersion, 1);
    assert.ok(["LOW", "MEDIUM", "HIGH", "UNKNOWN"].includes(value.intelligence.risk));
  });
});

test("0.8.1 MCP contract: change_intelligence declares a constrained source schema", async () => {
  const { responses } = await mcpRequest(root, [
    { method: "initialize", params: { protocolVersion: "2025-06-18", capabilities: {}, clientInfo: { name: "0.8.1-contract", version: "1.0.0" } } },
    { method: "notifications/initialized", params: {} },
    { method: "tools/list", params: {} }
  ]);
  const tools = responses[2].result.tools;
  const tool = tools.find(item => item.name === "change_intelligence");
  assert.ok(tool);
  assert.equal(tool.inputSchema.type, "object");
  assert.ok(tool.inputSchema.properties.source);
  assert.deepEqual(tool.inputSchema.properties.source.enum, ["COMMIT", "BRANCH"]);
});

test("0.8.1 MCP contract: change_intelligence remains a registered callable capability", async () => {
  const { responses } = await mcpRequest(root, [
    { method: "initialize", params: { protocolVersion: "2025-06-18", capabilities: {}, clientInfo: { name: "0.8.1-contract", version: "1.0.0" } } },
    { method: "notifications/initialized", params: {} },
    { method: "tools/list", params: {} }
  ]);
  const tool = responses[2].result.tools.find(item => item.name === "change_intelligence");
  assert.ok(tool);
  assert.equal(tool.name, "change_intelligence");
});

test("0.8.1 GUI gate: real page contains the change-intelligence fetch path", async () => {
  await withHttpServer(root, 37883, async base => {
    const response = await fetch(base + "/");
    assert.equal(response.status, 200);
    const html = await response.text();
    assert.match(html, /\/api\/change-intelligence/);
    assert.match(html, /const \[overview,graph,tests,plan,feedback,intelligence\]/);
  });
});
