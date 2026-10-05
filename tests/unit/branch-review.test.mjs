import assert from "node:assert/strict";
import test from "node:test";
import { BranchReviewService } from "../../dist/application/review/branch-review-service.js";

function snapshot() {
  return {
    repository: "fixture",
    commit: "head",
    nodes: [
      { id: "changed", type: "Symbol", label: "changed", attributes: {} },
      { id: "affected", type: "Symbol", label: "affected", attributes: {} },
      { id: "test", type: "TestCase", label: "test", attributes: {} },
      { id: "project", type: "TestProject", label: "project", attributes: {} }
    ],
    edges: [
      { id: "e1", source: "changed", target: "affected", relation: "CALLS", evidence: [] },
      { id: "e2", source: "test", target: "changed", relation: "TESTS", evidence: [] }
    ]
  };
}

const changeSet = {
  repository: "fixture",
  source: "BRANCH",
  base: "main",
  head: "feature/test",
  mergeBase: "base",
  branch: { name: "feature/test", commit: "head", current: true },
  commits: ["head"],
  changedPaths: [{ path: "src/app.ts", status: "modified" }]
};

test("branch review returns structured decision with impact and execution evidence", () => {
  const review = new BranchReviewService().analyze({
    changeSet,
    current: snapshot(),
    changedSymbolIds: ["changed"]
  });

  assert.equal(review.schemaVersion, 1);
  assert.ok(["READY", "NEEDS_REVIEW", "HIGH_RISK", "INCONCLUSIVE"].includes(review.decision));
  assert.equal(review.changeSet.head, "feature/test");
  assert.deepEqual(review.changedSymbolIds, ["changed"]);
  assert.ok(Array.isArray(review.affectedSymbolIds));
  assert.ok(review.testImpact);
  assert.ok(review.testGaps);
  assert.ok(review.executionPlan);
});
