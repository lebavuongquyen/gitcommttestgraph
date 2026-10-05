import { runProcess, type ProcessResult } from "../../infrastructure/process/command-runner.js";
import type { TestCommandContext, TestFrameworkAdapter } from "./test-registry.js";

export interface TestExecutionResult {
  readonly process: ProcessResult;
  readonly passed: boolean;
  readonly startedAt: string;
  readonly finishedAt: string;
}

export async function executeTest(adapter: TestFrameworkAdapter, context: TestCommandContext): Promise<TestExecutionResult> {
  const command = await adapter.resolveCommand(context);
  const startedAt = new Date().toISOString();
  const process = await runProcess(command);
  const finishedAt = new Date().toISOString();
  return { process, passed: process.exitCode === 0, startedAt, finishedAt };
}

export interface ParsedTestResult {
  readonly passed: boolean;
  readonly failedCount: number;
  readonly output: string;
}

export function parseGenericResult(process: ProcessResult): ParsedTestResult {
  return { passed: process.exitCode === 0, failedCount: process.exitCode === 0 ? 0 : 1, output: process.stdout + (process.stderr ? "\n" + process.stderr : "") };
}
