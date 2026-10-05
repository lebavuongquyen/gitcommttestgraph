import test from "node:test";
import assert from "node:assert/strict";
import { buildWorkflowExecutionFeedback } from "../../dist/application/workflow/execution-feedback-builder.js";

test("execution feedback maps runtime status back to impacted tests and symbols", () => {
  const plan = {
    schemaVersion: 1,
    workflow: "git-code-test-impact",
    repository: "repo",
    commit: "c1",
    steps: [
      {
        id: "step-a",
        nodeId: "test-project:a",
        kind: "test",
        status: "RUNNABLE",
        command: { executable: "test-a", args: [], cwd: "." },
        dependsOn: [],
        affectedTestCaseIds: ["case-a", "case-b"],
        affectedSymbolIds: ["symbol-a"],
        evidence: []
      },
      {
        id: "step-b",
        nodeId: "test-project:b",
        kind: "test",
        status: "RUNNABLE",
        command: { executable: "test-b", args: [], cwd: "." },
        dependsOn: [],
        affectedTestCaseIds: ["case-c"],
        affectedSymbolIds: ["symbol-b"],
        evidence: []
      }
    ]
  };
  const result = {
    schemaVersion: 1,
    workflow: "git-code-test-impact",
    repository: "repo",
    commit: "c1",
    startedAt: "2026-10-05T10:00:00.000Z",
    finishedAt: "2026-10-05T10:01:00.000Z",
    passed: false,
    steps: [
      { stepId: "step-a", status: "PASSED", testCaseIds: ["case-a", "case-b"], affectedSymbolIds: ["symbol-a"], startedAt: "2026-10-05T10:00:00.000Z", finishedAt: "2026-10-05T10:00:30.000Z" },
      { stepId: "step-b", status: "FAILED", testCaseIds: ["case-c"], affectedSymbolIds: ["symbol-b"], startedAt: "2026-10-05T10:00:30.000Z", finishedAt: "2026-10-05T10:01:00.000Z" }
    ]
  };
  const feedback = buildWorkflowExecutionFeedback(plan, result);
  assert.equal(feedback.passed, false);
  assert.deepEqual(feedback.passedTestCases, ["case-a", "case-b"]);
  assert.deepEqual(feedback.failedTestCases, ["case-c"]);
  assert.deepEqual(feedback.affectedSymbolsWithPassingTests, ["symbol-a"]);
  assert.deepEqual(feedback.affectedSymbolsWithFailingTests, ["symbol-b"]);
  assert.equal(feedback.items.length, 2);
});
