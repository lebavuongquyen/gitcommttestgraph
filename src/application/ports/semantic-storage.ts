import type { SourceAnalysis } from "../../application/ports/source-analyzer.js";
import type { SemanticCache, SemanticCacheReader, SemanticCacheWriter } from "../../application/ports/semantic-cache.js";

export interface SemanticAnalysisReader extends SemanticCacheReader {}

export interface SemanticAnalysisWriter extends SemanticCacheWriter {}

export interface SemanticStorage extends SemanticCacheReader, SemanticCacheWriter {
  get(key: string): Promise<SourceAnalysis | null>;
  save(key: string, analysis: SourceAnalysis): Promise<void>;
}

export type SemanticCacheStorage = SemanticStorage;
