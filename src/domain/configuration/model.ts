export type ConfigurationSourceKind = "DEFAULT" | "REPOSITORY" | "RUNTIME";
export type CleanupMode = "conservative" | "balanced" | "aggressive";
export type ConfigurationMigrationStatus = "CURRENT" | "MIGRATED";

export interface HistoryRetentionConfiguration { readonly enabled: boolean; readonly deletedBranchGracePeriodDays: number; readonly protectTags: boolean; readonly protectReleases: boolean; readonly protectPullRequestEvidence: boolean; readonly protectAuditEvidence: boolean; }
export interface GctgConfiguration { readonly schemaVersion: 1; readonly indexing: { readonly maxHistoryDepth: number | null }; readonly historyRetention: HistoryRetentionConfiguration; readonly performance: { readonly maxWorkers: number }; readonly storage: { readonly maxSizeMb: number | null; readonly maxSnapshots: number | null }; readonly cleanup: { readonly enabled: boolean; readonly autoApply: boolean; readonly requirePreview: boolean; readonly mode: CleanupMode }; }
export interface ConfigurationSource { readonly kind: ConfigurationSourceKind; readonly location: string; readonly values: unknown; }
export interface ConfigurationMigrationEvidence { readonly fromVersion: number; readonly toVersion: number; readonly status: ConfigurationMigrationStatus; readonly backupCreated: boolean; readonly backupPath?: string; }
export interface ResolvedConfiguration { readonly configuration: GctgConfiguration; readonly sources: readonly ConfigurationSource[]; readonly migration: ConfigurationMigrationEvidence; }
export interface ConfigurationUpdateResult { readonly configuration: GctgConfiguration; readonly source: ConfigurationSourceKind; readonly location: string; }

export const DEFAULT_CONFIGURATION: GctgConfiguration = {
  schemaVersion: 1,
  indexing: { maxHistoryDepth: null },
  historyRetention: { enabled: true, deletedBranchGracePeriodDays: 90, protectTags: true, protectReleases: true, protectPullRequestEvidence: true, protectAuditEvidence: true },
  performance: { maxWorkers: 4 },
  storage: { maxSizeMb: null, maxSnapshots: null },
  cleanup: { enabled: true, autoApply: false, requirePreview: true, mode: "conservative" },
};
