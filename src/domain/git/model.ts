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

export interface BranchRef {
  readonly name: string;
  readonly commit: string;
  readonly current: boolean;
  readonly remote?: string;
}

export type BranchLifecycleKind = "created" | "updated" | "deleted" | "recreated";

export interface BranchLifecycleEvidence {
  readonly name: string;
  readonly kind: BranchLifecycleKind;
  readonly commit: string;
  readonly timestamp: string;
  readonly source: "reflog";
}
