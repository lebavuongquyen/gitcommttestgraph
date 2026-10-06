import type { Commit, CommitDiff, ChangedPath } from "../../domain/git/model.js";

export interface GitRepositoryPort {
  getHead(): Promise<string>;
  ensureCommit(commit: string, remoteUrl?: string): Promise<void>;
  getCurrentBranch(): Promise<string>;
  listBranches(): Promise<readonly import("../../domain/git/model.js").BranchRef[]>;
  getMergeBase(base: string, head: string): Promise<string>;
  getCommitsBetween(base: string, head: string): Promise<readonly string[]>;
  getCommit(hash: string): Promise<Commit>;
  getChangedPaths(hash: string): Promise<readonly ChangedPath[]>;
  getDiff(fromCommit: string, toCommit: string): Promise<CommitDiff>;
  readFileAtCommit(commit: string, path: string): Promise<string>;
  readonly readFilesAtCommit?: (commit: string, paths: readonly string[]) => Promise<ReadonlyMap<string, string>>;
  listFilesAtCommit(commit: string): Promise<readonly string[]>;
}
