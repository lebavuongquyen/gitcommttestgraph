import type { GraphSnapshot } from "../../domain/graph/model.js";
import { NodeType } from "../../domain/graph/model.js";
import type { PackageManager } from "../../domain/package/model.js";

export type EcosystemSupport = "SUPPORTED" | "PARTIAL" | "UNSUPPORTED" | "UNKNOWN";

export interface EcosystemCapability {
  readonly id: string;
  readonly category: "package-manager" | "language" | "test-framework";
  readonly name: string;
  readonly support: EcosystemSupport;
  readonly confidence: "EXACT" | "HIGH" | "MEDIUM" | "LOW";
  readonly evidence: readonly string[];
  readonly reason: string;
}

export interface RepositoryEcosystem {
  readonly schemaVersion: 1;
  readonly repository: string;
  readonly commit: string;
  readonly support: EcosystemSupport;
  readonly packageManagers: readonly EcosystemCapability[];
  readonly languages: readonly EcosystemCapability[];
  readonly testFrameworks: readonly EcosystemCapability[];
  readonly unsupported: readonly EcosystemCapability[];
}

const supportedManagers = new Set(["npm", "pnpm", "yarn", "bun"]);
const supportedLanguages = new Set(["typescript", "javascript"]);
const supportedTests = new Set(["node:test", "jest", "vitest", "playwright", "generic-script"]);

export function analyzeRepositoryEcosystem(snapshot: GraphSnapshot): RepositoryEcosystem {
  const packages = snapshot.nodes.filter(node => node.type === NodeType.PACKAGE);
  const tests = snapshot.nodes.filter(node => node.type === NodeType.TEST_PROJECT);
  const sourceFiles = snapshot.nodes.filter(node => node.type === NodeType.FILE);
  const packageManagers = uniqueCapabilities(packages.map(node => {
    const manager = String(node.attributes.manager ?? "unknown");
    return capability("package-manager", manager, supportedManagers.has(manager) ? "SUPPORTED" : "UNKNOWN", "HIGH", ["package metadata"], supportedManagers.has(manager) ? "Native repository adapter available." : "No verified adapter for this package manager.");
  }));
  const languages = uniqueCapabilities(sourceFiles.map(node => {
    const path = String(node.attributes.path ?? "");
    const language = /\.(tsx?|mts|cts)$/.test(path) ? "typescript" : /\.(jsx?|mjs|cjs)$/.test(path) ? "javascript" : "unknown";
    return capability("language", language, supportedLanguages.has(language) ? "SUPPORTED" : "UNKNOWN", "MEDIUM", [path], supportedLanguages.has(language) ? "Native semantic analysis adapter available." : "No verified semantic adapter.");
  }).filter(x => x.name !== "unknown"));
  const testFrameworks = uniqueCapabilities(tests.map(node => {
    const framework = String(node.attributes.framework ?? "unknown");
    return capability("test-framework", framework, supportedTests.has(framework) ? "SUPPORTED" : "UNKNOWN", "HIGH", [String(node.attributes.rootPath ?? "")], supportedTests.has(framework) ? "Native test adapter available." : "No verified test adapter.");
  }));
  const all = [...packageManagers, ...languages, ...testFrameworks];
  const unsupported = all.filter(x => x.support === "UNSUPPORTED" || x.support === "UNKNOWN");
  const support: EcosystemSupport = all.length === 0
    ? "UNKNOWN"
    : unsupported.length
      ? "UNKNOWN"
      : all.some(x => x.support === "PARTIAL") ? "PARTIAL"
      : "SUPPORTED";
  return { schemaVersion: 1, repository: snapshot.repository, commit: snapshot.commit, support, packageManagers, languages, testFrameworks, unsupported };
}

function capability(category: EcosystemCapability["category"], name: string, support: EcosystemSupport, confidence: EcosystemCapability["confidence"], evidence: string[], reason: string): EcosystemCapability {
  return { id: category + ":" + name, category, name, support, confidence, evidence, reason };
}

function uniqueCapabilities(items: readonly EcosystemCapability[]): EcosystemCapability[] {
  return [...new Map(items.map(item => [item.id, item])).values()];
}

export function ecosystemManagerIsSupported(manager: PackageManager): boolean {
  return supportedManagers.has(manager);
}
