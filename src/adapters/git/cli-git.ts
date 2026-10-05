import { execFile } from "node:child_process";
import { promisify } from "node:util";
import type { BranchRef, ChangedPath, Commit, CommitDiff } from "../../domain/git/model.js";
import type { GitRepositoryPort } from "../../application/ports/git.js";
import { GitOperationError, InvalidCommitError } from "../../domain/errors.js";

const execFileAsync = promisify(execFile);

export class CliGitRepository implements GitRepositoryPort {
  constructor(private readonly root: string) {}

  async getHead(): Promise<string> {
    return (await this.run(["rev-parse", "HEAD"])).trim();
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
    return (await this.run(["merge-base", base, head])).trim();
  }

  async getCommitsBetween(base: string, head: string): Promise<readonly string[]> {
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
    const output = await this.run(["diff-tree", "--root", "--no-commit-id", "--name-status", "-M", "-C", hash]);
    return parseNameStatus(output);
  }

  async getDiff(fromCommit: string, toCommit: string): Promise<CommitDiff> {
    const output = await this.run(["diff", "--name-status", "-M", "-C", fromCommit, toCommit]);
    return { fromCommit, toCommit, paths: parseNameStatus(output) };
  }

  async readFileAtCommit(commit: string, path: string): Promise<string> {
    return this.run(["show", `${commit}:${path}`]);
  }

  async listFilesAtCommit(commit: string): Promise<readonly string[]> {
    const output = await this.run(["ls-tree", "-r", "--name-only", commit]);
    return output.split("\n").map(x => x.trim()).filter(Boolean);
  }

  private async run(args: readonly string[]): Promise<string> {
    try {
      const { stdout } = await execFileAsync("git", args, { cwd: this.root, maxBuffer: 32 * 1024 * 1024 });
      return stdout;
    } catch (error) {
      const detail = error instanceof Error ? error.message : String(error);
      throw new GitOperationError(`Git operation failed: git ${args.join(" ")}: ${detail}`, error);
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
