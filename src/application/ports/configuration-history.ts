import type { GctgConfiguration } from "../../domain/configuration/model.js";

export interface ConfigurationHistoryEntry {
  readonly operationId: string;
  readonly timestamp: string;
  readonly configuration: GctgConfiguration;
}

export interface ConfigurationHistoryStore {
  append(repositoryRoot: string, entry: ConfigurationHistoryEntry): Promise<void>;
  load(repositoryRoot: string): Promise<readonly ConfigurationHistoryEntry[]>;
}
