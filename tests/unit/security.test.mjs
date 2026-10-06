import test from "node:test";
import assert from "node:assert/strict";
import {
  assertSafeRepositoryPath,
  createChildEnvironment,
  sanitizeErrorMessage,
  validateGitHubApiBase,
  validateGitHubOwnerRepo,
  validateGitPath,
  validateGitReference
} from "../../dist/domain/security/policy.js";
import { runProcess } from "../../dist/infrastructure/process/command-runner.js";

test("security policy rejects option-like and control-character Git references", () => {
  assert.throws(() => validateGitReference("--upload-pack=evil"));
  assert.throws(() => validateGitReference("HEAD\n"));
  assert.equal(validateGitReference("HEAD~1"), "HEAD~1");
});

test("security policy rejects traversal and absolute Git paths", () => {
  assert.throws(() => validateGitPath("../secret.txt"));
  assert.throws(() => validateGitPath("/etc/passwd"));
  assert.throws(() => validateGitPath("C:\\secret.txt"));
  assert.equal(validateGitPath("src/index.ts"), "src/index.ts");
});

test("security policy validates GitHub repository identifiers and API endpoint", () => {
  assert.equal(validateGitHubOwnerRepo("octocat/Hello-World"), "octocat/Hello-World");
  assert.throws(() => validateGitHubOwnerRepo("octocat/Hello-World?token=secret"));
  assert.throws(() => validateGitHubOwnerRepo("octocat/%2Fsecret"));
  assert.equal(validateGitHubApiBase(undefined), "https://api.github.com");
  assert.throws(() => validateGitHubApiBase("https://evil.example"));
  assert.throws(() => validateGitHubApiBase("http://api.github.com"));
});

test("security policy redacts credentials and bearer tokens", () => {
  const message = sanitizeErrorMessage("https://user:password@example.test/x Authorization: Bearer super-secret");
  assert.doesNotMatch(message, /password/);
  assert.doesNotMatch(message, /super-secret/);
  assert.match(message, /REDACTED/);
});

test("child process environment strips sensitive variables by default", async () => {
  process.env.GITHUB_TOKEN = "secret-token";
  const environment = createChildEnvironment();
  assert.equal(environment.GITHUB_TOKEN, undefined);
  const result = await runProcess({
    executable: process.execPath,
    args: ["-e", "process.stdout.write(process.env.GITHUB_TOKEN || 'missing')"],
    cwd: process.cwd()
  });
  assert.equal(result.stdout, "missing");
  delete process.env.GITHUB_TOKEN;
});

test("child process can receive explicit non-secret environment overrides", async () => {
  const result = await runProcess({
    executable: process.execPath,
    args: ["-e", "process.stdout.write(process.env.GCTG_SECURITY_TEST || 'missing')"],
    cwd: process.cwd(),
    env: { GCTG_SECURITY_TEST: "ok" }
  });
  assert.equal(result.stdout, "ok");
});

test("repository path confinement rejects traversal", () => {
  const root = process.cwd();
  assert.equal(assertSafeRepositoryPath(root, ".gctg/config.json"), root + "\\.gctg\\config.json");
  assert.throws(() => assertSafeRepositoryPath(root, "..\\secret.txt"));
});
