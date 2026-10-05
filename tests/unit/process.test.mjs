import test from "node:test";
import assert from "node:assert/strict";
import { runProcess } from "../../dist/infrastructure/process/command-runner.js";

test("process runner uses structured arguments", async () => {
  const result = await runProcess({ executable: process.execPath, args: ["-e", "process.stdout.write('ok')"], cwd: process.cwd() });
  assert.equal(result.exitCode, 0);
  assert.equal(result.stdout, "ok");
});
