import assert from "node:assert/strict";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { mcpRequest } from "./helpers.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");

test("MCP operations contract: persisted history is callable and bounded", async () => {
  const { responses } = await mcpRequest(root, [
    { method: "initialize", params: { protocolVersion: "2025-06-18", capabilities: {}, clientInfo: { name: "gctg-operations-contract", version: "1.0.0" } } },
    { method: "notifications/initialized", params: {} },
    { method: "tools/call", params: { name: "operations", arguments: { limit: 10, state: "succeeded" } } }
  ]);
  assert.equal(responses[2].error, undefined);
  const payload = JSON.parse(responses[2].result.content[0].text);
  assert.ok(Array.isArray(payload));
  assert.ok(payload.every(item => item.state === "succeeded"));
});
