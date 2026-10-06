import assert from "node:assert/strict";
import test from "node:test";
import { runCli, withHttpServer, mcpRequest } from "./helpers.mjs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");

test("0.9.1 CLI exposes repository ecosystem", async () => {
  const result = await runCli(root, ["ecosystem"]);
  assert.equal(result.code, 0, result.stderr);
  const value = JSON.parse(result.stdout);
  assert.equal(value.schemaVersion, 1);
  assert.ok(["SUPPORTED", "PARTIAL", "UNKNOWN", "UNSUPPORTED"].includes(value.support));
});

test("0.9.1 HTTP exposes repository ecosystem", async () => {
  await withHttpServer(root, 37884, async base => {
    const response = await fetch(base + "/api/ecosystem");
    assert.equal(response.status, 200);
    const value = await response.json();
    assert.equal(value.schemaVersion, 1);
    assert.ok(Array.isArray(value.packageManagers));
    assert.ok(Array.isArray(value.testFrameworks));
  });
});

test("0.9.1 MCP exposes repository_ecosystem", async () => {
  const { responses } = await mcpRequest(root, [
    { method: "initialize", params: { protocolVersion: "2025-06-18", capabilities: {}, clientInfo: { name: "0.9.1-contract", version: "1.0.0" } } },
    { method: "notifications/initialized", params: {} },
    { method: "tools/list", params: {} },
    { method: "tools/call", params: { name: "repository_ecosystem", arguments: {} } }
  ]);
  const tools = responses[2].result.tools;
  assert.ok(tools.some(item => item.name === "repository_ecosystem"));
  assert.equal(responses[3].error, undefined);
  const value = JSON.parse(responses[3].result.content[0].text);
  assert.equal(value.schemaVersion, 1);
});

test("0.9.1 GUI exposes repository ecosystem", async () => {
  await withHttpServer(root, 37885, async base => {
    const response = await fetch(base + "/");
    const html = await response.text();
    assert.equal(response.status, 200);
    assert.match(html, /\/api\/ecosystem/);
    assert.match(html, /id="ecosystem"/);
  });
});