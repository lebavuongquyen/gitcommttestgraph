import type { BranchChangeSet } from "../../domain/change-set.js";
import type { GitRepositoryPort } from "../ports/git.js";

export interface BranchChangeSetRequest {
  readonly repository: string;
  readonly base: string;
  readonly head?: string;
}

export class BranchChangeSetService {
  constructor(private readonly git: GitRepositoryPort) {}

  async build(request: BranchChangeSetRequest): Promise<BranchChangeSet> {
    const head = request.head ?? await this.git.getCurrentBranch();
    if (!head) {
      throw new Error("Cannot build branch change set without a branch head");
    }

    const mergeBase = await this.git.getMergeBase(request.base, head);
    const commits = await this.git.getCommitsBetween(request.base, head);
    const diff = await this.git.getDiff(mergeBase, head);
    const branches = await this.git.listBranches();
    const branch = branches.find(item => item.name === head);

    if (!branch) {
      throw new Error(`Git branch not found: ${head}`);
    }

    return {
      repository: request.repository,
      source: "BRANCH",
      base: request.base,
      head,
      mergeBase,
      branch,
      commits,
      changedPaths: diff.paths
    };
  }
}
