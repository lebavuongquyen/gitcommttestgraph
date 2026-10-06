import test from "node:test";
import assert from "node:assert/strict";
import { ReachabilityService } from "../../dist/index.js";

test("reachability protects commits reachable from a branch", async () => {
  const service = new ReachabilityService({
    listBranches: async () => [
      { name: "main", commit: "tip", current: true }
    ],
    getMergeBase: async (commit, branch) => commit === "base" && branch === "tip" ? "base" : "other"
  });

  const result = await service.analyze({ commits: ["base", "orphan"] });
  assert.equal(result[0].protected, true);
  assert.equal(result[0].reachable, true);
  assert.match(result[0].reasons[0], /reachable from branch main/);
  assert.equal(result[1].protected, false);
});

test("explicit protection evidence wins even without branch reachability", async () => {
  const service = new ReachabilityService({
    listBranches: async () => [],
    getMergeBase: async () => { throw new Error("unavailable"); }
  });

  const result = await service.analyze({ commits: ["orphan"], protectedCommits: ["orphan"] });
  assert.equal(result[0].protected, true);
  assert.equal(result[0].reachable, false);
  assert.deepEqual(result[0].reasons, ["explicit protected evidence"]);
});

test("duplicate commits are removed and output is deterministic", async () => {
  const service = new ReachabilityService({
    listBranches: async () => [],
    getMergeBase: async () => "other"
  });

  const result = await service.analyze({ commits: ["z", "a", "z"] });
  assert.deepEqual(result.map(item => item.commit), ["a", "z"]);
});
