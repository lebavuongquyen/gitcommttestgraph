export const Confidence = {
  EXACT: "EXACT",
  HIGH: "HIGH",
  MEDIUM: "MEDIUM",
  LOW: "LOW"
} as const;

export type Confidence = typeof Confidence[keyof typeof Confidence];

export interface Evidence {
  readonly kind: string;
  readonly filePath?: string;
  readonly startLine?: number;
  readonly endLine?: number;
  readonly text?: string;
  readonly resolver?: string;
  readonly details?: Readonly<Record<string, string | number | boolean | null>>;
}

export interface Provenance {
  readonly confidence: Confidence;
  readonly evidence: readonly Evidence[];
}
