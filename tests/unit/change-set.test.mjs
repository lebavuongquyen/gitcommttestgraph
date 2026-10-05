import assert from "node:assert/strict";
import test from "node:test";
import { BranchChangeSetService } from "../../dist/application/change/branch-change-set-service.js";

test("branch change set normalizes ancestry and changed paths", async () => {
  const git = {
    getCurrentBranch: async () => "feature/test",
    getMergeBase: async () => "base123",
    getCommitsBetween: async () => ["commit1", "commit2"],
    getDiff: async () => ({
      fromCommit: "base123",
      toCommit: "head123",
      paths: [{ path: "src/app.ts", status: "modified" }]
    }),
    listBranches: async () => [
      { name: "main", commit: "base123", current: false },
      { name: "feature/test", commit: "head123", current: true }
    ]
  };

  const service = new BranchChangeSetService(git);
  const result = await service.build({ repository: "fixture", base: "main", head: "feature/test" });

  assert.deepEqual(result, {
    repository: "fixture",
    source: "BRANCH",
    base: "main",
    head: "feature/test",
    mergeBase: "base123",
    branch: { name: "feature/test", commit: "head123", current: true },
    commits: ["commit1", "commit2"],
    changedPaths: [{ path: "src/app.ts", status: "modified" }]
  });
});
