import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { ConfigurationService, JsonConfigurationStore, DEFAULT_CONFIGURATION, migrateConfiguration } from "../../dist/index.js";

test("configuration migration keeps current schema unchanged", async () => {
  const result = migrateConfiguration(DEFAULT_CONFIGURATION, 1);
  assert.equal(result.migrated, false);
  assert.equal(result.fromVersion, 1);
  assert.equal(result.toVersion, 1);
  assert.deepEqual(result.value, DEFAULT_CONFIGURATION);
});

test("configuration migration rejects unsupported future schema", async () => {
  assert.throws(() => migrateConfiguration({ schemaVersion: 2 }, 1), /newer than the supported version/i);
});

test("configuration migration applies registered migration deterministically", async () => {
  const result = migrateConfiguration({ schemaVersion: 0, value: "legacy" }, 1, [{
    fromVersion: 0,
    toVersion: 1,
    migrate: value => ({ ...value, schemaVersion: 1 }),
  }]);
  assert.equal(result.migrated, true);
  assert.deepEqual(result.value, { schemaVersion: 1, value: "legacy" });
});

test("configuration service backs up before persisting a migrated repository configuration", async () => {
  const root = await mkdtemp(join(tmpdir(), "gctg-config-migration-"));
  const store = new JsonConfigurationStore();
  await store.save(root, { schemaVersion: 0, value: "legacy" });
  const service = new ConfigurationService(store, [{
    fromVersion: 0,
    toVersion: 1,
    migrate: value => ({ ...DEFAULT_CONFIGURATION, schemaVersion: 1 }),
  }]);
  const result = await service.resolve(root);
  assert.equal(result.migration.status, "MIGRATED");
  assert.equal(result.migration.backupCreated, true);
  assert.ok(result.migration.backupPath);
  assert.deepEqual(JSON.parse(await readFile(result.migration.backupPath, "utf8")), { schemaVersion: 0, value: "legacy" });
  assert.equal(JSON.parse(await readFile(join(root, ".gctg", "config.json"), "utf8")).schemaVersion, 1);
});

test("configuration service reports current schema without creating a backup", async () => {
  const root = await mkdtemp(join(tmpdir(), "gctg-config-current-"));
  const store = new JsonConfigurationStore();
  await store.save(root, DEFAULT_CONFIGURATION);
  const result = await new ConfigurationService(store).resolve(root);
  assert.equal(result.migration.status, "CURRENT");
  assert.equal(result.migration.backupCreated, false);
});

