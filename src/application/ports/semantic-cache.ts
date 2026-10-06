import { createHash } from "node:crypto";
import type { SourceAnalysis } from "./source-analyzer.js";

export interface SemanticCacheReader {
  get(key: string): Promise<SourceAnalysis | null>;
}

export interface SemanticCacheWriter {
  save(key: string, analysis: SourceAnalysis): Promise<void>;
}

export interface SemanticCache extends SemanticCacheReader, SemanticCacheWriter {}
