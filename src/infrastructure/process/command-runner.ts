import { spawn } from "node:child_process";

export interface ProcessRequest {
  readonly executable: string;
  readonly args: readonly string[];
  readonly cwd: string;
  readonly env?: Readonly<Record<string, string>>;
}

export interface ProcessResult {
  readonly executable: string;
  readonly args: readonly string[];
  readonly cwd: string;
  readonly exitCode: number;
  readonly stdout: string;
  readonly stderr: string;
}

export function runProcess(request: ProcessRequest): Promise<ProcessResult> {
  return new Promise((resolve, reject) => {
    const child = spawn(request.executable, [...request.args], {
      cwd: request.cwd,
      env: request.env ? { ...process.env, ...request.env } : process.env,
      shell: false
    });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", chunk => { stdout += chunk; });
    child.stderr.on("data", chunk => { stderr += chunk; });
    child.on("error", reject);
    child.on("close", exitCode => resolve({
      executable: request.executable,
      args: request.args,
      cwd: request.cwd,
      exitCode: exitCode ?? -1,
      stdout,
      stderr
    }));
  });
}
