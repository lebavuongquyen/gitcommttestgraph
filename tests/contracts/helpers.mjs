import assert from "node:assert/strict";
import { spawn } from "node:child_process";

export function canonicalize(value) {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value).sort(([a], [b]) => a.localeCompare(b)).map(([key, item]) => [key, canonicalize(item)]));
  }
  return value;
}

export function assertContract(condition, message) {
  assert.ok(condition, message);
}

export function assertSchemaVersion(value, expected = "1.0.0") {
  assert.equal(value?.schemaVersion, expected, "public result must declare the expected schema version");
}

export function assertEquivalent(left, right, message = "public surfaces must produce equivalent semantic results") {
  assert.deepEqual(canonicalize(left), canonicalize(right), message);
}

function waitForClose(child) {
  if (child.exitCode !== null || child.signalCode !== null) return Promise.resolve();
  return new Promise(resolve => child.once("close", resolve));
}

export async function runCli(root, args) {
  const child = spawn(process.execPath, ["bin/gctg.mjs", ...args], { cwd: root, stdio: ["ignore", "pipe", "pipe"], windowsHide: true });
  let stdout = "";
  let stderr = "";
  child.stdout.setEncoding("utf8");
  child.stderr.setEncoding("utf8");
  child.stdout.on("data", chunk => { stdout += chunk; });
  child.stderr.on("data", chunk => { stderr += chunk; });
  await waitForClose(child);
  return { code: child.exitCode ?? 1, stdout, stderr };
}

export async function withHttpServer(root, port, callback) {
  const child = spawn(process.execPath, ["bin/gctg.mjs", "serve", String(port)], { cwd: root, stdio: ["ignore", "pipe", "pipe"], windowsHide: true });
  let stderr = "";
  child.stderr.setEncoding("utf8");
  child.stderr.on("data", chunk => { stderr += chunk; });
  try {
    let ready = false;
    for (let attempt = 0; attempt < 50; attempt += 1) {
      try {
        const response = await fetch("http://127.0.0.1:" + port + "/api/status");
        if (response.ok) { ready = true; break; }
      } catch {}
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    assert.ok(ready, "HTTP server must become ready for contract tests");
    return await callback("http://127.0.0.1:" + port, stderr);
  } finally {
    if (child.exitCode === null && child.signalCode === null) child.kill();
    await waitForClose(child);
  }
}

export async function mcpRequest(root, requests) {
  const child = spawn(process.execPath, ["bin/gctg-mcp.mjs"], { cwd: root, stdio: ["pipe", "pipe", "pipe"], windowsHide: true });
  let stderr = "";
  child.stderr.setEncoding("utf8");
  child.stderr.on("data", chunk => { stderr += chunk; });
  const pending = new Map();
  let buffer = "";
  let nextId = 1;
  child.stdout.setEncoding("utf8");
  child.stdout.on("data", chunk => {
    buffer += chunk;
    const parts = buffer.split(/\r?\n/);
    buffer = parts.pop() ?? "";
    for (const line of parts) {
      if (!line.trim()) continue;
      const message = JSON.parse(line);
      if (message.id !== undefined) {
        const resolve = pending.get(message.id);
        if (resolve) {
          pending.delete(message.id);
          resolve(message);
        }
      }
    }
  });
  const send = request => new Promise((resolve, reject) => {
    const id = nextId++;
    const timer = setTimeout(() => {
      if (pending.delete(id)) reject(new Error("MCP request timeout: " + request.method));
    }, 15000);
    pending.set(id, message => { clearTimeout(timer); resolve(message); });
    child.stdin.write(JSON.stringify({ jsonrpc: "2.0", id, ...request }) + "\n");
  });
  try {
    const responses = [];
    for (const request of requests) responses.push(await send(request));
    return { responses, stderr };
  } finally {
    if (child.exitCode === null && child.signalCode === null) child.kill();
    await waitForClose(child);
  }
}
