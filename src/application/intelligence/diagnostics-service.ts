import { randomUUID } from "node:crypto";
import type { GraphSnapshot } from "../../domain/graph/model.js";
import type { OperationDiagnostics } from "../../domain/diagnostics.js";

export interface DiagnosticsIndexResult { readonly snapshot: GraphSnapshot; readonly reused: boolean; readonly incremental?: boolean; readonly changedPaths?: readonly string[]; readonly analyzedPaths?: readonly string[]; readonly reusedPaths?: readonly string[]; }

function arrayLength(value: unknown): number { return Array.isArray(value) ? value.length : 0; }

export class DiagnosticsService {
  begin(operation: string, repository: string, commit: string): { operationId: string; startedAt: number } {
    return { operationId: randomUUID(), startedAt: performance.now() };
  }
  complete(operation: string, context: { operationId: string; startedAt: number }, repository: string, analyzerVersion: string, result: DiagnosticsIndexResult, uncertaintyCount = 0): OperationDiagnostics {
    const metadata = result.snapshot.metadata;
    return {
      schemaVersion: 1,
      operationId: context.operationId,
      operation,
      repository,
      commit: result.snapshot.commit,
      analyzerVersion,
      durationMs: Math.max(0, Number((performance.now() - context.startedAt).toFixed(3))),
      cache: { hit: result.reused, incremental: result.incremental ?? false },
      graph: { nodes: result.snapshot.nodes.length, edges: result.snapshot.edges.length },
      parser: "TypeScriptProjectAnalyzer",
      resolver: "TypeScriptModuleResolver",
      uncertaintyCount,
      metadata: {
        sourceFileCount: metadata.sourceFileCount ?? 0,
        testFileCount: metadata.testFileCount ?? 0,
        configFileCount: metadata.configFileCount ?? 0,
        analyzedPathCount: result.analyzedPaths?.length ?? arrayLength(metadata.semanticAnalyzedPaths),
        reusedPathCount: result.reusedPaths?.length ?? arrayLength(metadata.semanticReusedPaths)
      },
      deterministic: true
    };
  }
}
