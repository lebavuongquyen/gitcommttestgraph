import type { BranchRef } from "../../domain/git/model.js";
import type { GitRepositoryPort } from "../ports/git.js";

export interface ReachabilityEvidence {
  readonly commit: string;
  readonly reachable: boolean;
  readonly protected: boolean;
  readonly reasons: readonly string[];
}

export interface ReachabilityRequest {
  readonly commits: readonly string[];
  readonly branches?: readonly BranchRef[];
  readonly protectedCommits?: readonly string[];
}

export class ReachabilityService {
  constructor(private readonly git: GitRepositoryPort) {}

  async analyze(request: ReachabilityRequest): Promise<readonly ReachabilityEvidence[]> {
    const branches = request.branches ?? await this.git.listBranches();
    const protectedCommits = new Set(request.protectedCommits ?? []);
    const result: ReachabilityEvidence[] = [];

    for (const commit of [...new Set(request.commits)].sort()) {
      const reasons: string[] = [];
      let reachable = false;
      if (protectedCommits.has(commit)) {
        reasons.push("explicit protected evidence");
      }
      for (const branch of branches) {
        try {
          const mergeBase = await this.git.getMergeBase(commit, branch.commit);
          if (mergeBase === commit) {
            reachable = true;
            reasons.push("reachable from branch " + branch.name);
          }
        } catch {
          reasons.push("unable to prove reachability from branch " + branch.name);
        }
      }
      const protectedState = protectedCommits.has(commit) || reachable;
      if (!protectedState && reasons.length === 0) reasons.push("no protection proof");
      result.push({ commit, reachable, protected: protectedState, reasons });
    }

    return result;
  }
}
