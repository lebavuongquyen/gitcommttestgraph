export interface OperationDiagnostics {
  readonly schemaVersion: 1;
  readonly operationId: string;
  readonly operation: string;
  readonly repository: string;
  readonly commit: string;
  readonly analyzerVersion: string;
  readonly durationMs: number;
  readonly cache: { readonly hit: boolean; readonly incremental: boolean; };
  readonly graph: { readonly nodes: number; readonly edges: number; };
  readonly parser: string;
  readonly resolver: string;
  readonly uncertaintyCount: number;
  readonly metadata: Readonly<Record<string, unknown>>;
  readonly deterministic: true;
}
