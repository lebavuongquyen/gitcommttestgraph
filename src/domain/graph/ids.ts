import { createHash } from "node:crypto";

export function stableId(namespace: string, ...parts: readonly string[]): string {
  const input = [namespace, ...parts].join("\u0000");
  return createHash("sha256").update(input).digest("hex");
}

export function edgeId(source: string, type: string, target: string, sourceCommit: string): string {
  return stableId("edge", source, type, target, sourceCommit);
}
