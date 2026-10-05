import type { GraphNode } from "../graph/model.js";

export type WorkflowNodeKind = "commit" | "symbol" | "test-case" | "test-file" | "test-project" | "command";

export interface WorkflowNode {
  readonly id: string;
  readonly kind: WorkflowNodeKind;
  readonly label: string;
  readonly attributes: Readonly<Record<string, unknown>>;
}

export interface WorkflowEdge {
  readonly id: string;
  readonly source: string;
  readonly target: string;
  readonly relation: "CHANGED" | "AFFECTS" | "TESTS" | "CONTAINS" | "RUNS";
}

export interface WorkflowGraph {
  readonly schemaVersion: 1;
  readonly workflow: "git-code-test-impact";
  readonly repository: string;
  readonly commit: string;
  readonly nodes: readonly WorkflowNode[];
  readonly edges: readonly WorkflowEdge[];
}

export interface WorkflowBuildInput {
  readonly repository: string;
  readonly commit: string;
  readonly changedSymbolIds: readonly string[];
  readonly affectedSymbolIds: readonly string[];
  readonly impacts: readonly {
    readonly testProjectId: string;
    readonly testFileId: string;
    readonly testCaseId: string;
    readonly testCommand?: { readonly executable: string; readonly args: readonly string[]; readonly cwd: string };
    readonly relation: string;
    readonly changedSymbolIds: readonly string[];
    readonly affectedSymbolIds: readonly string[];
  }[];
  readonly nodes: readonly GraphNode[];
}
