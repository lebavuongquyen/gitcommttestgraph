#!/usr/bin/env node
import { startGctgMcpStdio } from "../dist/mcp/server.js";

const root = process.cwd();

try {
  startGctgMcpStdio(root);
  console.error("gctg MCP server running on stdio");
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
}
