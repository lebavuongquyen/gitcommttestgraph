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

export class YarnAdapter implements PackageManagerAdapter {
  readonly id = "yarn" as const;
  detect(files: readonly string[]): boolean { return files.includes("yarn.lock") || files.includes(".yarnrc.yml"); }
  filterCommand(packageName: string, script: string) { return { executable: "yarn", args: ["workspace", packageName, script] }; }
}

export class BunAdapter implements PackageManagerAdapter {
  readonly id = "bun" as const;
  detect(files: readonly string[]): boolean { return files.includes("bun.lock") || files.includes("bun.lockb"); }
  filterCommand(_packageName: string, script: string) { return { executable: "bun", args: [script] }; }
}

export function packageManagerAdapter(manager: PackageManager): PackageManagerAdapter {
  if (manager === "pnpm") return new PnpmAdapter();
  if (manager === "yarn") return new YarnAdapter();
  if (manager === "bun") return new BunAdapter();
  return new NpmAdapter();
}
