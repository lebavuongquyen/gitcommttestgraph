import type { Confidence, Evidence } from "../evidence/model.js";

export const NodeType = {
  REPOSITORY: "Repository",
  COMMIT: "Commit",
  PACKAGE: "Package",
  FILE: "File",
  SYMBOL: "Symbol",
  TEST_PROJECT: "TestProject",
  TEST_FILE: "TestFile",
  TEST_CASE: "TestCase",
  CONFIG: "Config",
  FIXTURE: "Fixture",
  SCHEMA: "Schema"
} as const;

export type NodeType = typeof NodeType[keyof typeof NodeType];

export const EdgeType = {
  CONTAINS: "CONTAINS",
  IMPORTS: "IMPORTS",
  EXPORTS: "EXPORTS",
  CALLS: "CALLS",
  EXTENDS: "EXTENDS",
  IMPLEMENTS: "IMPLEMENTS",
  DEPENDS_ON: "DEPENDS_ON",
  CONFIGURES: "CONFIGURES",
  TESTS: "TESTS",
  USES_FIXTURE: "USES_FIXTURE",
  USES_SCHEMA: "USES_SCHEMA",
  GENERATES: "GENERATES"
} as const;

export type EdgeType = typeof EdgeType[keyof typeof EdgeType];

export interface GraphNode {
  readonly id: string;
  readonly type: NodeType;
  readonly attributes: Readonly<Record<string, unknown>>;
}

export interface GraphEdge {
  readonly id: string;
  readonly source: string;
  readonly target: string;
  readonly type: EdgeType;
  readonly confidence: Confidence;
  readonly evidence: readonly Evidence[];
  readonly sourceCommit: string;
}

export interface GraphSnapshot {
  readonly schemaVersion: 1;
  readonly analyzerVersion: string;
  readonly repository: string;
  readonly commit: string;
  readonly configurationFingerprint: string;
  readonly nodes: readonly GraphNode[];
  readonly edges: readonly GraphEdge[];
  readonly metadata: Readonly<Record<string, unknown>>;
}
