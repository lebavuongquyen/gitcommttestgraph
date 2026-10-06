import assert from "node:assert/strict";
import test from "node:test";
import { PullRequestChangeSetService } from "../../dist/application/change/pull-request-change-set-service.js";
import { PullRequestReviewService } from "../../dist/application/review/pull-request-review-service.js";
import { GitHubPullRequestProvider } from "../../dist/adapters/pull-request/github.js";

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

const metadata = {
  number: 7,
  title: "Improve checkout",
  draft: false,
  labels: ["feature"],
  reviewers: ["reviewer"],
  reviewState: "APPROVED",
  checks: [{ name: "ci", status: "COMPLETED", conclusion: "SUCCESS" }]
};

test("pull request change set preserves PR identity and commit evidence", async () => {
  const git = {
    getMergeBase: async () => "base",
    getCommitsBetween: async () => ["c1"],
    getDiff: async () => ({ fromCommit: "base", toCommit: "head", paths: [{ path: "src/app.ts", status: "modified" }] }),
    getCommit: async hash => ({ hash, parents: [], author: "a", committer: "c", timestamp: "2026-01-01T00:00:00Z", message: "change" }),
    getChangedPaths: async () => [{ path: "src/app.ts", status: "modified" }]
  };
  const result = await new PullRequestChangeSetService(git).build({ repository: "fixture", pullRequest: metadata, base: "main", head: "feature" });
  assert.equal(result.source, "PULL_REQUEST");
  assert.equal(result.pullRequestNumber, 7);
  assert.equal(result.title, "Improve checkout");
  assert.equal(result.mergeBase, "base");
  assert.equal(result.commits.length, 1);
});

test("pull request review blocks a reported merge conflict", () => {
  const changeSet = {
    repository: "fixture", source: "PULL_REQUEST", base: "main", head: "feature", mergeBase: "base",
    commits: ["c1"], changedPaths: [], pullRequestNumber: 7, title: "Improve checkout"
  };
  const review = new PullRequestReviewService().analyze({
    changeSet,
    pullRequest: { ...metadata, mergeable: false },
    current: snapshot(),
    changedSymbolIds: ["changed"]
  });
  assert.equal(review.decision, "BLOCKED");
  assert.equal(review.risk, "HIGH");
});

test("GitHub provider maps pull request metadata and reviewers", async () => {
  const original = globalThis.fetch;
  const responses = [
    { ok: true, json: async () => ({ number: 7, title: "Improve checkout", body: "desc", draft: true, user: { login: "author" }, labels: [{ name: "feature" }], requested_reviewers: [{ login: "requested" }], mergeable: true, html_url: "https://github.com/acme/app/pull/7", base: { ref: "main" }, head: { ref: "feature", repo: { full_name: "acme/app" } } }) },
    { ok: true, json: async () => [{ user: { login: "reviewed" }, state: "COMMENTED" }] },
    { ok: true, json: async () => ({ check_runs: [{ name: "ci", status: "completed", conclusion: "SUCCESS" }] }) }
  ];
  globalThis.fetch = async () => responses.shift();
  try {
    const result = await new GitHubPullRequestProvider("token").get("acme/app", 7);
    assert.equal(result.number, 7);
    assert.equal(result.base, "main");
    assert.equal(result.head, "feature");
    assert.equal(result.draft, true);
    assert.equal(result.reviewState, "COMMENTED");
    assert.equal(result.checks[0].conclusion, "SUCCESS");
    assert.deepEqual(result.reviewers, ["requested", "reviewed"]);
  } finally {
    globalThis.fetch = original;
  }
});
