export const PackageManager = {
  PNPM: "pnpm",
  NPM: "npm",
  YARN: "yarn",
  BUN: "bun",
  UNKNOWN: "unknown"
} as const;

export type PackageManager = typeof PackageManager[keyof typeof PackageManager];

export interface PackageModel {
  readonly id: string;
  readonly name: string;
  readonly rootPath: string;
  readonly manager: PackageManager;
  readonly manifestPath: string;
  readonly packageType?: string;
}
