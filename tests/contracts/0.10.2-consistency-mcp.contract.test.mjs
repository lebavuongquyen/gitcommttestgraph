import assert from "node:assert/strict";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { mcpRequest } from "./helpers.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");

test("MCP consistency check is callable", async () => {
  const { responses } = await mcpRequest(root, [
    { method: "initialize", params: { protocolVersion: "2025-06-18", capabilities: {}, clientInfo: { name: "gctg-consistency-contract", version: "1.0.0" } } },
    { method: "notifications/initialized", params: {} },
    { method: "tools/call", params: { name: "consistency_check", arguments: {} } }
  ]);
  assert.equal(responses[2].error, undefined);
  const payload = JSON.parse(responses[2].result.content[0].text);
  assert.equal(typeof payload.healthy, "boolean");
  assert.ok(Array.isArray(payload.issues));
});
