import type { TestProject } from "../../domain/test/model.js";

export interface TestFrameworkAdapter {
  readonly id: string;
  detect(context: TestDetectionContext): Promise<TestDetectionResult>;
  discoverTests(context: TestProjectContext): Promise<readonly string[]>;
  extractCases(context: TestProjectContext, testFile: string): Promise<readonly { title: string; startLine: number; endLine: number }[]>;
  resolveCommand(context: TestCommandContext): Promise<{ executable: string; args: readonly string[]; cwd: string }>;
}

export interface TestDetectionContext {
  readonly root: string;
  readonly files: readonly string[];
  readonly packageScripts: Readonly<Record<string, string>>;
  readonly dependencies: Readonly<Record<string, string>>;
}

export interface TestDetectionResult {
  readonly detected: boolean;
  readonly confidence: "EXACT" | "HIGH" | "MEDIUM" | "LOW";
}

export interface TestProjectContext extends TestDetectionContext {
  readonly project: TestProject;
}

export interface TestCommandContext extends TestProjectContext {
  readonly request: "project" | "file" | "case";
  readonly target?: string;
}

export class TestRegistry {
  private readonly adapters = new Map<string, TestFrameworkAdapter>();

  register(adapter: TestFrameworkAdapter): void {
    this.adapters.set(adapter.id, adapter);
  }

  get(id: string): TestFrameworkAdapter | undefined {
    return this.adapters.get(id);
  }

  all(): readonly TestFrameworkAdapter[] {
    return [...this.adapters.values()];
  }
}
