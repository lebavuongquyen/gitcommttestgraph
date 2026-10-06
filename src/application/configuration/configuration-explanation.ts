import type { ConfigurationSource, ConfigurationSourceKind, ResolvedConfiguration } from "../../domain/configuration/model.js";

export interface ConfigurationValueExplanation {
  readonly path: string;
  readonly value: unknown;
  readonly source: ConfigurationSourceKind;
  readonly location: string;
}

export interface ConfigurationExplanation {
  readonly precedence: readonly ConfigurationSourceKind[];
  readonly sources: readonly ConfigurationSource[];
  readonly values: readonly ConfigurationValueExplanation[];
}

export function explainConfiguration(resolved: ResolvedConfiguration): ConfigurationExplanation {
  const values = new Map<string, ConfigurationValueExplanation>();

  for (const source of resolved.sources) {
    for (const [path, value] of flattenConfiguration(source.values)) {
      values.set(path, {
        path,
        value,
        source: source.kind,
        location: source.location
      });
    }
  }

  return {
    precedence: ["DEFAULT", "REPOSITORY", "RUNTIME"],
    sources: resolved.sources,
    values: [...values.values()].sort((left, right) => left.path.localeCompare(right.path))
  };
}

function flattenConfiguration(value: unknown, prefix = ""): Array<[string, unknown]> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return prefix ? [[prefix, value]] : [];
  }

  const entries: Array<[string, unknown]> = [];
  for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
    const path = prefix ? prefix + "." + key : key;
    if (child && typeof child === "object" && !Array.isArray(child)) {
      entries.push(...flattenConfiguration(child, path));
    } else {
      entries.push([path, child]);
    }
  }
  return entries;
}
