export const FileKind = {
  SOURCE: "SOURCE",
  TEST: "TEST",
  CONFIG: "CONFIG",
  PACKAGE_METADATA: "PACKAGE_METADATA",
  WORKSPACE_CONFIG: "WORKSPACE_CONFIG",
  LANGUAGE_CONFIG: "LANGUAGE_CONFIG",
  BUILD_CONFIG: "BUILD_CONFIG",
  TEST_CONFIG: "TEST_CONFIG",
  RUNTIME_CONFIG: "RUNTIME_CONFIG",
  SCHEMA: "SCHEMA",
  FIXTURE: "FIXTURE",
  RUNTIME_DATA: "RUNTIME_DATA",
  GENERATED: "GENERATED",
  DOCUMENTATION: "DOCUMENTATION",
  ASSET: "ASSET",
  UNKNOWN: "UNKNOWN"
} as const;
export type FileKind = typeof FileKind[keyof typeof FileKind];

export function classifyFile(path: string): FileKind {
  const p = path.replaceAll("\\", "/");
  const base = p.split("/").pop() ?? p;
  if (/(^|\/)(node_modules|\.git|dist|build|coverage|\.next|out)(\/|$)/.test(p)) return FileKind.GENERATED;
  if (/^package\.json$|\/package\.json$|^package-lock\.json$|\/package-lock\.json$/.test(p)) return FileKind.PACKAGE_METADATA;
  if (base === "pnpm-workspace.yaml" || base === "lerna.json" || base === "nx.json" || base === "turbo.json") return FileKind.WORKSPACE_CONFIG;
  if (/^(tsconfig[^/]*\.json|jsconfig[^/]*\.json)$/.test(base)) return FileKind.LANGUAGE_CONFIG;
  if (/^(vite|vitest|jest|playwright|cypress|webpack|rollup|babel|swc)\..+\.(js|ts|mjs|cjs)$/.test(base)) return FileKind.TEST_CONFIG;
  if (/(^|\/)(\.env[^/]*|config\/|configs\/)/.test(p)) return FileKind.RUNTIME_CONFIG;
  if (/(^|\/)(schema|schemas)(\/|$)/.test(p) || /\.schema\.(json|ts)$/.test(base)) return FileKind.SCHEMA;
  if (/(^|\/)(fixtures?|__fixtures__|test-data|testdata)(\/|$)/.test(p)) return FileKind.FIXTURE;
  if (/(^|\/)(tests?|__tests__|e2e|spec)(\/|$)/.test(p) || /\.(test|spec)\.[cm]?[jt]sx?$/.test(base)) return FileKind.TEST;
  if (/\.(ts|tsx|js|jsx|mjs|cjs)$/.test(base)) return FileKind.SOURCE;
  if (/\.(md|mdx|txt|rst)$/.test(base)) return FileKind.DOCUMENTATION;
  if (/\.(json|yaml|yml)$/.test(base)) return FileKind.RUNTIME_DATA;
  if (/\.(png|jpg|jpeg|gif|svg|webp|ico|woff2?|ttf)$/.test(base)) return FileKind.ASSET;
  return FileKind.UNKNOWN;
}
