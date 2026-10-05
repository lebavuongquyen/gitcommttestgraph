export interface ModuleResolutionRequest {
  readonly specifier: string;
  readonly importer: string;
  readonly extensions: readonly string[];
  readonly files: ReadonlySet<string>;
  readonly pathAliases?: Readonly<Record<string, readonly string[]>>;
  readonly baseUrl?: string;
}

export interface ModuleResolutionResult {
  readonly target: string | null;
  readonly confidence: "EXACT" | "HIGH" | "MEDIUM" | "LOW";
  readonly strategy: string;
}
