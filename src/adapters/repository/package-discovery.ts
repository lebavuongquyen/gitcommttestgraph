import { readFile } from "node:fs/promises";
import { join, relative, dirname, posix } from "node:path";
import { stableId } from "../../domain/graph/ids.js";
import { PackageManager, type PackageModel } from "../../domain/package/model.js";
import type { RepositoryLayout, RepositoryPackage } from "../../domain/repository/discovery-model.js";

export async function discoverPackages(root: string): Promise<RepositoryLayout> {
  const rootManifest = await readJson(join(root, "package.json"));
  const manager = await detectManager(root);
  const workspacePatterns = workspacePatternsFromManifest(rootManifest);
  const packages: RepositoryPackage[] = [];
  if (rootManifest) packages.push(toPackage(root, "package.json", rootManifest, manager));
  for (const pattern of workspacePatterns) {
    for (const manifestPath of await expandWorkspace(root, pattern)) {
      const data = await readJson(manifestPath);
      if (!data) continue;
      const rel = relative(root, manifestPath).replaceAll("\\", "/");
      if (!packages.some(p => p.manifestPath === rel)) packages.push(toPackage(root, rel, data, manager));
    }
  }
  return {
    root,
    packages,
    workspaceFiles: manager === PackageManager.PNPM ? ["pnpm-workspace.yaml"] : [],
    generatedPaths: ["node_modules", ".git", "dist", "build", ".next", "coverage"],
    ignoredPaths: ["node_modules", ".git"]
  };
}

function toPackage(root: string, manifestPath: string, data: Record<string, unknown>, manager: PackageManager): RepositoryPackage {
  const rootPath = dirname(manifestPath).replaceAll("\\", "/") || ".";
  const name = typeof data.name === "string" ? data.name : rootPath;
  const dependencies = {
    ...record(data.dependencies),
    ...record(data.devDependencies),
    ...record(data.peerDependencies),
    ...record(data.optionalDependencies)
  };
  return {
    id: stableId("package", name, rootPath),
    name,
    rootPath,
    manifestPath: manifestPath.replaceAll("\\", "/"),
    manager,
    dependencies,
    scripts: record(data.scripts)
  };
}

async function detectManager(root: string): Promise<PackageManager> {
  for (const [file, manager] of [
    ["pnpm-workspace.yaml", PackageManager.PNPM],
    ["pnpm-lock.yaml", PackageManager.PNPM],
    ["yarn.lock", PackageManager.YARN],
    ["bun.lockb", PackageManager.BUN],
    ["bun.lock", PackageManager.BUN],
    ["package-lock.json", PackageManager.NPM]
  ] as const) {
    try {
      await import("node:fs/promises").then(fs => fs.access(join(root, file)));
      return manager;
    } catch {}
  }
  return PackageManager.NPM;
}

