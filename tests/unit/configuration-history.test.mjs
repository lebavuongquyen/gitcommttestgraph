import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { ConfigurationService, JsonConfigurationHistoryStore, JsonConfigurationStore, DEFAULT_CONFIGURATION } from "../../dist/index.js";

test("configuration history records updates with operation evidence", async () => {
  const root = await mkdtemp(join(tmpdir(), "gctg-config-history-"));
  const service = new ConfigurationService(
    new JsonConfigurationStore(),
    [],
    new JsonConfigurationHistoryStore()
  );

  await service.update(root, DEFAULT_CONFIGURATION);
  await service.update(root, {
    ...DEFAULT_CONFIGURATION,
    performance: { maxWorkers: 8 }
  });

  const history = await service.history(root);
  assert.equal(history.length, 2);
  assert.ok(history.every(entry => entry.operationId.length > 0));
  assert.ok(history.every(entry => Number.isNaN(Date.parse(entry.timestamp)) === false));
  assert.equal(history[1].configuration.performance.maxWorkers, 8);
});

test("configuration history is append-only across store instances", async () => {
  const root = await mkdtemp(join(tmpdir(), "gctg-config-history-"));
  const first = new ConfigurationService(new JsonConfigurationStore(), [], new JsonConfigurationHistoryStore());
  const second = new ConfigurationService(new JsonConfigurationStore(), [], new JsonConfigurationHistoryStore());

  await first.update(root, DEFAULT_CONFIGURATION);
  await second.update(root, { ...DEFAULT_CONFIGURATION, performance: { maxWorkers: 2 } });

  const history = await first.history(root);
  assert.equal(history.length, 2);
  assert.equal(history[0].configuration.performance.maxWorkers, 4);
  assert.equal(history[1].configuration.performance.maxWorkers, 2);
});
