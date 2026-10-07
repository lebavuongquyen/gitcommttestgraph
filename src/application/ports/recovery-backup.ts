export interface RecoveryBackupEntry {
  readonly path: string;
  readonly sizeBytes: number;
  readonly sha256: string;
  readonly contentBase64: string;
}

export interface RecoveryBackupPolicy {
  readonly includedFiles: readonly string[];
  readonly includedDirectories: readonly string[];
  readonly excludedArtifacts: readonly string[];
}

export interface RecoveryBackupManifest {
  readonly format: "gctg-backup";
  readonly schemaVersion: 1;
  readonly gctgVersion: string;
  readonly createdAt: string;
  readonly policy: RecoveryBackupPolicy;
  readonly entries: readonly RecoveryBackupEntry[];
}

export interface RecoveryBackupService {
  create(repositoryRoot: string, backupPath: string): Promise<RecoveryBackupManifest>;
  inspect(backupPath: string): Promise<RecoveryBackupManifest>;
  restore(repositoryRoot: string, backupPath: string): Promise<RecoveryBackupManifest>;
}
