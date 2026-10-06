import { execFile, spawn } from "node:child_process";
import { promisify } from "node:util";
import type { BranchRef, ChangedPath, Commit, CommitDiff } from "../../domain/git/model.js";
import type { GitRepositoryPort } from "../../application/ports/git.js";
import { GitOperationError, InvalidCommitError } from "../../domain/errors.js";
import { createChildEnvironment, sanitizeErrorMessage, validateGitPath, validateGitReference } from "../../domain/security/policy.js";

const execFileAsync = promisify(execFile);

export class CliGitRepository implements GitRepositoryPort {
  constructor(private readonly root: string) {}

  async getHead(): Promise<string> {
    return (await this.run(["rev-parse", "HEAD"])).trim();
  }

  async ensureCommit(commit: string, remoteUrl?: string): Promise<void> {
    validateGitReference(commit, "Git commit");
    if (remoteUrl && !/^https:\/\/github\.com\/[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+\.git$/.test(remoteUrl)) throw new Error("Git remote URL is not allowed.");
    try {
      await this.run(["cat-file", "-e", commit + "^{commit}"]);
      return;
    } catch {
      if (!remoteUrl) throw new InvalidCommitError("Git commit is not available locally: " + commit);
      await this.run(["fetch", "--no-tags", "--depth=1", remoteUrl, commit]);
      await this.run(["cat-file", "-e", commit + "^{commit}"]);
    }
  }

  async getCurrentBranch(): Promise<string> {
    return (await this.run(["branch", "--show-current"])).trim();
  }

  async listBranches(): Promise<readonly BranchRef[]> {
    const output = await this.run(["for-each-ref", "--format=%(refname:short)|%(objectname)|%(HEAD)|%(upstream:short)", "refs/heads", "refs/remotes"]);
    return output.split("\n").filter(Boolean).map(line => {
      const [name, commit, head, upstream] = line.split("|");
      const remote = name?.startsWith("origin/") ? "origin" : undefined;
      return { name: name ?? "", commit: commit ?? "", current: head === "*", ...(remote ? { remote } : {}), ...(upstream ? { remote: upstream.split("/")[0] } : {}) };
    });
  }

  async getMergeBase(base: string, head: string): Promise<string> {
    validateGitReference(base, "Base Git reference");
    validateGitReference(head, "Head Git reference");
    return (await this.run(["merge-base", base, head])).trim();
  }

  async getCommitsBetween(base: string, head: string): Promise<readonly string[]> {
    validateGitReference(base, "Base Git reference");
    validateGitReference(head, "Head Git reference");
    const output = await this.run(["rev-list", "--reverse", `${base}..${head}`]);
    return output.split("\n").map(x => x.trim()).filter(Boolean);
  }

  async listCommits(limit = 50): Promise<readonly Commit[]> {
    const output = await this.run(["log", `-${Math.max(1, Math.floor(limit))}`, "--format=%H%x00%P%x00%an%x00%cn%x00%cI%x00%s"]);
    return output.split("\n").filter(Boolean).map(line => {
      const [hash, parents, author, committer, timestamp, message] = line.split("\0");
      return { hash: hash ?? "", parents: parents ? parents.split(" ").filter(Boolean) : [], author: author ?? "", committer: committer ?? "", timestamp: timestamp ?? "", message: message ?? "" };
    });
  }

  async getCommit(hash: string): Promise<Commit> {
    validateGitReference(hash, "Git commit");
    const value = await this.run(["show", "-s", "--format=%H%x00%P%x00%an%x00%cn%x00%cI%x00%s", hash]);
    const [commitHash, parents, author, committer, timestamp, message] = value.split("\0");
    if (!commitHash || !timestamp) throw new InvalidCommitError(`Invalid Git commit: ${hash}`);
    return {
      hash: commitHash,
      parents: parents ? parents.split(" ").filter(Boolean) : [],
      author: author ?? "",
      committer: committer ?? "",
      timestamp,
      message: message ?? ""
    };
  }

  async getChangedPaths(hash: string): Promise<readonly ChangedPath[]> {
    validateGitReference(hash, "Git commit");
    const output = await this.run(["diff-tree", "--root", "--no-commit-id", "--name-status", "-r", "-M", "-C", hash]);
    return parseNameStatus(output);
  }

  async getDiff(fromCommit: string, toCommit: string): Promise<CommitDiff> {
    validateGitReference(fromCommit, "From Git commit");
    validateGitReference(toCommit, "To Git commit");
    const output = await this.run(["diff", "--name-status", "-M", "-C", fromCommit, toCommit]);
    return { fromCommit, toCommit, paths: parseNameStatus(output) };
  }

  async readFileAtCommit(commit: string, path: string): Promise<string> {
    validateGitReference(commit, "Git commit");
    validateGitPath(path);
    return this.run(["show", `${commit}:${path}`]);
  }

  async readFilesAtCommit(commit: string, paths: readonly string[]): Promise<ReadonlyMap<string, string>> {
    validateGitReference(commit, "Git commit");
    for (const path of paths) validateGitPath(path);
    const safe = paths.filter(path => !/[\r\n]/.test(path));
    const result = new Map<string, string>();
    for (const [path, content] of await this.readFilesBatch(commit, safe)) result.set(path, content);
    for (const path of paths) if (!result.has(path)) result.set(path, await this.readFileAtCommit(commit, path));
    return result;
  }

  async listFilesAtCommit(commit: string): Promise<readonly string[]> {
    validateGitReference(commit, "Git commit");
    const output = await this.run(["ls-tree", "-r", "--name-only", commit]);
    return output.split("\n").map(x => x.trim()).filter(Boolean);
  }

  private async readFilesBatch(commit: string, paths: readonly string[]): Promise<ReadonlyArray<readonly [string, string]>> {
    if (paths.length === 0) return [];
    return new Promise((resolve, reject) => {
      const child = spawn("git", ["cat-file", "--batch"], { cwd: this.root, env: createChildEnvironment() });
      const chunks: Buffer[] = [];
      const errors: Buffer[] = [];
      child.stdout.on("data", chunk => chunks.push(Buffer.from(chunk)));
      child.stderr.on("data", chunk => errors.push(Buffer.from(chunk)));
      child.on("error", error => reject(new GitOperationError("Git batch read failed: " + error.message, error)));
      child.on("close", code => {
        if (code !== 0) {
          reject(new GitOperationError("Git batch read failed: " + Buffer.concat(errors).toString("utf8").trim()));
          return;
        }
        try {
          const buffer = Buffer.concat(chunks);
          const values: Array<readonly [string, string]> = [];
          let offset = 0;
          for (const path of paths) {
            const headerEnd = buffer.indexOf(10, offset);
            if (headerEnd < 0) throw new Error("Invalid git cat-file batch header");
            const header = buffer.subarray(offset, headerEnd).toString("utf8");
            const parts = header.split(" ");
            if (parts.length < 3) throw new Error("Invalid git cat-file batch response");
            const type = parts[1];
            const size = Number(parts[2]);
            offset = headerEnd + 1;
            if (type === "missing" || !Number.isFinite(size)) throw new Error("Git object missing for " + path);
            const end = offset + size;
            if (end > buffer.length) throw new Error("Invalid git cat-file batch payload");
            values.push([path, buffer.subarray(offset, end).toString("utf8")]);
            offset = end + 1;
          }
          resolve(values);
        } catch (error) {
          reject(new GitOperationError("Git batch read parse failed", error));
        }
      });
      child.stdin.end(paths.map(path => commit + ":" + path + "\n").join(""));
    });
  }

  private async run(args: readonly string[]): Promise<string> {
    try {
      const env = createChildEnvironment();
      if (args[0] === "fetch" && args.some(arg => arg.includes("github.com")) && process.env.GITHUB_TOKEN) {
        env.GIT_CONFIG_COUNT = "1";
        env.GIT_CONFIG_KEY_0 = "http.https://github.com/.extraheader";
        env.GIT_CONFIG_VALUE_0 = "Authorization: Bearer " + process.env.GITHUB_TOKEN;
      }
      const { stdout } = await execFileAsync("git", args, { cwd: this.root, env, maxBuffer: 32 * 1024 * 1024 });
      return stdout;
    } catch (error) {
      const detail = sanitizeErrorMessage(error);
      throw new GitOperationError("Git operation failed: " + detail, error);
    }
  }
}

function parseNameStatus(output: string): ChangedPath[] {
  return output.split("\n").map(line => line.trim()).filter(Boolean).map(line => {
    const parts = line.split("\t");
    const status = parts[0] ?? "";
    if (status.startsWith("R") || status.startsWith("C")) {
      const oldPath = parts[1];
      const path = parts[2];
      if (!oldPath || !path) throw new Error(`Invalid Git name-status line: ${line}`);
      return { status: status.startsWith("R") ? "renamed" : "copied", oldPath, path };
    }
    const path = parts[1];
    if (!path) throw new Error(`Invalid Git name-status line: ${line}`);
    if (status === "A") return { status: "added", path };
    if (status === "D") return { status: "deleted", path };
    return { status: "modified", path };
  });
}
