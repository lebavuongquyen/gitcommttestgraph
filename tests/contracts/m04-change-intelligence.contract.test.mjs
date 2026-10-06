import assert from "node:assert/strict";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { runCli, withHttpServer, mcpRequest } from "./helpers.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");

function semantic(value) {
  const i = value.intelligence ?? value;
  return {
    schemaVersion: i.schemaVersion,
    source: i.source.source,
    base: i.base,
    head: i.head,
    mergeBase: i.mergeBase,
    changedPathCount: i.changedPathCount,
    changedPaths: i.changedPaths,
    commits: i.commits,
    changedSymbolIds: i.changedSymbolIds,
    removedSymbolIds: i.removedSymbolIds,
    affectedSymbolIds: i.affectedSymbolIds,
    risk: i.risk,
    testGaps: {
      tested: i.testGaps.tested,
      indirectlyTested: i.testGaps.indirectlyTested,
      untested: i.testGaps.untested,
      unknown: i.testGaps.unknown
    },
    testImpact: {
      changedSymbols: i.testImpact.changedSymbols,
      affectedSymbols: i.testImpact.affectedSymbols,
      impactedTestCases: i.testImpact.impactedTestCases,
      impactedTestFiles: i.testImpact.impactedTestFiles,
      impactedTestProjects: i.testImpact.impactedTestProjects
    },
    executionSteps: (i.executionPlan.steps ?? []).map(step => ({
      id: step.id,
      status: step.status,
      affectedTestCaseIds: step.affectedTestCaseIds
    })),
    reasons: i.reasons,
    uncertainty: i.uncertainty
  };
}

test("M04 CLI gate: change-intelligence exposes the unified contract", async () => {
  const result = await runCli(root, ["change-intelligence"]);
  assert.equal(result.code, 0, result.stderr);
  const value = JSON.parse(result.stdout);
  assert.equal(value.schemaVersion, 1);
  assert.equal(value.deterministic, true);
  assert.equal(value.intelligence.schemaVersion, 1);
  assert.ok(["LOW", "MEDIUM", "HIGH", "UNKNOWN"].includes(value.intelligence.risk));
});

test("M04 HTTP gate: change-intelligence exposes the same semantic contract", async () => {
  await withHttpServer(root, 37874, async base => {
    const response = await fetch(base + "/api/change-intelligence");
    assert.equal(response.status, 200);
    const value = await response.json();
    assert.equal(value.schemaVersion, 1);
    assert.equal(value.deterministic, true);
    assert.equal(value.intelligence.schemaVersion, 1);
  });
});

test("M04 MCP gate: change_intelligence exposes the unified contract", async () => {
  const { responses } = await mcpRequest(root, [
    { method: "initialize", params: { protocolVersion: "2025-06-18", capabilities: {}, clientInfo: { name: "m04-contract-test", version: "1.0.0" } } },
    { method: "notifications/initialized", params: {} },
    { method: "tools/call", params: { name: "change_intelligence", arguments: { source: "COMMIT" } } }
  ]);
  assert.equal(responses[2].error, undefined);
  const value = JSON.parse(responses[2].result.content[0].text);
  assert.equal(value.schemaVersion, 1);
  assert.equal(value.deterministic, true);
});

test("M04 cross-surface gate: CLI, HTTP and MCP preserve equivalent semantics", async () => {
  const cli = JSON.parse((await runCli(root, ["change-intelligence"])).stdout);
  let http;
  await withHttpServer(root, 37875, async base => {
    http = await (await fetch(base + "/api/change-intelligence")).json();
  });
  const { responses } = await mcpRequest(root, [
    { method: "initialize", params: { protocolVersion: "2025-06-18", capabilities: {}, clientInfo: { name: "m04-cross-surface", version: "1.0.0" } } },
    { method: "notifications/initialized", params: {} },
    { method: "tools/call", params: { name: "change_intelligence", arguments: { source: "COMMIT" } } }
  ]);
  const mcp = JSON.parse(responses[2].result.content[0].text);
  assert.deepEqual(semantic(cli), semantic(http));
  assert.deepEqual(semantic(cli), semantic(mcp));
});

test("M04 GUI gate: the real GUI references the unified intelligence endpoint", async () => {
  await withHttpServer(root, 37876, async base => {
    const response = await fetch(base + "/");
    assert.equal(response.status, 200);
    const html = await response.text();
    assert.match(html, /change-intelligence/);
    assert.match(html, /Change Intelligence/);
    const api = await fetch(base + "/api/change-intelligence");
    assert.equal(api.status, 200);
  });
});
