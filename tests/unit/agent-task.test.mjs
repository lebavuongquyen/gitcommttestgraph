import assert from "node:assert/strict";
import test from "node:test";
import { createSnapshot, NodeType, AgentTaskService } from "../../dist/index.js";

const n = (id, type, attributes = {}) => ({ id, type, attributes });

test("agent task produces inconclusive read-only decision with explicit uncertainty", () => {
  const snapshot = createSnapshot({
    analyzerVersion: "test", repository: "repo", commit: "c1", configuration: {},
    nodes: [
      n("project", NodeType.TEST_PROJECT, { framework: "generic-script", packageId: "pkg" }),
      n("file", NodeType.FILE, { path: "src/a.ts", packageId: "pkg" }),
      n("symbol", NodeType.SYMBOL, { fileId: "file", name: "a", kind: "function" })
    ],
    edges: []
  });
  const result = new AgentTaskService().analyze({
    taskId: "task-1",
    goal: "Determine merge safety",
    repository: "repo",
    commit: "c1",
    current: snapshot,
    changedSymbolIds: ["symbol"],
    policy: {
      allowExecution: false,
      requireAllImpactedTests: true,
      failOnUnknown: false,
      failOnNoCommand: false,
      maxExecutionSteps: 5
    }
  });
  assert.equal(result.taskId, "task-1");
  assert.equal(result.decision, "INCONCLUSIVE");
  assert.match(result.uncertainty[0], /Runtime execution was not authorized/);
  assert.ok(result.executionPlan);
});

test("agent task refuses execution without explicit authorization", async () => {
  const snapshot = createSnapshot({
    analyzerVersion: "test", repository: "repo", commit: "c2", configuration: {},
    nodes: [n("file", NodeType.FILE, { path: "src/a.ts" }), n("symbol", NodeType.SYMBOL, { fileId: "file", name: "a", kind: "function" })],
    edges: []
  });
  const service = new AgentTaskService();
  service.analyze({
    taskId: "task-2", goal: "test", repository: "repo", commit: "c2", current: snapshot, changedSymbolIds: ["symbol"],
    policy: { allowExecution: false, requireAllImpactedTests: true, failOnUnknown: false, failOnNoCommand: false, maxExecutionSteps: 5 }
  });
  await assert.rejects(() => service.execute("task-2", { run: async () => ({ exitCode: 0, stdout: "", stderr: "" }) }), /not authorized/);
});
