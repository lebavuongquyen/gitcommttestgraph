import { createHash } from "node:crypto";
import type { SourceAnalysis } from "./source-analyzer.js";

export interface SemanticCacheKeyInput {
  readonly analyzerVersion: string;
  readonly files: readonly { readonly path: string; readonly content: string; readonly packageId?: string }[];
  readonly pathAliases?: Readonly<Record<string, readonly string[]>>;
  readonly baseUrl?: string;
  readonly packageRoots?: Readonly<Record<string, string>>;
  readonly packageEntrypoints?: Readonly<Record<string, string>>;
  readonly analysisPaths?: readonly string[];
}

export interface SemanticCache {
  get(key: string): Promise<SourceAnalysis | null>;
  save(key: string, analysis: SourceAnalysis): Promise<void>;
}

export function semanticCacheKey(input: SemanticCacheKeyInput): string {
  const canonical = JSON.stringify({
    analyzerVersion: input.analyzerVersion,
    files: [...input.files].sort((a, b) => a.path.localeCompare(b.path)).map(file => ({
      path: file.path,
      contentHash: createHash("sha256").update(file.content, "utf8").digest("hex"),
      packageId: file.packageId ?? null
    })),
    pathAliases: input.pathAliases ?? {},
    baseUrl: input.baseUrl ?? null,
    packageRoots: input.packageRoots ?? {},
    packageEntrypoints: input.packageEntrypoints ?? {},
    analysisPaths: [...(input.analysisPaths ?? [])].sort()
  });
  return createHash("sha256").update(canonical, "utf8").digest("hex");
}
