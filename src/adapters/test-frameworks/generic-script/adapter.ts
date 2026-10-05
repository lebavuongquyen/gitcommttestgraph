import { basename } from "node:path";
import ts from "typescript";
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
    const content = context.readFile ? await context.readFile(testFile) : "";
    if (!content) return [{ title: basename(testFile), startLine: 1, endLine: 1 }];
    const source = ts.createSourceFile(testFile, content, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
    const cases: { title: string; startLine: number; endLine: number }[] = [];
    const visit = (node: ts.Node) => {
      if (ts.isCallExpression(node) && ts.isIdentifier(node.expression) && /^(test|it|describe|suite)$/i.test(node.expression.text)) {
        const arg = node.arguments[0];
        if (arg && ts.isStringLiteralLike(arg)) {
          cases.push({
            title: arg.text,
            startLine: source.getLineAndCharacterOfPosition(node.getStart(source)).line + 1,
            endLine: source.getLineAndCharacterOfPosition(node.end).line + 1
          });
        }
      }
      ts.forEachChild(node, visit);
    };
    ts.forEachChild(source, visit);
    return cases.length ? cases : [{ title: basename(testFile), startLine: 1, endLine: source.getLineStarts().length }];
  }

  async resolveCommand(context: TestCommandContext) {
    const script = context.packageScripts.test;
    if (!script) throw new Error("No test script available");
    const manager = context.project.commandResolverId;
    if (manager === "pnpm") return { executable: "pnpm", args: ["test"], cwd: context.root };
    if (manager === "yarn") return { executable: "yarn", args: ["test"], cwd: context.root };
    if (manager === "bun") return { executable: "bun", args: ["test"], cwd: context.root };
    return { executable: "npm", args: ["test"], cwd: context.root };
  }
}
