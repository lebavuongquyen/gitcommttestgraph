import type { GraphEdge, GraphNode } from "../../domain/graph/model.js";

export interface SourceFileInput {
  readonly path: string;
  readonly content: string;
  readonly packageId?: string;
}

export interface SourceAnalysis {
  readonly nodes: readonly GraphNode[];
  readonly edges: readonly GraphEdge[];
}

export interface SourceAnalyzer {
  analyze(input: SourceFileInput, commit: string): SourceAnalysis;
}

export interface SemanticSourceAnalyzer extends SourceAnalyzer {
  analyzeProject(input: SourceProjectInput, commit: string): SourceAnalysis;
}

export interface SourceProjectInput {
  readonly files: readonly SourceFileInput[];
  readonly pathAliases?: Readonly<Record<string, readonly string[]>>;
  readonly baseUrl?: string;
  readonly packageRoots?: Readonly<Record<string, string>>;
}

