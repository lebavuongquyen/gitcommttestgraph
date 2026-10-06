import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { ConfigurationService, JsonConfigurationStore, DEFAULT_CONFIGURATION, explainConfiguration } from "../../dist/index.js";

test("configuration explanation records effective source for each value", async () => {
  const root = await mkdtemp(join(tmpdir(), "gctg-config-explanation-"));
  const service = new ConfigurationService(new JsonConfigurationStore());
  await service.update(root, {
    ...DEFAULT_CONFIGURATION,
    historyRetention: { ...DEFAULT_CONFIGURATION.historyRetention, deletedBranchGracePeriodDays: 120 }
  });

  const resolved = await service.resolve(root, {
    historyRetention: { deletedBranchGracePeriodDays: 30 },
    performance: { maxWorkers: 8 }
  });
  const explanation = explainConfiguration(resolved);

  assert.deepEqual(explanation.precedence, ["DEFAULT", "REPOSITORY", "RUNTIME"]);
  assert.equal(explanation.values.find(value => value.path === "historyRetention.deletedBranchGracePeriodDays")?.source, "RUNTIME");
  assert.equal(explanation.values.find(value => value.path === "historyRetention.deletedBranchGracePeriodDays")?.value, 30);
  assert.equal(explanation.values.find(value => value.path === "performance.maxWorkers")?.source, "RUNTIME");
  assert.equal(explanation.values.find(value => value.path === "performance.maxWorkers")?.value, 8);
  assert.equal(explanation.values.find(value => value.path === "cleanup.mode")?.source, "REPOSITORY");
});

test("configuration explanation preserves source locations", async () => {
  const root = await mkdtemp(join(tmpdir(), "gctg-config-explanation-"));
  const resolved = await new ConfigurationService(new JsonConfigurationStore()).resolve(root);
  const explanation = explainConfiguration(resolved);

  const maxWorkers = explanation.values.find(value => value.path === "performance.maxWorkers");
  assert.equal(maxWorkers?.source, "DEFAULT");
  assert.equal(maxWorkers?.location, "built-in");
});
