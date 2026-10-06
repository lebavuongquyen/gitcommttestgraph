import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { performance } from "node:perf_hooks";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { writeFile, mkdir } from "node:fs/promises";
import { CliGitRepository } from "../dist/adapters/git/cli-git.js";
import {
  RepositoryIndexer,
  TypeScriptProjectAnalyzer,
  JsonGraphStore,
  JsonSemanticCache,
  GraphQueryService
} from "../dist/index.js";

const exec = promisify(execFile);
const root = await mkdtemp(join(tmpdir(), "gctg-performance-"));
const results = [];
const analyzerVersion = "0.8.2-benchmark";

async function measureGitBatchRead() {
  const repo = join(root, "git-batch");
  await mkdir(join(repo, "src"), { recursive: true });
  for (let i = 0; i < 300; i++) await writeFile(join(repo, "src", "file" + i + ".ts"), "export const value = " + i + ";\n");
  await exec("git", ["init"], { cwd: repo });
  await exec("git", ["config", "user.email", "benchmark@example.com"], { cwd: repo });
  await exec("git", ["config", "user.name", "GCTG Benchmark"], { cwd: repo });
  await exec("git", ["add", "."], { cwd: repo });
  await exec("git", ["commit", "-m", "benchmark"], { cwd: repo });
  const commit = (await exec("git", ["rev-parse", "HEAD"], { cwd: repo })).stdout.trim();
  const paths = Array.from({ length: 300 }, (_, i) => "src/file" + i + ".ts");
  const git = new CliGitRepository(repo);

  const sequentialStart = performance.now();
  for (const path of paths) await git.readFileAtCommit(commit, path);
  const sequentialMs = performance.now() - sequentialStart;

  const batchStart = performance.now();
  const values = await git.readFilesAtCommit(commit, paths);
  const batchMs = performance.now() - batchStart;
  if (values.size !== paths.length) throw new Error("Batch read returned an incomplete result set");
  const result = {
    name: "git-batch-read",
    fileCount: paths.length,
    sequentialMs: Math.round(sequentialMs),
    batchMs: Math.round(batchMs),
    speedup: Number((sequentialMs / Math.max(batchMs, 0.1)).toFixed(2))
  };
  console.log(JSON.stringify(result));
  if (batchMs > sequentialMs * 0.5) throw new Error("Git batch read did not achieve the required 2x improvement");
  return result;
}

function sourceFiles(count) {
  return [
    "package.json",
    ...Array.from({ length: count }, (_, i) => "src/file" + i + ".ts")
  ];
}

function contents(files) {
  return new Map(files.map(path => [
    path,
    path === "package.json"
      ? JSON.stringify({ name: "benchmark", version: "1.0.0", scripts: { test: "node --test" } })
      : "export const value = " + JSON.stringify(path) + ";"
  ]));
}

function makeGit(files, values) {
  return {
    async getCommit(hash) {
      return { hash, parents: [], author: "benchmark", committer: "benchmark", timestamp: "2026-01-01T00:00:00Z", message: hash };
    },
    async listFilesAtCommit() { return files; },
    async readFileAtCommit(commit, path) { return values.get(path); }
  };
}

async function measureClass(name, fileCount, historyCount) {
  const files = sourceFiles(fileCount);
  const values = contents(files);
  const git = makeGit(files, values);
  const store = new JsonGraphStore(join(root, name, "graph"));
  const cache = new JsonSemanticCache(join(root, name, "cache"));
  const indexer = new RepositoryIndexer(git, new TypeScriptProjectAnalyzer(), store, cache);
  const query = new GraphQueryService(store);

  const coldStart = performance.now();
  await indexer.index({ repository: name, commit: "cold", configuration: {}, analyzerVersion });
  const coldMs = performance.now() - coldStart;

  const warmStart = performance.now();
  const warmResult = await indexer.index({ repository: name, commit: "warm", configuration: {}, analyzerVersion });
  const warmMs = performance.now() - warmStart;
  const fingerprint = warmResult.snapshot.configurationFingerprint;

  const repeatedStart = performance.now();
  for (let i = 0; i < 20; i++) await query.getSnapshot(name, "warm", analyzerVersion, fingerprint);
  const repeatedMs = performance.now() - repeatedStart;

  const historyStart = performance.now();
  for (let i = 0; i < historyCount; i++) {
    await indexer.index({ repository: name, commit: "history-" + i, configuration: {}, analyzerVersion });
  }
  const historyMs = performance.now() - historyStart;

  const memory = process.memoryUsage();
  const value = {
    name,
    fileCount,
    historyCount,
    coldMs: Math.round(coldMs),
    warmMs: Math.round(warmMs),
    repeatedQuery20Ms: Math.round(repeatedMs),
    historyMs: Math.round(historyMs),
    rssMb: Math.round(memory.rss / 1024 / 1024),
    heapUsedMb: Math.round(memory.heapUsed / 1024 / 1024)
  };
  results.push(value);
  console.log(JSON.stringify(value));
}

try {
  const gitBatch = await measureGitBatchRead();
  results.push(gitBatch);
  await measureClass("small", 30, 5);
  await measureClass("medium", 120, 10);
  await measureClass("large", 300, 20);

  const medium = results.find(item => item.name === "medium");
  const large = results.find(item => item.name === "large");
  if (!medium || !large) throw new Error("Missing benchmark result");
  if (medium.warmMs > medium.coldMs * 0.75) throw new Error("Warm index did not achieve the required reuse threshold");
  if (large.warmMs > large.coldMs * 0.75) throw new Error("Large repository warm index did not achieve the required reuse threshold");
  if (medium.repeatedQuery20Ms > 2000) throw new Error("Medium repeated graph query exceeded 2000ms");
  if (large.repeatedQuery20Ms > 5000) throw new Error("Large repeated graph query exceeded 5000ms");
  console.log(JSON.stringify({ gate: "0.8.2-performance", status: "PASS", results }));
} finally {
  await rm(root, { recursive: true, force: true });
}
