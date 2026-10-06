import test from "node:test";
import assert from "node:assert/strict";
import { DEFAULT_CONFIGURATION, planRetention } from "../../dist/index.js";

test("retention planner protects items without deletion proof", () => {
  const plan = planRetention(DEFAULT_CONFIGURATION, [
    { commit: "a", timestamp: "2020-01-01T00:00:00Z", sizeBytes: 10, protected: false, protectionReasons: [] },
    { commit: "b", timestamp: "2020-01-01T00:00:00Z", sizeBytes: 10, protected: false, protectionReasons: [], deletedAt: "2020-01-01T00:00:00Z" }
  ], "2026-10-07T00:00:00Z");

  assert.equal(plan.items[0].decision, "PROTECTED");
  assert.equal(plan.items[1].decision, "ELIGIBLE");
});

test("retention planner respects deleted-branch grace period", () => {
  const plan = planRetention(DEFAULT_CONFIGURATION, [
    { commit: "recent", timestamp: "2026-10-01T00:00:00Z", sizeBytes: 10, protected: false, protectionReasons: [], deletedAt: "2026-10-01T00:00:00Z" }
  ], "2026-10-07T00:00:00Z");

  assert.equal(plan.eligible.length, 0);
  assert.equal(plan.protected[0].decision, "PROTECTED");
});

test("retention planner preserves explicit protection evidence", () => {
  const plan = planRetention(DEFAULT_CONFIGURATION, [
    { commit: "protected", timestamp: "2020-01-01T00:00:00Z", sizeBytes: 10, protected: true, protectionReasons: ["tag evidence"], deletedAt: "2020-01-01T00:00:00Z" }
  ], "2026-10-07T00:00:00Z");

  assert.equal(plan.protected.length, 1);
  assert.match(plan.protected[0].reasons.join(" "), /tag evidence/);
});

test("retention planner is deterministic", () => {
  const input = [
    { commit: "z", timestamp: "2020-01-02T00:00:00Z", sizeBytes: 20, protected: false, protectionReasons: [], deletedAt: "2020-01-01T00:00:00Z" },
    { commit: "a", timestamp: "2020-01-01T00:00:00Z", sizeBytes: 10, protected: false, protectionReasons: [], deletedAt: "2020-01-01T00:00:00Z" }
  ];
  const one = planRetention(DEFAULT_CONFIGURATION, input, "2026-10-07T00:00:00Z");
  const two = planRetention(DEFAULT_CONFIGURATION, [...input].reverse(), "2026-10-07T00:00:00Z");
  assert.deepEqual(one.items, two.items);
});
