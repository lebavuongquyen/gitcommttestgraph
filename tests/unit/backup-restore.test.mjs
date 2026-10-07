import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { BackupRestoreService } from "../../dist/application/recovery/backup-restore-service.js";

async function fixture() {
  const root = await mkdtemp(join(tmpdir(), "gctg-backup-"));
  await mkdir(join(root, ".gctg", "graph"), { recursive: true });
  await mkdir(join(root, ".gctg", "results"), { recursive: true });
  await mkdir(join(root, ".gctg", "cache", "semantic"), { recursive: true });
  await writeFile(join(root, ".gctg", "config.json"), JSON.stringify({ schemaVersion: 1 }));
  await writeFile(join(root, ".gctg", "operations.json"), "[]");
  await writeFile(join(root, ".gctg", "graph", "manifest.json"), "[]");
  await writeFile(join(root, ".gctg", "results", "one.json"), JSON.stringify({ ok: true }));
  await writeFile(join(root, ".gctg", "cache", "semantic", "ab.json"), JSON.stringify({ nodes: [], edges: [] }));
  await writeFile(join(root, ".gctg", "index.lock"), "must-not-backup");
  await writeFile(join(root, ".gctg", "graph", "stale.tmp"), "must-not-backup");
  return root;
}

test("RCV02 creates a checksum-protected portable backup with explicit policy", async () => {
  const root = await fixture();
  const backup = join(root, "backup.json");
  const service = new BackupRestoreService();
  const manifest = await service.create(root, backup);
  assert.equal(manifest.format, "gctg-backup");
  assert.equal(manifest.schemaVersion, 1);
  assert.ok(manifest.entries.some(entry => entry.path === "config.json"));
  assert.ok(manifest.entries.some(entry => entry.path === "graph/manifest.json"));
  assert.ok(manifest.entries.some(entry => entry.path === "cache/semantic/ab.json"));
  assert.ok(!manifest.entries.some(entry => entry.path.includes("index.lock")));
  assert.ok(!manifest.entries.some(entry => entry.path.endsWith(".tmp")));
  assert.deepEqual(await service.inspect(backup), manifest);
});

test("RCV02 restore validates checksums before replacing GCTG state", async () => {
  const root = await fixture();
  const backup = join(root, "backup.json");
  const service = new BackupRestoreService();
  await service.create(root, backup);
  await writeFile(join(root, ".gctg", "config.json"), JSON.stringify({ schemaVersion: 999 }));
  await service.restore(root, backup);
  assert.deepEqual(JSON.parse(await readFile(join(root, ".gctg", "config.json"), "utf8")), { schemaVersion: 1 });
});

test("RCV02 rejects tampered backup without changing current state", async () => {
  const root = await fixture();
  const backup = join(root, "backup.json");
  const service = new BackupRestoreService();
  await service.create(root, backup);
  const manifest = JSON.parse(await readFile(backup, "utf8"));
  manifest.entries[0].contentBase64 = Buffer.from("tampered").toString("base64");
  await writeFile(backup, JSON.stringify(manifest));
  const before = await readFile(join(root, ".gctg", "config.json"), "utf8");
  await assert.rejects(() => service.restore(root, backup), /checksum validation failed/);
  assert.equal(await readFile(join(root, ".gctg", "config.json"), "utf8"), before);
});
