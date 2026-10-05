export interface Repository {
  readonly id: string;
  readonly root: string;
  readonly vcs: "git";
  readonly defaultBranch?: string;
  readonly analyzerVersion: string;
  readonly configurationFingerprint: string;
}
