import assert from "node:assert/strict";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { runCli } from "./helpers.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");

test("CLI public contract: status returns machine-readable repository state", async () => {
  const result = await runCli(root, ["status"]);
  assert.equal(result.code, 0, result.stderr);
  const value = JSON.parse(result.stdout);
  assert.equal(typeof value.root, "string");
  assert.equal(typeof value.head, "string");
  assert.ok(Array.isArray(value.workspaceFiles));
});

test("CLI public contract: config exposes resolved configuration", async () => {
  const result = await runCli(root, ["config"]);
  assert.equal(result.code, 0, result.stderr);
  const value = JSON.parse(result.stdout);
  assert.equal(value.configuration.schemaVersion, 1);
  assert.ok(Array.isArray(value.sources));
});

test("CLI public contract: help flags return zero exit code", async () => {
  for (const flag of ["help", "--help", "-h"]) {
    const result = await runCli(root, [flag]);
    assert.equal(result.code, 0, flag + ": " + result.stderr);
    assert.match(result.stdout, /Usage: gctg/);
  }
});

test("CLI public contract: unknown command fails with non-zero exit code", async () => {
  const result = await runCli(root, ["__contract_unknown__"]);
  assert.equal(result.code, 2);
  assert.match(result.stdout, /Usage: gctg/);
});
