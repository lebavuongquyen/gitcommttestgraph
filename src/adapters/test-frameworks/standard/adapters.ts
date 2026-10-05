import ts from "typescript";
import { basename } from "node:path";
import type { TestFrameworkAdapter, TestDetectionContext, TestProjectContext, TestCommandContext } from "../../../application/tests/test-registry.js";

abstract class AstTestAdapter implements TestFrameworkAdapter {
  abstract readonly id: string;
  abstract readonly markers: readonly string[];
  abstract readonly patterns: readonly RegExp[];

  async detect(context: TestDetectionContext) {
    const detected = this.markers.some(marker => marker in context.dependencies) ||
      Object.keys(context.packageScripts).some(name => /test/i.test(name)) ||
      context.files.some(file => this.patterns.some(pattern => pattern.test(file)));
    return { detected, confidence: detected ? "HIGH" as const : "LOW" as const };
  }

  async discoverTests(context: TestProjectContext) {
    return context.files.filter(file => this.patterns.some(pattern => pattern.test(file)));
  }

  async extractCases(context: TestProjectContext, testFile: string) {
    const content = context.readFile ? await context.readFile(testFile) : "";
    if (!content) return [{ title: basename(testFile), startLine: 1, endLine: 1 }];
    const source = ts.createSourceFile(testFile, content, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
    const cases: { title: string; startLine: number; endLine: number }[] = [];
    const visit = (node: ts.Node) => {
      if (ts.isCallExpression(node)) {
        const expression = ts.isIdentifier(node.expression) ? node.expression.text :
          ts.isPropertyAccessExpression(node.expression) ? node.expression.name.text : "";
        if (/^(test|it|describe|suite|specify)$/i.test(expression)) {
          const arg = node.arguments[0];
          if (arg && ts.isStringLiteralLike(arg)) {
            cases.push({
              title: arg.text,
              startLine: source.getLineAndCharacterOfPosition(node.getStart(source)).line + 1,
              endLine: source.getLineAndCharacterOfPosition(node.end).line + 1
            });
          }
        }
      }
      ts.forEachChild(node, visit);
    };
    ts.forEachChild(source, visit);
    return cases.length ? cases : [{ title: basename(testFile), startLine: 1, endLine: source.getLineStarts().length }];
  }

  async resolveCommand(context: TestCommandContext) {
    const manager = context.project.commandResolverId;
    const args = ["test"];
    if (manager === "pnpm") return { executable: "pnpm", args, cwd: context.root };
    if (manager === "yarn") return { executable: "yarn", args, cwd: context.root };
    if (manager === "bun") return { executable: "bun", args, cwd: context.root };
    return { executable: "npm", args, cwd: context.root };
  }
}

export class VitestAdapter extends AstTestAdapter {
  readonly id = "vitest";
  readonly markers = ["vitest"];
  readonly patterns = [/\.(test|spec)\.[cm]?[jt]sx?$/];
}
export class JestAdapter extends AstTestAdapter {
  readonly id = "jest";
  readonly markers = ["jest"];
  readonly patterns = [/\.(test|spec)\.[cm]?[jt]sx?$/];
}
export class NodeTestAdapter extends AstTestAdapter {
  readonly id = "node:test";
  readonly markers = [];
  readonly patterns = [/(^|[/\\])test[-_/].*\.[cm]?js$/, /\.(test|spec)\.[cm]?js$/];
  async detect(context: TestDetectionContext) {
    const detected = context.files.some(file => this.patterns.some(pattern => pattern.test(file))) &&
      context.files.some(file => /\.(mjs|cjs|js)$/.test(file));
    return { detected, confidence: detected ? "HIGH" as const : "LOW" as const };
  }
}
export class PlaywrightAdapter extends AstTestAdapter {
  readonly id = "playwright";
  readonly markers = ["@playwright/test", "playwright"];
  readonly patterns = [/\.(spec|test)\.[cm]?tsx?$/];
}
