import type { BranchRef, ChangedPath } from "./git/model.js";

export interface CommitChangeEvidence {
  readonly commit: string;
  readonly subject: string;
  readonly changedPaths: readonly ChangedPath[];
}

export interface ChangeSet {
  readonly repository: string;
  readonly source: "COMMIT" | "BRANCH" | "PULL_REQUEST";
  readonly base: string;
  readonly head: string;
  readonly mergeBase: string;
  readonly branch?: BranchRef;
  readonly commits: readonly string[];
  readonly changedPaths: readonly ChangedPath[];
  readonly commitEvidence?: readonly CommitChangeEvidence[];
}

export interface BranchChangeSet extends ChangeSet {
  readonly source: "BRANCH";
  readonly branch: BranchRef;
}

export interface PullRequestChangeSet extends ChangeSet {
  readonly source: "PULL_REQUEST";
  readonly pullRequestNumber: number;
  readonly title?: string;
}

export type ChangeSource = CommitChangeSet | BranchChangeSet | PullRequestChangeSet;

export interface CommitChangeSet extends ChangeSet {
  readonly source: "COMMIT";
}
