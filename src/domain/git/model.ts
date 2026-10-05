export interface Commit {
  readonly hash: string;
  readonly parents: readonly string[];
  readonly author: string;
  readonly committer: string;
  readonly timestamp: string;
  readonly message: string;
}

export interface ChangedPath {
  readonly path: string;
  readonly status: "added" | "modified" | "deleted" | "renamed" | "copied";
  readonly oldPath?: string;
}

export interface CommitDiff {
  readonly fromCommit: string;
  readonly toCommit: string;
  readonly paths: readonly ChangedPath[];
}
