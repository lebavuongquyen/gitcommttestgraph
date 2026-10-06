import type { PullRequestProvider, PullRequestContext } from "../../application/ports/pull-request.js";
import { GitOperationError } from "../../domain/errors.js";
import type { PullRequestCheck, PullRequestReviewEvidence, PullRequestReviewState } from "../../domain/pull-request/model.js";
import { sanitizeErrorMessage, validateGitHubApiBase, validateGitHubOwnerRepo } from "../../domain/security/policy.js";

export class GitHubPullRequestProvider implements PullRequestProvider {
  constructor(
    private readonly token = process.env.GITHUB_TOKEN,
    private readonly apiBase = validateGitHubApiBase(process.env.GITHUB_API_URL)
  ) {}

  async get(ownerRepo: string, number: number): Promise<PullRequestContext> {
    try {
      validateGitHubOwnerRepo(ownerRepo);
      if (!Number.isInteger(number) || number < 1) throw new Error("Invalid GitHub pull request identifier");
    } catch {
      throw new Error("Invalid GitHub pull request identifier");
    }
    const headers: Record<string, string> = {
      accept: "application/vnd.github+json",
      "x-github-api-version": "2026-03-10"
    };
    if (this.token) headers.authorization = "Bearer " + this.token;

    const getJson = async (path: string) => {
      let response: Response;
      try {
        response = await fetch(this.apiBase + path, { headers });
      } catch (error) {
        throw new GitOperationError("GitHub pull request lookup failed: network error: " + sanitizeErrorMessage(error), error);
      }
      if (!response.ok) throw new GitOperationError("GitHub pull request lookup failed: " + response.status + " " + response.statusText);
      try {
        return await response.json() as any;
      } catch (error) {
        throw new GitOperationError("GitHub pull request lookup failed: invalid JSON response", error);
      }
    };

    const getAll = async (path: string): Promise<any[]> => {
      const result: any[] = [];
      for (let page = 1; page <= 101; page += 1) {
        const items = await getJson(path + (path.includes("?") ? "&" : "?") + "per_page=100&page=" + page);
        if (!Array.isArray(items)) throw new GitOperationError("GitHub pagination returned a non-array response");
        result.push(...items);
        if (result.length > 10000) throw new GitOperationError("GitHub pagination exceeded safety limit");
        if (items.length < 100) return result;
      }
      throw new GitOperationError("GitHub pagination exceeded safety limit");
    };

    const data = await getJson("/repos/" + ownerRepo + "/pulls/" + number);
    const reviews = await getAll("/repos/" + ownerRepo + "/pulls/" + number + "/reviews");
    const reviewers = [...(Array.isArray(data.requested_reviewers) ? data.requested_reviewers.map((item: any) => item.login).filter(Boolean) : [])];

    const latestByReviewer = new Map<string, PullRequestReviewEvidence>();
    for (const review of reviews) {
      const reviewer = review.user?.login;
      if (!reviewer) continue;
      if (!reviewers.includes(reviewer)) reviewers.push(reviewer);
      const state = ["APPROVED", "CHANGES_REQUESTED", "COMMENTED", "DISMISSED"].includes(review.state)
        ? review.state as PullRequestReviewState
        : "UNKNOWN";
      latestByReviewer.set(reviewer, {
        reviewer,
        state,
        ...(review.commit_id ? { commitId: String(review.commit_id) } : {}),
        ...(review.submitted_at ? { submittedAt: String(review.submitted_at) } : {})
      });
    }

    const reviewEvidence = [...latestByReviewer.values()].sort((a, b) => a.reviewer.localeCompare(b.reviewer));
    const effectiveStates = reviewEvidence.map(review => review.state);
    let reviewState: PullRequestReviewState = "UNKNOWN";
    if (effectiveStates.includes("CHANGES_REQUESTED")) reviewState = "CHANGES_REQUESTED";
    else if (effectiveStates.length && effectiveStates.every(state => state === "DISMISSED")) reviewState = "DISMISSED";
    else if (effectiveStates.includes("APPROVED")) reviewState = "APPROVED";
    else if (effectiveStates.includes("COMMENTED")) reviewState = "COMMENTED";
    else if (reviewers.length) reviewState = "PENDING";

    const approvedAtHead = reviewEvidence.find(review => review.state === "APPROVED" && review.commitId === String(data.head?.sha ?? ""));
    const reviewCommitId = approvedAtHead?.commitId ?? reviewEvidence.find(review => review.state === "APPROVED")?.commitId;

    const checkRuns: any[] = [];
    for (let page = 1; page <= 101; page += 1) {
      const pageData = await getJson("/repos/" + ownerRepo + "/commits/" + String(data.head?.sha ?? "") + "/check-runs?per_page=100&page=" + page);
      if (!pageData || typeof pageData !== "object" || !Array.isArray(pageData.check_runs)) {
        throw new GitOperationError("GitHub check-runs pagination returned an invalid response");
      }
      const pageRuns = pageData.check_runs;
      checkRuns.push(...pageRuns);
      if (checkRuns.length > 10000) throw new GitOperationError("GitHub check-runs pagination exceeded safety limit");
      if (pageRuns.length < 100) break;
    }
    const checks: PullRequestCheck[] = checkRuns.map((item: any) => ({
      name: String(item.name ?? "check"),
      status: item.status === "queued" ? "QUEUED" : item.status === "in_progress" ? "IN_PROGRESS" : item.status === "completed" ? "COMPLETED" : "UNKNOWN",
      ...(item.conclusion ? { conclusion: String(item.conclusion) } : {})
    }));

    const baseSha = String(data.base?.sha ?? "");
    const headSha = String(data.head?.sha ?? "");
    const headRepository = String(data.head?.repo?.full_name ?? ownerRepo);
    if (!baseSha || !headSha || !headRepository) throw new Error("GitHub pull request metadata is missing immutable repository refs");

    return {
      number: Number(data.number),
      title: String(data.title ?? ""),
      ...(data.body ? { body: String(data.body) } : {}),
      ...(data.user?.login ? { author: String(data.user.login) } : {}),
      draft: Boolean(data.draft),
      labels: Array.isArray(data.labels) ? data.labels.map((item: any) => String(item.name ?? "")).filter(Boolean) : [],
      reviewers,
      reviewState,
      ...(reviewCommitId ? { reviewCommitId } : {}),
      reviewEvidence,
      checks,
      ...(typeof data.mergeable === "boolean" ? { mergeable: data.mergeable } : {}),
      ...(data.html_url ? { url: String(data.html_url) } : {}),
      base: String(data.base?.ref ?? ""),
      head: String(data.head?.ref ?? ""),
      baseSha,
      headSha,
      headRepository
    };
  }
}
