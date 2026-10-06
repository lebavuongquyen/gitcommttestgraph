import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import { capabilityRegistry, validateCapabilityConformance } from "../../dist/application/capabilities/capability-registry.js";

const paths = {
  GUI: "../../src/gui/app.ts",
  MCP: "../../src/mcp/server.ts",
  CLI: "../../bin/gctg.mjs",
  HTTP: "../../src/infrastructure/http/server.ts",
  PUBLIC_API: "../../src/public/index.ts"
};

test("0.10 capability registry has unique identities", () => {
  const ids = capabilityRegistry.map(capability => capability.id);
  assert.equal(new Set(ids).size, ids.length);
  assert.ok(ids.includes("test_gaps"));
});

test("0.10 capability registry conforms across declared surfaces", async () => {
  const sources = {};
  for (const [surface, path] of Object.entries(paths)) sources[surface] = await readFile(new URL(path, import.meta.url), "utf8");
  sources.GUI += "\n" + await readFile(new URL("../../src/gui/client.ts", import.meta.url), "utf8");
  const failures = validateCapabilityConformance(sources);
  assert.deepEqual(failures, []);
});
