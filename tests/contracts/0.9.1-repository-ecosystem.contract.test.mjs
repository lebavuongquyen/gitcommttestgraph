import assert from "node:assert/strict";
import test from "node:test";
import { analyzeRepositoryEcosystem } from "../../dist/application/repository/ecosystem-service.js";

const snapshot = (nodes) => ({ schemaVersion: 1, analyzerVersion: "0.9.1", repository: "/repo", commit: "abc", configurationFingerprint: "f", nodes, edges: [], metadata: {} });

test("0.9.1 detects supported package managers and test frameworks", () => {
  const result = analyzeRepositoryEcosystem(snapshot([
    { id: "p", type: "Package", attributes: { manager: "pnpm" } },
    { id: "t", type: "TestProject", attributes: { framework: "vitest", rootPath: "packages/a" } },
    { id: "f", type: "File", attributes: { path: "src/a.ts" } }
  ]));
  assert.equal(result.support, "SUPPORTED");
  assert.equal(result.packageManagers[0].support, "SUPPORTED");
  assert.equal(result.testFrameworks[0].support, "SUPPORTED");
  assert.equal(result.languages[0].name, "typescript");
});

test("0.9.1 reports unknown environments explicitly", () => {
  const result = analyzeRepositoryEcosystem(snapshot([
    { id: "p", type: "Package", attributes: { manager: "cargo" } },
    { id: "t", type: "TestProject", attributes: { framework: "unknown-runner", rootPath: "." } }
  ]));
  assert.equal(result.support, "UNKNOWN");
  assert.equal(result.unsupported.length, 2);
  assert.ok(result.unsupported.every(item => item.support === "UNKNOWN"));
});

test("0.9.1 does not convert unsupported environments into positive intelligence", () => {
  const result = analyzeRepositoryEcosystem(snapshot([
    { id: "p", type: "Package", attributes: { manager: "maven" } }
  ]));
  assert.notEqual(result.support, "SUPPORTED");
  assert.equal(result.unsupported[0].reason, "No verified adapter for this package manager.");
});

test("0.9.1 is deterministic", () => {
  const input = snapshot([
    { id: "p2", type: "Package", attributes: { manager: "npm" } },
    { id: "p1", type: "Package", attributes: { manager: "pnpm" } }
  ]);
  assert.deepEqual(analyzeRepositoryEcosystem(input), analyzeRepositoryEcosystem(input));
});

test("0.9.1 keeps an empty ecosystem non-positive", () => {
  const result = analyzeRepositoryEcosystem(snapshot([]));
  assert.equal(result.support, "UNKNOWN");
  assert.deepEqual(result.packageManagers, []);
});