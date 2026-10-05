import type { PackageManager } from "../../domain/package/model.js";

export interface PackageManagerAdapter {
  readonly id: PackageManager;
  detect(files: readonly string[]): boolean;
  filterCommand(packageName: string, script: string): { executable: string; args: readonly string[] };
}

export class PnpmAdapter implements PackageManagerAdapter {
  readonly id = "pnpm" as const;
  detect(files: readonly string[]): boolean { return files.includes("pnpm-workspace.yaml") || files.some(f => f.endsWith("pnpm-lock.yaml")); }
  filterCommand(packageName: string, script: string) { return { executable: "pnpm", args: ["--filter", packageName, script] }; }
}

export class NpmAdapter implements PackageManagerAdapter {
  readonly id = "npm" as const;
  detect(files: readonly string[]): boolean { return files.includes("package-lock.json"); }
  filterCommand(_packageName: string, script: string) { return { executable: "npm", args: [script] }; }
}
