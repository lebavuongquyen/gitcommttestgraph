import assert from "node:assert/strict";
import test from "node:test";
import { spawn } from "node:child_process";

const root = new URL("../../", import.meta.url).pathname.replace(/^\//, "").replaceAll("/", "\\").replace(/^([A-Z]):/, "$1:");

test("RCV03 MCP recovery_repair tool is registered", async () => {
  const child = spawn(process.execPath, ["bin/gctg-mcp.mjs", root], { stdio: ["pipe", "pipe", "pipe"] });
  const request = JSON.stringify({ jsonrpc: "2.0", id: 1, method: "tools/list", params: {} }) + "\n";
  child.stdin.write(request);
  let output = "";
  let matched = false;
  child.stdout.on("data", chunk => {
    output += chunk.toString();
    if (/recovery_repair/.test(output)) matched = true;
  });
  for (let attempt = 0; attempt < 50 && !matched; attempt += 1) await new Promise(resolve => setTimeout(resolve, 100));
  child.kill();
  assert.match(output, /recovery_repair/);
});
