import assert from "node:assert/strict";
import test from "node:test";
import { PUBLIC_API_VERSION, publicContractRegistry, validatePublicContract } from "../../dist/public/index.js";

test("0.9.0 public API exposes an explicit contract version", () => {
  assert.equal(PUBLIC_API_VERSION, "1.0.0");
  assert.equal(publicContractRegistry.apiVersion, "1.0.0");
});

test("0.9.0 public API exposes stable contract families", () => {
  for (const name of ["graphSnapshot", "changeIntelligence", "impact", "testImpact", "executionPlan", "evidence", "error"]) assert.ok(publicContractRegistry[name]);
});

test("0.9.0 graph snapshot contract accepts version 1", () => {
  const value = { schemaVersion: 1, analyzerVersion: "0.9.0", repository: "/repo", commit: "c", configurationFingerprint: "f", nodes: [], edges: [], metadata: {} };
  assert.deepEqual(validatePublicContract("graphSnapshot", value), value);
});

test("0.9.0 graph snapshot contract rejects incompatible versions", () => {
  assert.throws(() => validatePublicContract("graphSnapshot", { schemaVersion: 2, analyzerVersion: "x", repository: "r", commit: "c", configurationFingerprint: "f", nodes: [], edges: [], metadata: {} }));
});

test("0.9.0 change intelligence contract is deterministic and versioned", () => {
  const value = { schemaVersion: 1, intelligence: { schemaVersion: 1, source: { kind: "COMMIT" }, base: "a", head: "b", mergeBase: "a", changedPathCount: 0, changedPaths: [], commits: ["b"], diff: {}, changedSymbolIds: [], removedSymbolIds: [], impact: [], affectedSymbolIds: [], testGaps: {}, testImpact: {}, executionPlan: {}, risk: "UNKNOWN", reasons: [], uncertainty: [], evidence: [] }, deterministic: true };
  assert.deepEqual(validatePublicContract("changeIntelligence", value), value);
});

test("0.9.0 public contracts preserve additive compatibility", () => {
  const value = { schemaVersion: 1, analyzerVersion: "0.9.0", repository: "/repo", commit: "c", configurationFingerprint: "f", nodes: [], edges: [], metadata: {}, futureField: "allowed" };
  assert.equal(validatePublicContract("graphSnapshot", value).futureField, "allowed");
});

test("0.9.0 public error contract is stable", () => {
  const value = { error: { code: "INVALID_INPUT", message: "Invalid input" } };
  assert.deepEqual(validatePublicContract("error", value), value);
});
