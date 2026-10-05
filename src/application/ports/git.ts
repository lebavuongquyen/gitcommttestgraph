import type { Commit, CommitDiff, ChangedPath } from "../../domain/git/model.js";

export interface GitRepositoryPort {
  getHead(): Promise<string>;
  getCommit(hash: string): Promise<Commit>;
  getChangedPaths(hash: string): Promise<readonly ChangedPath[]>;
  getDiff(fromCommit: string, toCommit: string): Promise<CommitDiff>;
  readFileAtCommit(commit: string, path: string): Promise<string>;
  listFilesAtCommit(commit: string): Promise<readonly string[]>;
}
