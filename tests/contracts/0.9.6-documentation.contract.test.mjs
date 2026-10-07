import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

const root = join(process.cwd(), "docs");

test("public documentation set is complete", async () => {
  const docs = ["README.md", "GETTING-STARTED.md", "GETTING-STARTED.vi.md", "CLI-REFERENCE.md"];
  for (const name of docs) {
    const text = await readFile(join(root, name), "utf8");
    assert.ok(text.length > 200, name);
  }
});

test("public documentation does not expose development-only documentation", async () => {
  const docs = ["README.md", "GETTING-STARTED.md", "GETTING-STARTED.vi.md", "CLI-REFERENCE.md"];
  const forbidden = ["AGENT-TASK-PROTOCOL", "MCP-AGENT-ARCHITECTURE", "TARGET-ARCHITECTURE", "ROADMAP-", "AUDIT-", "QUALITY-GATES", "0.9.6"];
  for (const name of docs) {
    const text = await readFile(join(root, name), "utf8");
    for (const value of forbidden) assert.equal(text.includes(value), false, name + ": " + value);
  }
});

test("README documents the supported public API", async () => {
  const text = await readFile(join(process.cwd(), "README.md"), "utf8");
  assert.equal(text.includes("git-commit-test-graph/api"), true);
});
