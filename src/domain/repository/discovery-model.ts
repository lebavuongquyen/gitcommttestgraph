import type { PackageManager } from "../package/model.js";

export interface RepositoryPackage {
  readonly id: string;
  readonly name: string;
  readonly rootPath: string;
  readonly manifestPath: string;
  readonly manager: PackageManager;
  readonly dependencies: Readonly<Record<string, string>>;
  readonly scripts: Readonly<Record<string, string>>;
}

export interface RepositoryLayout {
  readonly root: string;
  readonly packages: readonly RepositoryPackage[];
  readonly workspaceFiles: readonly string[];
  readonly generatedPaths: readonly string[];
  readonly ignoredPaths: readonly string[];
}
