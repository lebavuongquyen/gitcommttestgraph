import type { BranchLifecycleEvidence, BranchRef } from "../../domain/git/model.js";
import type { GitRepositoryPort } from "../ports/git.js";

export interface BranchLifecycleReport {
  readonly current: readonly BranchRef[];
  readonly evidence: readonly BranchLifecycleEvidence[];
  readonly deleted: readonly BranchLifecycleEvidence[];
  readonly recreated: readonly BranchLifecycleEvidence[];
}

export class BranchLifecycleService {
  constructor(private readonly git: GitRepositoryPort) {}

  async analyze(): Promise<BranchLifecycleReport> {
    const current = await this.git.listBranches();
    const evidence = this.git.listBranchLifecycleEvidence
      ? await this.git.listBranchLifecycleEvidence()
      : [];
    const deleted = evidence.filter(item => item.kind === "deleted");
    const recreated = evidence.filter(item => item.kind === "recreated");
    return { current, evidence, deleted, recreated };
  }
}
