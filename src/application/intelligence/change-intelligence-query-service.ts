import type { GitRepositoryPort } from "../ports/git.js";
import type { GraphSnapshot } from "../../domain/graph/model.js";
import type { PullRequestMetadata } from "../../domain/pull-request/model.js";
import { BranchChangeSetService } from "../change/branch-change-set-service.js";
import { PullRequestChangeSetService } from "../change/pull-request-change-set-service.js";
import { ChangeIntelligenceService, commitChangeSet } from "./change-intelligence-service.js";
import type { ChangeIntelligenceResult } from "../../domain/change-intelligence.js";

export interface SnapshotIndexer {
  index(commit: string): Promise<{ snapshot: GraphSnapshot }>;
}

export interface ChangeIntelligenceQueryRequest {
  readonly source?: "COMMIT" | "BRANCH" | "PULL_REQUEST";
  readonly commit?: string;
  readonly base?: string;
  readonly head?: string;
  readonly pullRequest?: PullRequestMetadata;
}

export class ChangeIntelligenceQueryService {
  constructor(
    private readonly repository: string,
    private readonly git: GitRepositoryPort,
    private readonly indexer: SnapshotIndexer,
    private readonly analyzer = new ChangeIntelligenceService()
  ) {}

  async analyze(request: ChangeIntelligenceQueryRequest = {}): Promise<ChangeIntelligenceResult> {
    const source = request.source ?? "COMMIT";
    if (source === "COMMIT") return this.analyzeCommit(request.commit);
    if (source === "BRANCH") return this.analyzeBranch(request.base, request.head);
    if (!request.pullRequest) throw new Error("Pull request metadata is required for PULL_REQUEST intelligence");
    return this.analyzePullRequest(request.pullRequest);
  }

  private async analyzeCommit(commit?: string): Promise<ChangeIntelligenceResult> {
    const head = commit ?? await this.git.getHead();
    const info = await this.git.getCommit(head);
    const parent = info.parents[0];
    if (!parent) {
      const snapshot = await this.indexer.index(head);
      const source = commitChangeSet(this.repository, head, head, [{ path: "", status: "added" }], [{
        commit: head,
        subject: info.message,
        changedPaths: [{ path: "", status: "added" }]
      }]);
      return this.analyzer.analyze({ source, baseSnapshot: snapshot.snapshot, headSnapshot: snapshot.snapshot });
    }
    const [baseSnapshot, headSnapshot] = await Promise.all([this.indexer.index(parent), this.indexer.index(head)]);
    const diff = await this.git.getDiff(parent, head);
    const source = commitChangeSet(this.repository, head, parent, diff.paths, [{
      commit: head,
      subject: info.message,
      changedPaths: await this.git.getChangedPaths(head)
    }]);
    return this.analyzer.analyze({ source, baseSnapshot: baseSnapshot.snapshot, headSnapshot: headSnapshot.snapshot });
  }

  private async analyzeBranch(base?: string, head?: string): Promise<ChangeIntelligenceResult> {
    if (!base) throw new Error("Base branch is required for BRANCH intelligence");
    const source = await new BranchChangeSetService(this.git).build({ repository: this.repository, base, ...(head ? { head } : {}) });
    const [baseSnapshot, headSnapshot] = await Promise.all([this.indexer.index(source.mergeBase), this.indexer.index(source.head)]);
    return this.analyzer.analyze({ source, baseSnapshot: baseSnapshot.snapshot, headSnapshot: headSnapshot.snapshot });
  }

  private async analyzePullRequest(pullRequest: PullRequestMetadata): Promise<ChangeIntelligenceResult> {
    await this.git.ensureCommit(pullRequest.baseSha);
    await this.git.ensureCommit(pullRequest.headSha);
    const source = await new PullRequestChangeSetService(this.git).build({
      repository: this.repository,
      pullRequest,
      base: pullRequest.baseSha,
      head: pullRequest.headSha
    });
    const [baseSnapshot, headSnapshot] = await Promise.all([this.indexer.index(source.mergeBase), this.indexer.index(source.head)]);
    return this.analyzer.analyze({ source, baseSnapshot: baseSnapshot.snapshot, headSnapshot: headSnapshot.snapshot });
  }
}
