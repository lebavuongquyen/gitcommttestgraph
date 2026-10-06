import assert from "node:assert/strict";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { mcpRequest } from "./helpers.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");

test("MCP public contract: initialize and tools/list are available", async () => {
  const { responses } = await mcpRequest(root, [
    { method: "initialize", params: { protocolVersion: "2025-06-18", capabilities: {}, clientInfo: { name: "gctg-contract-test", version: "1.0.0" } } },
    { method: "notifications/initialized", params: {} },
    { method: "tools/list", params: {} }
  ]);
  assert.equal(responses[0].error, undefined);
  assert.ok(responses[0].result?.serverInfo);
  assert.equal(responses[2].error, undefined);
  const names = responses[2].result?.tools?.map(tool => tool.name) ?? [];
  assert.ok(names.includes("repository_status"));
  assert.ok(names.includes("change_intelligence"));
  assert.ok(names.includes("test_gaps"));
});

test("MCP public contract: test_gaps is callable", async () => {
  const { responses } = await mcpRequest(root, [
    { method: "initialize", params: { protocolVersion: "2025-06-18", capabilities: {}, clientInfo: { name: "gctg-contract-test", version: "1.0.0" } } },
    { method: "notifications/initialized", params: {} },
    { method: "tools/call", params: { name: "test_gaps", arguments: {} } }
  ]);
  assert.equal(responses[2].error, undefined);
  const payload = JSON.parse(responses[2].result.content[0].text);
  assert.equal(typeof payload.symbols, "number");
  assert.ok(Array.isArray(payload.gaps));
});

test("MCP public contract: repository_status is callable", async () => {
  const { responses } = await mcpRequest(root, [
    { method: "initialize", params: { protocolVersion: "2025-06-18", capabilities: {}, clientInfo: { name: "gctg-contract-test", version: "1.0.0" } } },
    { method: "notifications/initialized", params: {} },
    { method: "tools/call", params: { name: "repository_status", arguments: {} } }
  ]);
  assert.equal(responses[2].error, undefined);
  const payload = JSON.parse(responses[2].result.content[0].text);
  assert.equal(typeof payload.root, "string");
  assert.equal(typeof payload.head, "string");
});

test("MCP public contract: configuration is callable", async () => {
  const { responses } = await mcpRequest(root, [
    { method: "initialize", params: { protocolVersion: "2025-06-18", capabilities: {}, clientInfo: { name: "gctg-contract-test", version: "1.0.0" } } },
    { method: "notifications/initialized", params: {} },
    { method: "tools/call", params: { name: "configuration", arguments: { operation: "get" } } }
  ]);
  assert.equal(responses[2].error, undefined);
  const payload = JSON.parse(responses[2].result.content[0].text);
  assert.equal(payload.configuration.schemaVersion, 1);
  assert.ok(Array.isArray(payload.sources));
});
