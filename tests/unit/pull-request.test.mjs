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
  reviewCommitId: "head-sha",
  reviewEvidence: [{ reviewer: "reviewer", state: "APPROVED", commitId: "head-sha" }],
  checks: [{ name: "ci", status: "COMPLETED", conclusion: "SUCCESS" }],
  baseSha: "base-sha",
  headSha: "head-sha",
  headRepository: "acme/app"
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

test("GitHub provider resolves effective review state, immutable refs and paginated reviews", async () => {
  const original = globalThis.fetch;
  const requests = [];
  globalThis.fetch = async url => {
    requests.push(String(url));
    if (String(url).includes("/pulls/7") && !String(url).includes("/reviews")) {
      return { ok: true, json: async () => ({ number: 7, title: "Improve checkout", body: "desc", draft: true, user: { login: "author" }, labels: [{ name: "feature" }], requested_reviewers: [{ login: "requested" }], mergeable: true, html_url: "https://github.com/acme/app/pull/7", base: { ref: "main", sha: "base-sha" }, head: { ref: "feature", sha: "head-sha", repo: { full_name: "acme/app" } } }) };
    }
    if (String(url).includes("/reviews?") && new URL(String(url)).searchParams.get("page") === "1") {
      const reviews = Array.from({ length: 100 }, (_, index) => ({ user: { login: "reviewer-" + index }, state: index === 0 ? "CHANGES_REQUESTED" : "COMMENTED", commit_id: "old" }));
      reviews[0] = { user: { login: "reviewed" }, state: "CHANGES_REQUESTED", commit_id: "old" };
      return { ok: true, json: async () => reviews };
    }
    if (String(url).includes("/reviews?") && new URL(String(url)).searchParams.get("page") === "2") {
      return { ok: true, json: async () => [{ user: { login: "reviewed" }, state: "APPROVED", commit_id: "head-sha" }] };
    }
    if (String(url).includes("/check-runs?") && new URL(String(url)).searchParams.get("page") === "1") {
      return { ok: true, json: async () => ({ check_runs: [{ name: "ci", status: "completed", conclusion: "SUCCESS" }] }) };
    }
    if (String(url).includes("/check-runs?") && new URL(String(url)).searchParams.get("page") === "2") {
      return { ok: true, json: async () => ({ check_runs: [] }) };
    }
    throw new Error("Unexpected GitHub request: " + url);
  };
  try {
    const result = await new GitHubPullRequestProvider("token").get("acme/app", 7);
    assert.equal(result.number, 7);
    assert.equal(result.baseSha, "base-sha");
    assert.equal(result.headSha, "head-sha");
    assert.equal(result.headRepository, "acme/app");
    assert.equal(result.reviewState, "APPROVED");
    assert.equal(result.reviewCommitId, "head-sha");
    assert.equal(result.reviewEvidence.find(item => item.reviewer === "reviewed")?.state, "APPROVED");
    assert.equal(result.checks[0].conclusion, "SUCCESS");
    assert.equal(requests.filter(url => url.includes("/reviews?")).length, 2);
  } finally {
    globalThis.fetch = original;
  }
});

test("GitHub provider rejects invalid repository identifiers", async () => {
  await assert.rejects(() => new GitHubPullRequestProvider("token").get("acme/app/unsafe", 7), /Invalid GitHub pull request identifier/);
});

test("pull request review resolves downstream consumers of removed symbols from the base graph", () => {
  const changeSet = {
    repository: "fixture", source: "PULL_REQUEST", base: "base", head: "head", mergeBase: "base",
    commits: ["c1"], changedPaths: [{ path: "src/app.ts", status: "deleted" }], pullRequestNumber: 7, title: "Remove legacy service"
  };
  const base = {
    repository: "fixture",
    commit: "base",
    nodes: [
      { id: "removed", type: "Symbol", label: "removed", attributes: {} },
      { id: "consumer", type: "Symbol", label: "consumer", attributes: {} }
    ],
    edges: [{ id: "e1", source: "consumer", target: "removed", type: "CALLS", confidence: "EXACT", evidence: [], sourceCommit: "base" }]
  };
  const current = {
    repository: "fixture",
    commit: "head",
    nodes: [{ id: "consumer", type: "Symbol", label: "consumer", attributes: {} }],
    edges: []
  };
  const review = new PullRequestReviewService().analyze({
    changeSet,
    pullRequest: metadata,
    current,
    base,
    changedSymbolIds: [],
    removedSymbolIds: ["removed"]
  });
  assert.ok(review.affectedSymbolIds.includes("consumer"));
  assert.ok(review.reasons.some(reason => reason.includes("downstream symbols depend on removed symbols")));
  assert.equal(review.decision, "HIGH_RISK");
});

test("pull request approval on an older head requires review", () => {
  const changeSet = {
    repository: "fixture", source: "PULL_REQUEST", base: "base", head: "head-sha", mergeBase: "base",
    commits: ["c1"], changedPaths: [], pullRequestNumber: 7, title: "Change"
  };
  const review = new PullRequestReviewService().analyze({
    changeSet,
    pullRequest: { ...metadata, reviewCommitId: "old-sha" },
    current: snapshot(),
    changedSymbolIds: ["changed"]
  });
  assert.equal(review.decision, "NEEDS_REVIEW");
  assert.ok(review.uncertainty.some(item => item.includes("older pull request head")));
});
