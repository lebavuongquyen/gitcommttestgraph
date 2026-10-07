import { createHash } from "node:crypto";
import { mkdir, readFile, readdir, rename, rm, stat, writeFile } from "node:fs/promises";
import { dirname, join, relative, sep } from "node:path";
import { GCTG_VERSION } from "../../version.js";
import type { RecoveryBackupEntry, RecoveryBackupManifest, RecoveryBackupPolicy, RecoveryBackupService } from "../ports/recovery-backup.js";

const POLICY: RecoveryBackupPolicy = Object.freeze({
  includedFiles: ["config.json", "config-history.jsonl", "operations.json"],
  includedDirectories: ["graph", "results", "cache"],
  excludedArtifacts: ["index.lock", "manifest.lock", "*.tmp", "*.tmp-*", ".restore-*"]
});

const INCLUDED_FILES = new Set(POLICY.includedFiles);
const INCLUDED_DIRECTORIES = new Set(POLICY.includedDirectories);

export class BackupRestoreService implements RecoveryBackupService {
  async create(repositoryRoot: string, backupPath: string): Promise<RecoveryBackupManifest> {
    const entries = await collectEntries(repositoryRoot);
    const manifest: RecoveryBackupManifest = {
      format: "gctg-backup",
      schemaVersion: 1,
      gctgVersion: GCTG_VERSION,
      createdAt: new Date().toISOString(),
      policy: POLICY,
      entries
    };
    await writeAtomic(backupPath, JSON.stringify(manifest, null, 2) + "\n");
    return manifest;
  }

  async inspect(backupPath: string): Promise<RecoveryBackupManifest> {
    const manifest = await readManifest(backupPath);
    validateManifest(manifest);
    await validateEntryChecksums(manifest);
    return manifest;
  }

  async restore(repositoryRoot: string, backupPath: string): Promise<RecoveryBackupManifest> {
    const manifest = await this.inspect(backupPath);
    const parent = dirname(repositoryRoot);
    const stage = join(parent, ".gctg-restore-" + process.pid + "-" + Date.now());
    const previous = join(parent, ".gctg-previous-" + process.pid + "-" + Date.now());
    await mkdir(stage, { recursive: true });
    try {
      for (const entry of manifest.entries) {
        const target = safeJoin(stage, entry.path);
        await mkdir(dirname(target), { recursive: true });
        await writeFile(target, Buffer.from(entry.contentBase64, "base64"));
      }
      await rename(repositoryRoot + "/.gctg", previous).catch(error => {
        if (!isMissing(error)) throw error;
      });
      try {
        await rename(stage, repositoryRoot + "/.gctg");
      } catch (error) {
        await rename(previous, repositoryRoot + "/.gctg").catch(() => {});
        throw error;
      }
      await rm(previous, { recursive: true, force: true });
      return manifest;
    } catch (error) {
      await rm(stage, { recursive: true, force: true });
      throw error;
    }
  }
}

async function collectEntries(repositoryRoot: string): Promise<RecoveryBackupEntry[]> {
  const root = join(repositoryRoot, ".gctg");
  const entries: RecoveryBackupEntry[] = [];
  try {
    await stat(root);
  } catch (error) {
    if (isMissing(error)) return entries;
    throw error;
  }
  for (const file of await walk(root)) {
    const rel = relative(root, file).split(sep).join("/");
    if (!isIncluded(rel)) continue;
    const content = await readFile(file);
    entries.push({ path: rel, sizeBytes: content.byteLength, sha256: sha256(content), contentBase64: content.toString("base64") });
  }
  return entries.sort((a, b) => a.path.localeCompare(b.path));
}

function isIncluded(path: string): boolean {
  const [head, ...rest] = path.split("/");
  if (INCLUDED_FILES.has(path)) return true;
  if (!head || !INCLUDED_DIRECTORIES.has(head)) return false;
  if (rest.length === 0) return false;
  return !rest.some(part => part === "index.lock" || part === "manifest.lock" || part.endsWith(".tmp") || part.includes(".tmp-") || part.startsWith(".restore-"));
}

async function walk(root: string): Promise<string[]> {
  const result: string[] = [];
  for (const entry of await readdir(root, { withFileTypes: true })) {
    const path = join(root, entry.name);
    if (entry.isDirectory()) result.push(...await walk(path));
    else result.push(path);
  }
  return result;
}

async function readManifest(path: string): Promise<RecoveryBackupManifest> {
  return JSON.parse(await readFile(path, "utf8")) as RecoveryBackupManifest;
}

function validateManifest(value: RecoveryBackupManifest): void {
  if (!value || value.format !== "gctg-backup" || value.schemaVersion !== 1 || typeof value.gctgVersion !== "string" || typeof value.createdAt !== "string" || !value.policy || !Array.isArray(value.entries)) {
    throw new Error("Incompatible GCTG backup format.");
  }
  if (!Array.isArray(value.policy.includedFiles) || !Array.isArray(value.policy.includedDirectories) || !Array.isArray(value.policy.excludedArtifacts)) {
    throw new Error("Invalid GCTG backup policy.");
  }
  for (const entry of value.entries) {
    if (!entry || typeof entry.path !== "string" || entry.path.startsWith("/") || entry.path.includes("..") || typeof entry.sizeBytes !== "number" || typeof entry.sha256 !== "string" || typeof entry.contentBase64 !== "string" || !isIncluded(entry.path)) {
      throw new Error("Backup contains an invalid or out-of-policy entry.");
    }
  }
}

async function validateEntryChecksums(manifest: RecoveryBackupManifest): Promise<void> {
  for (const entry of manifest.entries) {
    const content = Buffer.from(entry.contentBase64, "base64");
    if (content.byteLength !== entry.sizeBytes || sha256(content) !== entry.sha256) throw new Error("Backup checksum validation failed for " + entry.path);
  }
}

function safeJoin(root: string, path: string): string {
  const target = join(root, path);
  const normalizedRoot = root.endsWith(sep) ? root : root + sep;
  if (target !== root && !target.startsWith(normalizedRoot)) throw new Error("Unsafe backup path: " + path);
  return target;
}

async function writeAtomic(path: string, content: string): Promise<void> {
  await mkdir(dirname(path), { recursive: true });
  const temporary = path + "." + process.pid + "." + Date.now() + ".tmp";
  try {
    await writeFile(temporary, content, "utf8");
    await rename(temporary, path);
  } catch (error) {
    await rm(temporary, { force: true });
    throw error;
  }
}

function sha256(content: Buffer): string {
  return createHash("sha256").update(content).digest("hex");
}

function isMissing(error: unknown): boolean {
  return !!error && typeof error === "object" && "code" in error && error.code === "ENOENT";
}
