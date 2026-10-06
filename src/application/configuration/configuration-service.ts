import { DEFAULT_CONFIGURATION, type ConfigurationUpdateResult, type GctgConfiguration, type ResolvedConfiguration, type ConfigurationSource } from "../../domain/configuration/model.js";
import type { ConfigurationServicePort, ConfigurationStore } from "../ports/configuration.js";
export class ConfigurationService implements ConfigurationServicePort {
  constructor(private readonly store: ConfigurationStore) {}
  async resolve(repositoryRoot: string, overrides?: unknown): Promise<ResolvedConfiguration> {
    const sources: ConfigurationSource[] = [{ kind: "DEFAULT", location: "built-in", values: DEFAULT_CONFIGURATION }];
    const repositoryValues = await this.store.load(repositoryRoot);
    let configuration: unknown = DEFAULT_CONFIGURATION;
    if (repositoryValues !== undefined) { configuration = mergeConfiguration(configuration, repositoryValues); sources.push({ kind: "REPOSITORY", location: repositoryRoot + "/.gctg/config.json", values: repositoryValues }); }
    if (overrides !== undefined) { configuration = mergeConfiguration(configuration, overrides); sources.push({ kind: "RUNTIME", location: "runtime", values: overrides }); }
    return { configuration: validateConfiguration(configuration), sources };
  }
  async update(repositoryRoot: string, configuration: unknown): Promise<ConfigurationUpdateResult> {
    const validated = validateConfiguration(configuration);
    await this.store.save(repositoryRoot, validated);
    return { configuration: validated, source: "REPOSITORY", location: repositoryRoot + "/.gctg/config.json" };
  }
}
export function validateConfiguration(value: unknown): GctgConfiguration {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("Configuration must be an object.");
  const root = value as Record<string, unknown>;
  if (root.schemaVersion !== 1) throw new Error("Unsupported configuration schemaVersion.");
  const indexing = object(root.indexing, "indexing"); const retention = object(root.historyRetention, "historyRetention"); const performance = object(root.performance, "performance"); const storage = object(root.storage, "storage"); const cleanup = object(root.cleanup, "cleanup");
  const mode = cleanup.mode;
  if (mode !== "conservative" && mode !== "balanced" && mode !== "aggressive") throw new Error("cleanup.mode must be conservative, balanced, or aggressive.");
  return { schemaVersion: 1, indexing: { maxHistoryDepth: nullableInteger(indexing.maxHistoryDepth, "indexing.maxHistoryDepth", 0) }, historyRetention: { enabled: boolean(retention.enabled, "historyRetention.enabled"), deletedBranchGracePeriodDays: integer(retention.deletedBranchGracePeriodDays, "historyRetention.deletedBranchGracePeriodDays", 0), protectTags: boolean(retention.protectTags, "historyRetention.protectTags"), protectReleases: boolean(retention.protectReleases, "historyRetention.protectReleases"), protectPullRequestEvidence: boolean(retention.protectPullRequestEvidence, "historyRetention.protectPullRequestEvidence"), protectAuditEvidence: boolean(retention.protectAuditEvidence, "historyRetention.protectAuditEvidence") }, performance: { maxWorkers: integer(performance.maxWorkers, "performance.maxWorkers", 1) }, storage: { maxSizeMb: nullableInteger(storage.maxSizeMb, "storage.maxSizeMb", 1), maxSnapshots: nullableInteger(storage.maxSnapshots, "storage.maxSnapshots", 1) }, cleanup: { enabled: boolean(cleanup.enabled, "cleanup.enabled"), autoApply: boolean(cleanup.autoApply, "cleanup.autoApply"), requirePreview: boolean(cleanup.requirePreview, "cleanup.requirePreview"), mode } };
}
function object(value: unknown, name: string): Record<string, unknown> { if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error(name + " must be an object."); return value as Record<string, unknown>; }
function boolean(value: unknown, name: string): boolean { if (typeof value !== "boolean") throw new Error(name + " must be a boolean."); return value; }
function integer(value: unknown, name: string, min: number): number { if (!Number.isInteger(value) || Number(value) < min) throw new Error(name + " must be an integer >= " + min + "."); return Number(value); }
function nullableInteger(value: unknown, name: string, min: number): number | null { if (value === null) return null; return integer(value, name, min); }
function mergeConfiguration(base: unknown, override: unknown): unknown {
  if (!override || typeof override !== "object" || Array.isArray(override)) return override;
  if (!base || typeof base !== "object" || Array.isArray(base)) return override;
  const result: Record<string, unknown> = { ...(base as Record<string, unknown>) };
  for (const [key, value] of Object.entries(override as Record<string, unknown>)) { const current = result[key]; result[key] = value && typeof value === "object" && !Array.isArray(value) && current && typeof current === "object" && !Array.isArray(current) ? mergeConfiguration(current, value) : value; }
  return result;
}
