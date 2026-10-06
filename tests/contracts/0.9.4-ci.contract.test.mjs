import test from "node:test";
import assert from "node:assert/strict";
import { CiAnalysisService } from "../../dist/index.js";

const intelligence = {
  schemaVersion: 1,
  deterministic: true,
  intelligence: {
    schemaVersion: 1,
    source: { source: "COMMIT", repository: "repo", base: "a", head: "b", mergeBase: "a", changedPaths: [], commits: [] },
    base: "a", head: "b", mergeBase: "a", changedPathCount: 2, changedPaths: [],
    commits: ["b"], diff: { addedNodes: [], removedNodes: [], changedNodes: [] },
    changedSymbolIds: ["s1"], removedSymbolIds: [], impact: [], affectedSymbolIds: [],
    testGaps: { schemaVersion: 1, totalChangedNodes: 1, coveredChangedNodes: 1, uncoveredChangedNodes: 0, gaps: [], coverageLinks: [] },
    testImpact: { schemaVersion: 1, changedSymbolIds: ["s1"], impacts: [], impactedTestCases: 0, impactedTestProjects: 0 },
    executionPlan: { schemaVersion: 1, repository: "repo", commit: "b", steps: [] },
    risk: "HIGH", reasons: ["high risk change"], uncertainty: [], evidence: []
  }
};

test("0.9.4 CI maps high risk to FAIL and exit 1", () => {
  const result = new CiAnalysisService().analyze(intelligence);
  assert.equal(result.status, "FAIL");
  assert.equal(result.exitCode, 1);
  assert.equal(result.changedSymbolCount, 1);
});

test("0.9.4 CI JSON is deterministic", () => {
  const service = new CiAnalysisService();
  assert.equal(service.serialize(service.analyze(intelligence), "json"), service.serialize(service.analyze(intelligence), "json"));
});

test("0.9.4 CI emits SARIF", () => {
  const result = new CiAnalysisService().analyze(intelligence);
  const sarif = JSON.parse(new CiAnalysisService().serialize(result, "sarif"));
  assert.equal(sarif.version, "2.1.0");
  assert.equal(sarif.runs[0].tool.driver.name, "git-commit-test-graph");
});
