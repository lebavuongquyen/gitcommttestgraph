import type { ConfigurationUpdateResult, ResolvedConfiguration } from "../../domain/configuration/model.js";
import type { ConfigurationHistoryStore } from "./configuration-history.js";

export interface ConfigurationStore {
  load(repositoryRoot: string): Promise<unknown | undefined>;
  save(repositoryRoot: string, configuration: unknown): Promise<void>;
  backup(repositoryRoot: string): Promise<string>;
}

export interface ConfigurationServicePort {
  resolve(repositoryRoot: string, overrides?: unknown): Promise<ResolvedConfiguration>;
  update(repositoryRoot: string, configuration: unknown): Promise<ConfigurationUpdateResult>;
  history(repositoryRoot: string): Promise<readonly import("./configuration-history.js").ConfigurationHistoryEntry[]>;
}

export type { ConfigurationHistoryStore };
