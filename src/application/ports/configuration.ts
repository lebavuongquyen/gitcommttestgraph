import type { ConfigurationUpdateResult, ResolvedConfiguration } from "../../domain/configuration/model.js";
export interface ConfigurationStore { load(repositoryRoot: string): Promise<unknown | undefined>; save(repositoryRoot: string, configuration: unknown): Promise<void>; }
export interface ConfigurationServicePort { resolve(repositoryRoot: string, overrides?: unknown): Promise<ResolvedConfiguration>; update(repositoryRoot: string, configuration: unknown): Promise<ConfigurationUpdateResult>; }
