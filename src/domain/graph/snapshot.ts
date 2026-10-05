import { createHash } from "node:crypto";
import type { GraphEdge, GraphNode, GraphSnapshot } from "./model.js";

export function configurationFingerprint(configuration: unknown): string {
  return createHash("sha256")
    .update(stableSerialize(configuration))
    .digest("hex");
}

export function createSnapshot(input: {
  analyzerVersion: string;
  repository: string;
  commit: string;
  configuration: unknown;
  nodes: readonly GraphNode[];
  edges: readonly GraphEdge[];
  metadata?: Readonly<Record<string, unknown>>;
}): GraphSnapshot {
  return {
    schemaVersion: 1,
    analyzerVersion: input.analyzerVersion,
    repository: input.repository,
    commit: input.commit,
    configurationFingerprint: configurationFingerprint(input.configuration),
    nodes: [...input.nodes].sort((a, b) => a.id.localeCompare(b.id)),
    edges: [...input.edges].sort((a, b) => a.id.localeCompare(b.id)),
    metadata: input.metadata ?? {}
  };
}

export function stableSerialize(value: unknown): string {
  return JSON.stringify(sortValue(value));
}

function sortValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortValue);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([key, item]) => [key, sortValue(item)])
    );
  }
  return value;
}
