import type { GitRepositoryPort } from "../ports/git.js";

export async function discoverPathAliases(git: GitRepositoryPort, files: readonly string[], commit: string): Promise<Record<string, readonly string[]>> {
  const result: Record<string, readonly string[]> = {};
  for (const path of files.map(normalize).filter(path => /(^|\/)tsconfig[^/]*\.json$/.test(path))) {
    try {
      const raw = await git.readFileAtCommit(commit, path);
      const data = JSON.parse(raw.replace(/\/\/.*$/gm, "").replace(/,\s*([}\]])/g, "$1")) as Record<string, unknown>;
      const options = data.compilerOptions;
      if (!options || typeof options !== "object") continue;
      const paths = (options as Record<string, unknown>).paths;
      if (!paths || typeof paths !== "object") continue;
      const dir = path.includes("/") ? path.slice(0, path.lastIndexOf("/")) : ".";
      for (const [key, value] of Object.entries(paths as Record<string, unknown>)) {
        if (!Array.isArray(value)) continue;
        const mapped = value.filter((item): item is string => typeof item === "string").map(item => normalize(dir === "." ? item : dir + "/" + item));
        if (mapped.length) result[key] = mapped;
      }
    } catch {}
  }
  return result;
}
function normalize(path: string): string { return path.replaceAll("\\", "/").replace(/^\.\//, ""); }
