import test from "node:test";
import assert from "node:assert/strict";
import { ProgressService } from "../../dist/index.js";

test("progress records ordered stages for an operation", () => {
  const service = new ProgressService();
  service.start("op", "acquire-lock", null);
  service.update("op", "analyze", 1, 2);
  service.update("op", "analyze", 2, 2);
  const snapshot = service.snapshot("op");
  assert.deepEqual(snapshot.stages.map(stage => stage.name), ["acquire-lock", "analyze", "analyze"]);
  assert.equal(snapshot.stages.at(-1)?.completed, 2);
});
