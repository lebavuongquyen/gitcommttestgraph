import { basename } from "node:path";
import type { TestFrameworkAdapter, TestDetectionContext, TestProjectContext, TestCommandContext } from "../../../application/tests/test-registry.js";

export class GenericScriptTestAdapter implements TestFrameworkAdapter {
  readonly id = "generic-script";

  async detect(context: TestDetectionContext) {
    const scripts = Object.entries(context.packageScripts);
    const detected = scripts.some(([name, command]) => /(^|[-:])test($|[-:])/.test(name) || /test[-_/]/i.test(command) || /run-all-tests/i.test(command));
    return { detected, confidence: detected ? "HIGH" as const : "LOW" as const };
  }

  async discoverTests(context: TestProjectContext): Promise<readonly string[]> {
    return context.files.filter(path => /(^|[/\\])test[-_].*\.(mjs|cjs|js|ts|tsx)$|(^|[/\\]).*\.test\.(mjs|cjs|js|ts|tsx)$|(^|[/\\]).*\.spec\.(mjs|cjs|js|ts|tsx)$/.test(path));
  }

  async extractCases(context: TestProjectContext, testFile: string) {
    const source = context.files.includes(testFile) ? testFile : basename(testFile);
    const titles: { title: string; startLine: number; endLine: number }[] = [];
    const lineCount = source.split("\n").length;
    if (lineCount) titles.push({ title: basename(testFile), startLine: 1, endLine: lineCount });
    return titles;
  }

  async resolveCommand(context: TestCommandContext) {
    const script = context.packageScripts.test;
    if (!script) throw new Error("No test script available");
    const manager = context.dependencies["@pnpm"] ? "pnpm" : "npm";
    return manager === "pnpm"
      ? { executable: "pnpm", args: ["test"], cwd: context.root }
      : { executable: "npm", args: ["test"], cwd: context.root };
  }
}
