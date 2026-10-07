import assert from "node:assert/strict";
import test from "node:test";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { dirname } from "node:path";
import { mcpRequest } from "./helpers.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");

test("MCP backup_restore create is callable", async () => {
  const temp = await mkdtemp(join(tmpdir(), "gctg-mcp-backup-"));
  const backupPath = join(temp, "backup.json");
  try {
    const { responses } = await mcpRequest(root, [
      { method: "initialize", params: { protocolVersion: "2025-06-18", capabilities: {}, clientInfo: { name: "gctg-recovery-contract", version: "1.0.0" } } },
      { method: "notifications/initialized", params: {} },
      { method: "tools/call", params: { name: "backup_restore", arguments: { operation: "create", backupPath } } }
    ]);
    assert.equal(responses[2].error, undefined);
    const payload = JSON.parse(responses[2].result.content[0].text);
    assert.equal(payload.operation, "create");
    assert.equal(payload.backupPath, backupPath);
    assert.equal(payload.manifest.format, "gctg-backup");
  } finally {
    await rm(temp, { recursive: true, force: true });
  }
});
