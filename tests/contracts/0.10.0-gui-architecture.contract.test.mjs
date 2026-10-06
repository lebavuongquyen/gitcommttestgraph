import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

const appPath = new URL("../../src/gui/app.ts", import.meta.url);
const clientPath = new URL("../../src/gui/client.ts", import.meta.url);

test("0.10 R05 GUI renderer is presentation-shell only", async () => {
  const source = await readFile(appPath, "utf8");
  assert.match(source, /import \{ GUI_CLIENT_SCRIPT \} from "\.\/client\.js";/);
  assert.doesNotMatch(source, /from ["']\.\.\/(?:application|domain|infrastructure)\//);
  assert.doesNotMatch(source, /\/api\//);
  assert.doesNotMatch(source, /new (?:ImpactEngine|TestGapAnalyzer|TestImpactAnalyzer|BranchReviewService|PullRequestReviewService|ChangeIntelligenceQueryService|DiagnosticsService|HistoricalIntelligenceService)/);
});

test("0.10 R05 GUI browser controller is isolated from application and infrastructure modules", async () => {
  const source = await readFile(clientPath, "utf8");
  assert.doesNotMatch(source, /from ["']\.\.\/(?:application|domain|infrastructure)\//);
  assert.doesNotMatch(source, /(?:ImpactEngine|TestGapAnalyzer|TestImpactAnalyzer|BranchReviewService|PullRequestReviewService|ChangeIntelligenceQueryService|DiagnosticsService|HistoricalIntelligenceService)/);
  assert.match(source, /guiCapabilityContracts/);
  assert.match(source, /GUI_BROWSER_CAPABILITIES/);
  assert.doesNotMatch(source, /\/api\//);
});

test("0.10 R05 GUI boundary keeps API orchestration in the browser controller", async () => {
  const app = await readFile(appPath, "utf8");
  const client = await readFile(clientPath, "utf8");
  const apiCount = (client.match(/api\(capability\(/g) ?? []).length;
  assert.ok(apiCount >= 10);
  assert.equal((app.match(/\/api\//g) ?? []).length, 0);
});
