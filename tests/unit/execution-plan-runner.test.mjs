import test from "node:test";
import assert from "node:assert/strict";
import { ExecutionPlanRunner } from "../../dist/application/workflow/execution-plan-runner.js";

test("runner executes runnable steps in dependency order", async () => {
  const calls = [];
  const runner = new ExecutionPlanRunner({
    async run(command) {
      calls.push(command.executable);
      return { exitCode: 0, stdout: "ok", stderr: "" };
    }
  });
  const plan = {
    schemaVersion: 1,
    workflow: "git-code-test-impact",
    repository: "repo",
    commit: "c1",
    steps: [
      { id: "a", nodeId: "a", kind: "test", status: "RUNNABLE", command: { executable: "test-a", args: [], cwd: "." }, dependsOn: [], affectedTestCaseIds: [], affectedSymbolIds: [], evidence: [] },
      { id: "b", nodeId: "b", kind: "test", status: "RUNNABLE", command: { executable: "test-b", args: [], cwd: "." }, dependsOn: ["a"], affectedTestCaseIds: [], affectedSymbolIds: [], evidence: [] }
    ]
  };
  const result = await runner.execute(plan);
  assert.equal(result.passed, true);
  assert.deepEqual(calls, ["test-a", "test-b"]);
  assert.deepEqual(result.steps.map(step => step.status), ["PASSED", "PASSED"]);
});

test("runner blocks dependent steps after a failure", async () => {
  const runner = new ExecutionPlanRunner({
    async run() {
      return { exitCode: 1, stdout: "", stderr: "failed" };
    }
  });
  const plan = {
    schemaVersion: 1,
    workflow: "git-code-test-impact",
    repository: "repo",
    commit: "c1",
    steps: [
      { id: "a", nodeId: "a", kind: "test", status: "RUNNABLE", command: { executable: "test-a", args: [], cwd: "." }, dependsOn: [], affectedTestCaseIds: [], affectedSymbolIds: [], evidence: [] },
      { id: "b", nodeId: "b", kind: "test", status: "RUNNABLE", command: { executable: "test-b", args: [], cwd: "." }, dependsOn: ["a"], affectedTestCaseIds: [], affectedSymbolIds: [], evidence: [] }
    ]
  };
  const result = await runner.execute(plan);
  assert.equal(result.passed, false);
  assert.deepEqual(result.steps.map(step => step.status), ["FAILED", "SKIPPED"]);
});
