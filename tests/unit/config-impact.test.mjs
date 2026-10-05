import test from "node:test";
import assert from "node:assert/strict";
import { ImpactEngine } from "../../dist/application/impact/impact-engine.js";

test("configuration impact travels from config to configured package", () => {
  const snapshot = {
    schemaVersion: 1,
    analyzerVersion: "x",
    repository: "r",
    commit: "c",
    configurationFingerprint: "f",
    nodes: [
      { id: "config", type: "Config", attributes: { path: "tsconfig.json" } },
      { id: "pkg", type: "Package", attributes: { name: "app" } }
    ],
    edges: [{
      id: "e",
      source: "config",
      target: "pkg",
      type: "CONFIGURES",
      confidence: "EXACT",
      evidence: [{ kind: "configures-package", filePath: "tsconfig.json" }],
      sourceCommit: "c"
    }],
    metadata: {}
  };
  const result = new ImpactEngine().analyze(snapshot, { changedNodeIds: ["config"] });
  assert.equal(result.some(item => item.nodeId === "pkg" && item.level === "CONFIG"), true);
});
