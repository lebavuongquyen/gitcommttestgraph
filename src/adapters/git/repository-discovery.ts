import { access, readFile } from "node:fs/promises";
import { join } from "node:path";
import { CliGitRepository } from "./cli-git.js";

export interface RepositoryDiscovery {
  root: string;
  git: CliGitRepository;
  packageManifestPath: string | null;
  workspaceFiles: readonly string[];
}

export async function discoverRepository(startPath: string): Promise<RepositoryDiscovery> {
  const root = await findGitRoot(startPath);
  const workspaceFiles: string[] = [];
  for (const name of ["pnpm-workspace.yaml", "package.json", "yarn.lock", "package-lock.json", "bun.lockb", "bun.lock"]) {
    try {
      await access(join(root, name));
      workspaceFiles.push(name);
    } catch {}
  }
  const packageManifestPath = workspaceFiles.includes("package.json") ? join(root, "package.json") : null;
  return { root, git: new CliGitRepository(root), packageManifestPath, workspaceFiles };
}

async function findGitRoot(startPath: string): Promise<string> {
  let current = startPath;
  while (true) {
    try {
      await access(join(current, ".git"));
      return current;
    } catch {}
    const parent = join(current, "..");
    if (parent === current) throw new Error(`Git repository not found from ${startPath}`);
    current = parent;
  }
}
