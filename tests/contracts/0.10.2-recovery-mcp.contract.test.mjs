import assert from "node:assert/strict";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { mcpRequest } from "./helpers.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");

test("MCP backup_restore capability is registered with recovery operations", async () => {
  const { responses } = await mcpRequest(root, [
    { method: "initialize", params: { protocolVersion: "2025-06-18", capabilities: {}, clientInfo: { name: "gctg-recovery-contract", version: "1.0.0" } } },
    { method: "notifications/initialized", params: {} },
    { method: "tools/list", params: {} }
  ]);
  const tool = responses[2].result.tools.find(item => item.name === "backup_restore");
  assert.ok(tool);
  assert.equal(tool.inputSchema.type, "object");
  assert.ok(tool.inputSchema.properties.operation);
  assert.deepEqual(tool.inputSchema.properties.operation.enum, ["create", "inspect", "restore"]);
});
