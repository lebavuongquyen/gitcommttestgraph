import assert from "node:assert/strict";
import test from "node:test";
import { mkdtemp, writeFile, mkdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { CliGitRepository } from "../../dist/adapters/git/cli-git.js";

const exec = promisify(execFile);

test("branch refs and merge-base expose deterministic change ancestry", async () => {
  const root = await mkdtemp(join(tmpdir(), "gctg-"));
  try {
    await exec("git", ["init", "-b", "main"], { cwd: root });
    await exec("git", ["config", "user.email", "test@example.com"], { cwd: root });
    await exec("git", ["config", "user.name", "GCTG Test"], { cwd: root });
    await writeFile(join(root, "sample.ts"), "export const value = 1;\n");
    await exec("git", ["add", "."], { cwd: root });
    await exec("git", ["commit", "-m", "one"], { cwd: root });
    const base = (await exec("git", ["rev-parse", "HEAD"], { cwd: root })).stdout.trim();
    await exec("git", ["switch", "-c", "feature/test"], { cwd: root });
    await writeFile(join(root, "sample.ts"), "export const value = 2;\n");
    await exec("git", ["commit", "-am", "two"], { cwd: root });
    const head = (await exec("git", ["rev-parse", "HEAD"], { cwd: root })).stdout.trim();
    const git = new CliGitRepository(root);
    assert.equal(await git.getCurrentBranch(), "feature/test");
    assert.equal(await git.getMergeBase("main", "HEAD"), base);
    assert.deepEqual(await git.getCommitsBetween("main", "HEAD"), [head]);
    const branches = await git.listBranches();
    assert.equal(branches.find(branch => branch.name === "feature/test")?.current, true);
    assert.equal(branches.find(branch => branch.name === "main")?.commit, base);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("commit changed paths are recursive for branch evidence", async () => {
  const root = await mkdtemp(join(tmpdir(), "gctg-"));
  try {
    await exec("git", ["init", "-b", "main"], { cwd: root });
    await exec("git", ["config", "user.email", "test@example.com"], { cwd: root });
    await exec("git", ["config", "user.name", "GCTG Test"], { cwd: root });
    await mkdir(join(root, "src", "nested"), { recursive: true });
    await writeFile(join(root, "src", "nested", "sample.ts"), "export const value = 1;\n");
    await exec("git", ["add", "."], { cwd: root });
    await exec("git", ["commit", "-m", "one"], { cwd: root });
    await writeFile(join(root, "src", "nested", "sample.ts"), "export const value = 2;\n");
    await exec("git", ["commit", "-am", "two"], { cwd: root });
    const commit = (await exec("git", ["rev-parse", "HEAD"], { cwd: root })).stdout.trim();
    const paths = await new CliGitRepository(root).getChangedPaths(commit);
    assert.deepEqual(paths, [{ status: "modified", path: "src/nested/sample.ts" }]);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("batch historical file reads preserve content and paths", async () => {
  const root = await mkdtemp(join(tmpdir(), "gctg-"));
  try {
    await exec("git", ["init"], { cwd: root });
    await exec("git", ["config", "user.email", "test@example.com"], { cwd: root });
    await exec("git", ["config", "user.name", "GCTG Test"], { cwd: root });
    await mkdir(join(root, "src"), { recursive: true });
    await writeFile(join(root, "src", "one.ts"), "export const one = 1;\n");
    await writeFile(join(root, "src", "two.ts"), "export const two = 2;\n");
    await exec("git", ["add", "."], { cwd: root });
    await exec("git", ["commit", "-m", "batch"], { cwd: root });
    const commit = (await exec("git", ["rev-parse", "HEAD"], { cwd: root })).stdout.trim();
    const files = await new CliGitRepository(root).readFilesAtCommit(commit, ["src/one.ts", "src/two.ts"]);
    assert.equal(files.get("src/one.ts"), "export const one = 1;\n");
    assert.equal(files.get("src/two.ts"), "export const two = 2;\n");
    assert.equal(files.size, 2);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("missing historical objects fail explicitly", async () => {
  const root = await mkdtemp(join(tmpdir(), "gctg-"));
  try {
    await exec("git", ["init"], { cwd: root });
    await exec("git", ["config", "user.email", "test@example.com"], { cwd: root });
    await exec("git", ["config", "user.name", "GCTG Test"], { cwd: root });
    await writeFile(join(root, "sample.ts"), "export const value = 1;\n");
    await exec("git", ["add", "."], { cwd: root });
    await exec("git", ["commit", "-m", "one"], { cwd: root });
    const git = new CliGitRepository(root);
    await assert.rejects(() => git.readFileAtCommit("HEAD", "missing.ts"), error => error?.code === "GIT_OPERATION_FAILED");
    await assert.rejects(() => git.ensureCommit("deadbeef"), error => error?.code === "INVALID_COMMIT");
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("detached HEAD reports no current branch without inventing one", async () => {
  const root = await mkdtemp(join(tmpdir(), "gctg-"));
  try {
    await exec("git", ["init", "-b", "main"], { cwd: root });
    await exec("git", ["config", "user.email", "test@example.com"], { cwd: root });
    await exec("git", ["config", "user.name", "GCTG Test"], { cwd: root });
    await writeFile(join(root, "sample.ts"), "export const value = 1;\n");
    await exec("git", ["add", "."], { cwd: root });
    await exec("git", ["commit", "-m", "one"], { cwd: root });
    const commit = (await exec("git", ["rev-parse", "HEAD"], { cwd: root })).stdout.trim();
    await exec("git", ["switch", "--detach", commit], { cwd: root });
    assert.equal(await new CliGitRepository(root).getCurrentBranch(), "");
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("historical file content is read from the selected commit", async () => {
  const root = await mkdtemp(join(tmpdir(), "gctg-"));
  try {
    await exec("git", ["init"], { cwd: root });
    await exec("git", ["config", "user.email", "test@example.com"], { cwd: root });
    await exec("git", ["config", "user.name", "GCTG Test"], { cwd: root });
    await writeFile(join(root, "sample.ts"), "export const value = 1;\n");
    await exec("git", ["add", "."], { cwd: root });
    await exec("git", ["commit", "-m", "one"], { cwd: root });
    const first = (await exec("git", ["rev-parse", "HEAD"], { cwd: root })).stdout.trim();
    await writeFile(join(root, "sample.ts"), "export const value = 2;\n");
    const git = new CliGitRepository(root);
    assert.equal(await git.readFileAtCommit(first, "sample.ts"), "export const value = 1;\n");
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
