import test from "node:test";
import assert from "node:assert/strict";
import { assertNoSensitiveConfiguration, classifyConfigurationKey, redactSensitiveConfiguration } from "../../dist/application/configuration/sensitive-configuration.js";

test("key classification is deterministic", () => {
  assert.equal(classifyConfigurationKey("token"), "SECRET");
  assert.equal(classifyConfigurationKey("apiKey"), "SECRET");
  assert.equal(classifyConfigurationKey("authorization"), "PRIVATE");
  assert.equal(classifyConfigurationKey("maxWorkers"), undefined);
});

test("redaction works recursively", () => {
  const rules = [
    { keyPattern: /^hidden$/i, kind: "SECRET" },
    { keyPattern: /^private$/i, kind: "PRIVATE" },
  ];
  const value = { hidden: "value", nested: { private: "value", maxWorkers: 4 }, list: [{ hidden: "value" }] };
  assert.deepEqual(redactSensitiveConfiguration(value, rules), {
    hidden: "[REDACTED]",
    nested: { private: "[REDACTED]", maxWorkers: 4 },
    list: [{ hidden: "[REDACTED]" }],
  });
});

test("ordinary configuration rejects classified material", () => {
  assert.throws(() => assertNoSensitiveConfiguration({ token: "value" }), /must not be stored/i);
  assert.doesNotThrow(() => assertNoSensitiveConfiguration({ maxWorkers: 4 }));
});
