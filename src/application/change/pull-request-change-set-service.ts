import type { PullRequestChangeSet, CommitChangeEvidence } from "../../domain/change-set.js";
import type { PullRequestMetadata } from "../../domain/pull-request/model.js";
import type { GitRepositoryPort } from "../ports/git.js";

export interface PullRequestChangeSetRequest {
  readonly repository: string;
  readonly pullRequest: PullRequestMetadata;
  readonly base: string;
  readonly head: string;
}

export class PullRequestChangeSetService {
  constructor(private readonly git: GitRepositoryPort) {}

  async build(request: PullRequestChangeSetRequest): Promise<PullRequestChangeSet> {
    const mergeBase = await this.git.getMergeBase(request.base, request.head);
    const commits = await this.git.getCommitsBetween(mergeBase, request.head);
    const diff = await this.git.getDiff(mergeBase, request.head);
    const commitEvidence: CommitChangeEvidence[] = [];
    for (const commit of commits) {
      const info = await this.git.getCommit(commit);
      commitEvidence.push({
        commit,
        subject: info.message,
        changedPaths: await this.git.getChangedPaths(commit)
      });
    }
    return {
      repository: request.repository,
      source: "PULL_REQUEST",
      base: request.base,
      head: request.head,
      mergeBase,
      commits,
      changedPaths: diff.paths,
      commitEvidence,
      pullRequestNumber: request.pullRequest.number,
      title: request.pullRequest.title
    };
  }
}
