import type { Confidence, Evidence } from "../evidence/model.js";

export const ImpactLevel = {
  DIRECT: "DIRECT",
  DIRECT_DEPENDENCY: "DIRECT_DEPENDENCY",
  DOWNSTREAM: "DOWNSTREAM",
  INTEGRATION: "INTEGRATION",
  CONFIG: "CONFIG",
  GLOBAL: "GLOBAL"
} as const;

export type ImpactLevel = typeof ImpactLevel[keyof typeof ImpactLevel];

export interface ImpactPathNode {
  readonly nodeId: string;
  readonly relation?: string;
}

export interface Impact {
  readonly nodeId: string;
  readonly level: ImpactLevel;
  readonly confidence: Confidence;
  readonly path: readonly ImpactPathNode[];
  readonly evidence: readonly Evidence[];
}
