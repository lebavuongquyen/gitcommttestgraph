import assert from "node:assert/strict";
import test from "node:test";
import { runCli, withHttpServer, mcpRequest } from "./helpers.mjs";
const root=new URL("../../",import.meta.url).pathname.replace(/^\//,"").replaceAll("/","\\");
test("0.9.2 CLI exposes monorepo intelligence",async()=>{const r=await runCli(root,["monorepo"]);assert.equal(r.code,0,r.stderr);const v=JSON.parse(r.stdout);assert.equal(v.schemaVersion,1);assert.ok(Array.isArray(v.packages));});
test("0.9.2 HTTP exposes monorepo intelligence",async()=>{await withHttpServer(root,37886,async base=>{const r=await fetch(base+"/api/monorepo");assert.equal(r.status,200);const v=await r.json();assert.equal(v.schemaVersion,1);assert.ok(Array.isArray(v.workspaces));});});
test("0.9.2 MCP exposes monorepo_intelligence",async()=>{const {responses}=await mcpRequest(root,[{method:"initialize",params:{protocolVersion:"2025-06-18",capabilities:{},clientInfo:{name:"0.9.2-contract",version:"1.0.0"}}},{method:"notifications/initialized",params:{}},{method:"tools/list",params:{}},{method:"tools/call",params:{name:"monorepo_intelligence",arguments:{}}}]);assert.ok(responses[2].result.tools.some(x=>x.name==="monorepo_intelligence"));assert.equal(responses[3].error,undefined);const v=JSON.parse(responses[3].result.content[0].text);assert.equal(v.schemaVersion,1);});
test("0.9.2 GUI exposes monorepo intelligence",async()=>{await withHttpServer(root,37887,async base=>{const r=await fetch(base+"/");const html=await r.text();assert.equal(r.status,200);assert.match(html,/monorepo/);assert.match(html,/api\/monorepo/);});});
