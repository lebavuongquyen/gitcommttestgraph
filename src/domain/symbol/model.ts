export const SymbolKind = {
  FUNCTION: "function",
  METHOD: "method",
  CLASS: "class",
  INTERFACE: "interface",
  TYPE: "type",
  ENUM: "enum",
  VARIABLE: "variable",
  PROPERTY: "property",
  NAMESPACE: "namespace",
  MODULE: "module",
  OTHER: "other"
} as const;

export type SymbolKind = typeof SymbolKind[keyof typeof SymbolKind];

export interface SymbolModel {
  readonly id: string;
  readonly fileId: string;
  readonly kind: SymbolKind;
  readonly name: string;
  readonly qualifiedName?: string;
  readonly exported: boolean;
  readonly startLine: number;
  readonly endLine: number;
  readonly signature?: string;
}
