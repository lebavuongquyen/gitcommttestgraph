import type { PullRequestProvider, PullRequestContext } from "../../application/ports/pull-request.js";
import type { PullRequestCheck, PullRequestReviewState } from "../../domain/pull-request/model.js";

export class GitHubPullRequestProvider implements PullRequestProvider {
  constructor(
    private readonly token = process.env.GITHUB_TOKEN,
    private readonly apiBase = process.env.GITHUB_API_URL ?? "https://api.github.com"
  ) {}

  async get(ownerRepo: string, number: number): Promise<PullRequestContext> {
    const headers: Record<string, string> = {
      accept: "application/vnd.github+json",
      "x-github-api-version": "2026-03-10"
    };
    if (this.token) headers.authorization = "Bearer " + this.token;
    const getJson = async (path: string) => {
      const response = await fetch(this.apiBase + path, { headers });
      if (!response.ok) throw new Error("GitHub pull request lookup failed: " + response.status + " " + response.statusText);
      return response.json() as Promise<any>;
    };
    const data = await getJson("/repos/" + ownerRepo + "/pulls/" + number);
    const reviews = await getJson("/repos/" + ownerRepo + "/pulls/" + number + "/reviews");
    const reviewers = [...(Array.isArray(data.requested_reviewers) ? data.requested_reviewers.map((item: any) => item.login).filter(Boolean) : [])];
    let reviewState: PullRequestReviewState = "UNKNOWN";
    for (const review of Array.isArray(reviews) ? reviews : []) {
      if (review.user?.login && !reviewers.includes(review.user.login)) reviewers.push(review.user.login);
      if (review.state === "CHANGES_REQUESTED") reviewState = "CHANGES_REQUESTED";
      else if (review.state === "APPROVED" && reviewState !== "CHANGES_REQUESTED") reviewState = "APPROVED";
      else if (review.state === "COMMENTED" && reviewState === "UNKNOWN") reviewState = "COMMENTED";
    }
    if (!reviews?.length && reviewers.length) reviewState = "PENDING";

    const checksData = await getJson("/repos/" + ownerRepo + "/commits/" + String(data.head?.sha ?? "") + "/check-runs");
    const checks: PullRequestCheck[] = Array.isArray(checksData?.check_runs)
      ? checksData.check_runs.map((item: any) => ({
          name: String(item.name ?? "check"),
          status: item.status === "queued" ? "QUEUED" : item.status === "in_progress" ? "IN_PROGRESS" : item.status === "completed" ? "COMPLETED" : "UNKNOWN",
          ...(item.conclusion ? { conclusion: String(item.conclusion) } : {})
        }))
      : [];

    return {
      number: Number(data.number),
      title: String(data.title ?? ""),
      ...(data.body ? { body: String(data.body) } : {}),
      ...(data.user?.login ? { author: String(data.user.login) } : {}),
      draft: Boolean(data.draft),
      labels: Array.isArray(data.labels) ? data.labels.map((item: any) => String(item.name ?? "")).filter(Boolean) : [],
      reviewers,
      reviewState,
      checks,
      ...(typeof data.mergeable === "boolean" ? { mergeable: data.mergeable } : {}),
      ...(data.html_url ? { url: String(data.html_url) } : {}),
      base: String(data.base?.ref ?? ""),
      head: String(data.head?.ref ?? ""),
      ...(data.head?.repo?.full_name ? { headRepository: String(data.head.repo.full_name) } : {})
    };
  }
}
